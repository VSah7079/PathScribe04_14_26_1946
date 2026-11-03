// src/services/digitalPathology/wsiScanBatchWorkflow.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 434: the WSI scan batch screen's actions (Batch Management → Slide
// scanning). Pete: the lab puts slides into a scanner and later unloads it;
// the interface engine carries the manifest out and the scan status back.
//
//   • Load (wsi:scan-batch:load): slides chosen from the scanning queue
//     (wsiScanQueue.ts) go into a new batch on a slide scanner from the
//     Equipment register. Each slide's record becomes 'Loaded on Scanner',
//     linked to the batch, with a chain-of-custody line.
//   • Send (wsi:scan-batch:send): the manifest goes to the interface engine
//     (dispatchInterfaceMessage, 'WSI_SCAN_MANIFEST'). Accepted: the batch is
//     'scanning'. Refused or unreachable: the batch stays 'loaded' with the
//     reason shown, and can be sent again.
//   • Unload (wsi:scan-batch:unload): once every slide has its outcome (or
//     before anything was sent), the batch is 'unloaded'. Slides that scanned
//     and passed image QC become 'Scanned'; the rest go back to the scanning
//     queue for another batch.
// Every permission is checked against the scanner's lab. One audit entry each.
// Scan status comes back through hl7/processInboundWsiScanStatusUpdateEvent.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { WsiScanBatch } from './IWsiScanBatchService';
import { buildScanQueue, planScanLoad, stainLoaded, stainUnloaded, type ScanLoadRefusal, type ScanQueueSlide } from './wsiScanQueue';
import type { Equipment } from '../equipment/IEquipmentService';
import type { Specimen, StainOrder } from '@/types/case/Specimen';
import { updateCaseWithRetry } from '../cases/caseWrite';

export type ScanBatchRefusal = ScanLoadRefusal | 'NOT_PERMITTED' | 'SCANNER_NOT_FOUND' | 'BATCH_NOT_FOUND' | 'NOT_LOADED' | 'STILL_SCANNING' | 'SAVE_FAILED';

async function deps() {
  const [{ wsiScanBatchService }, { equipmentService }, { caseRouter }, { authorizationService }, { getSessionUser }, { auditService }, { dispatchInterfaceMessage }, { buildWsiScanBatchManifestPayload }] = await Promise.all([
    import('./wsiScanBatchServiceInstance'),
    import('../equipment/equipmentServiceInstance'),
    import('../cases/CaseRouter'),
    import('../authorization/defaultAuthorizationService'),
    import('../auth/caseAccessControl'),
    import('../auditlog/auditServiceInstance'),
    import('../interfaceDispatch/dispatchInterfaceMessage'),
    import('../cytology/buildWsiScanBatchManifestPayload'),
  ]);
  return { batches: wsiScanBatchService, equipment: equipmentService, caseRouter, authorizationService, getSessionUser, audit: auditService, dispatchInterfaceMessage, buildWsiScanBatchManifestPayload };
}
type Deps = Awaited<ReturnType<typeof deps>>;

function who(d: Deps): { id: string; name: string } {
  const me = d.getSessionUser();
  return { id: me?.id ?? 'unknown', name: me ? ([me.firstName, me.lastName].filter(Boolean).join(' ') || me.id) : 'unknown' };
}

async function audit(d: Deps, event: string, detail: string, by: string) {
  await d.audit.logEvent({ type: 'user', event, detail, user: by, caseId: null, confidence: null }).catch(() => {});
}

/**
 * Applies a change to stains of one case and saves it. Returns the stains
 * changed by the save that landed (empty when nothing needed changing), or
 * null when the save failed.
 * PS-71 (Batch 458): the change is applied to the newest case and saved with
 * its version (updateCaseWithRetry); on a conflict it is re-applied to the
 * newer case, so another person's change to other slides is kept.
 */
async function updateStains(d: Deps, caseId: string, change: (stain: StainOrder, blockId: string) => StainOrder | null): Promise<StainOrder[] | null> {
  let changedStains: StainOrder[] = [];
  try {
    const r = await updateCaseWithRetry(caseId, current => {
      changedStains = [];
      const specimens = (current.specimens ?? []).map((sp: Specimen) => ({
        ...sp,
        blocks: (sp.blocks ?? []).map(b => ({
          ...b,
          stains: (b.stains ?? []).map(st => {
            const next = change(st, b.id);
            if (!next) return st;
            changedStains.push(next);
            return next;
          }),
        })),
      }));
      return changedStains.length ? { specimens } : null;
    }, { getCase: id => d.caseRouter.getCase(id).catch(() => undefined), updateCase: (id, u, v) => d.caseRouter.updateCase(id, u, v) });
    if (r.ok === true) return changedStains;
    return r.reason === 'noChange' ? [] : null;
  } catch { return null; }
}

/** The scanning queue for the cases this person can see. */
export async function loadScanQueue(): Promise<ScanQueueSlide[]> {
  const d = await deps();
  const res = await d.caseRouter.getAll(undefined, { includeOrchestration: true }).catch(() => undefined);
  return res && res.ok ? buildScanQueue(res.data as never) : [];
}

/** Active slide scanners from the Equipment register. */
export async function listSlideScanners(): Promise<Equipment[]> {
  const d = await deps();
  const res = await d.equipment.getActive('slide_scanner');
  return res.ok ? res.data : [];
}

/** Loads the chosen queue slides into a new batch on a scanner. */
export async function loadScanBatch(scannerCode: string, chosenKeys: readonly string[]): Promise<{ ok: true; data: WsiScanBatch } | { ok: false; error: ScanBatchRefusal }> {
  const d = await deps();
  const scanner = await d.equipment.getByCode(scannerCode);
  if (!scanner.ok || scanner.data.kind !== 'slide_scanner' || scanner.data.status !== 'Active') return { ok: false, error: 'SCANNER_NOT_FOUND' };
  if (!(await d.authorizationService.enforce('wsi:scan-batch:load', { facilityId: scanner.data.facilityId })).allowed) return { ok: false, error: 'NOT_PERMITTED' };
  const queue = await loadScanQueue();
  const plan = planScanLoad(scanner.data.code, chosenKeys, queue);
  if (plan.ok === false) return { ok: false, error: plan.error };
  const me = who(d);
  const created = await d.batches.create({ scannerInstrumentId: scanner.data.code, slides: plan.slides, facilityId: scanner.data.facilityId, loadedBy: me.id });
  if (!created.ok) return { ok: false, error: 'SAVE_FAILED' };
  const batch = created.data;
  const at = new Date().toISOString();
  for (const caseId of new Set(plan.slides.map(s => s.caseId))) {
    const slides = plan.slides.filter(s => s.caseId === caseId);
    await updateStains(d, caseId, (st, blockId) => {
      const slide = slides.find(s => s.stainId === st.id && s.blockId === blockId);
      return slide ? stainLoaded(st, batch, slide.slidePosition, me.id, at) : null;
    });
  }
  await audit(d, 'WSI scan batch loaded', `${batch.batchBarcode} on ${scanner.data.name} (${scanner.data.code}): ${plan.slides.length} slide(s) — ${plan.slides.map(s => `${s.caseId} ${s.slideLabel} @${s.slidePosition}`).join(', ')}`, me.name);
  return { ok: true, data: batch };
}

/** Sends a loaded batch's manifest to the scanner through the interface engine. */
export async function sendScanBatch(batchId: string): Promise<{ ok: true; data: WsiScanBatch } | { ok: false; error: ScanBatchRefusal | 'SEND_FAILED'; message?: string }> {
  const d = await deps();
  const found = await d.batches.getById(batchId);
  if (!found.ok) return { ok: false, error: 'BATCH_NOT_FOUND' };
  if (!(await d.authorizationService.enforce('wsi:scan-batch:send', { facilityId: found.data.facilityId ?? null })).allowed) return { ok: false, error: 'NOT_PERMITTED' };
  if (found.data.status !== 'loaded') return { ok: false, error: 'NOT_LOADED' };
  const me = who(d);
  const payload = d.buildWsiScanBatchManifestPayload(found.data);
  const sent = await d.dispatchInterfaceMessage(found.data.id, 'WSI_SCAN_MANIFEST', payload);
  if (!sent.ok) {
    await d.batches.recordSendFailure(found.data.id, { code: sent.errorCode ?? 'DISPATCH_REJECTED', message: sent.error ?? '' });
    await audit(d, 'WSI scan batch send failed', `${found.data.batchBarcode}: ${sent.errorCode ?? 'DISPATCH_REJECTED'} — ${sent.error ?? ''}`, me.name);
    return { ok: false, error: 'SEND_FAILED', message: sent.errorCode };
  }
  const marked = await d.batches.markDispatched(found.data.id, me.id);
  if (!marked.ok) return { ok: false, error: 'SAVE_FAILED' };
  await audit(d, 'WSI scan batch sent', `${found.data.batchBarcode}: manifest ${payload.messageId} accepted by the interface engine (${found.data.slides.length} slide(s))`, me.name);
  return { ok: true, data: marked.data };
}

/** Unloads a batch; slides not scanned successfully go back to the scanning queue. */
export async function unloadScanBatch(batchId: string): Promise<{ ok: true; data: WsiScanBatch; returnedToQueue: number } | { ok: false; error: ScanBatchRefusal }> {
  const d = await deps();
  const found = await d.batches.getById(batchId);
  if (!found.ok) return { ok: false, error: 'BATCH_NOT_FOUND' };
  if (!(await d.authorizationService.enforce('wsi:scan-batch:unload', { facilityId: found.data.facilityId ?? null })).allowed) return { ok: false, error: 'NOT_PERMITTED' };
  const me = who(d);
  const unloaded = await d.batches.markUnloaded(found.data.id, me.id);
  if (!unloaded.ok) return { ok: false, error: 'STILL_SCANNING' };
  const batch = unloaded.data;
  const at = new Date().toISOString();
  let returned = 0;
  // Batch 763: the scanner's image QC mode (services/stainQc/): images that wait for QC are held from the pathologist.
  const { stainQcSystem } = await import('../stainQc/stainQcServiceInstance');
  const { imageQcAtUnload } = await import('../stainQc/stainQcRules');
  const mode = await stainQcSystem.scannerMode(batch.scannerInstrumentId).catch(() => 'autoAccept' as const);
  const held: Parameters<typeof stainQcSystem.queueImages>[0] = [];
  for (const caseId of new Set(batch.slides.map(s => s.caseId))) {
    const slides = batch.slides.filter(s => s.caseId === caseId && s.stainId);
    const changed = await updateStains(d, caseId, (st, blockId) => {
      const slide = slides.find(s => s.stainId === st.id && s.blockId === blockId);
      if (!slide || st.wsiScanBatchId !== batch.id) return null;
      return stainUnloaded(st, batch, slide, me.id, at, imageQcAtUnload(mode, slide.qcPassed));
    });
    for (const st of changed ?? []) {
      const slide = slides.find(s => s.stainId === st.id);
      if (st.lastScanOutcome === 'imageQcPending' && slide?.blockId) {
        held.push({ stainId: st.id, caseId, blockId: slide.blockId, slideLabel: st.displayId ?? slide.slideLabel ?? st.id, caseAccession: st.displayId?.match(/^[A-Z]+\d{2}-\d+/i)?.[0] ?? caseId, scanBatchId: batch.id, scanBatchBarcode: batch.batchBarcode, scannerInstrumentId: batch.scannerInstrumentId, mode });
      }
    }
    // Counted from the save that landed (a retried save rebuilds the change).
    returned += (changed ?? []).filter(st => st.distributionStatus === 'In Scanning Queue').length;
  }
  await stainQcSystem.queueImages(held).catch(() => undefined);
  await audit(d, 'WSI scan batch unloaded', `${batch.batchBarcode}: ${batch.slides.length} slide(s) unloaded, ${returned} back in the scanning queue${held.length ? `, ${held.length} waiting for image QC` : ''}`, me.name);
  return { ok: true, data: batch, returnedToQueue: returned };
}
