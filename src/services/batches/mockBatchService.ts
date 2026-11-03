// src/services/batches/mockBatchService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, working implementation of IBatchService.ts — see that file's own
// header for the full architectural reasoning (built on real, existing
// scan/tracking infrastructure, not a parallel system).
//
// Same real, established persistence pattern as every other mock service
// in this app (storageGet/storageSet, services/mockStorage.ts) — a real
// browser-session store, not just in-memory state that vanishes on
// reload.
// ─────────────────────────────────────────────────────────────────────────────

import { currentRunForBarcode } from './rackRuns';
import { DEFAULT_BATCH_PURPOSE_ID } from './batchPurposes';
import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { resolveMaterialFromScan } from '@/utils/resolveMaterialFromScan';
import { mockAuditService } from '../auditlog/mockAuditService';
import { mockSpecimenDeficiencyService } from '../deficiencies/mockSpecimenDeficiencyService';
import { mockReagentLotService } from '../reagentLots/mockReagentLotService';
import { mockStainTypeService } from '../stains/mockStainTypeService';
import { mockScanStationService } from '../scanStations/mockScanStationService';
import { shouldAutoAppendControl } from './shouldAutoAppendControl';
import { batchHasControlForLot, createControlSlideCase } from './ensureControlSlideAppended';
import { mockHardwareContainerRegistryService } from '../hardwareContainers/mockHardwareContainerRegistryService';
import { generateDisposableBarcode } from './disposableBarcode';
import { mockStationScanEventService } from '../stationScans/mockStationScanEventService';
import type { NewStationScanEvent } from '../stationScans/IStationScanEventService';
import { acceptsItems, advanceBatch, advanceProblem, carrierItemEvents, carrierMovesHere, sealBatch, sealProblem } from './stationCarrierRules';
import { buildReferralManifestPayload } from '../referral/buildReferralManifestPayload';
import { mockReferralOutboundQueueService } from '../referral/mockReferralOutboundQueueService';
import { mockReferralTrackingService } from '../referral/mockReferralTrackingService';
import { caseRouter } from '../cases/CaseRouter';
import { updateCaseWithRetryOrThrow } from '../cases/caseWrite';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { BATCH_NOT_PERMITTED, BATCH_REASON_REQUIRED, BATCH_ERRORS as E } from './IBatchService';
import { reconciliationGate } from './batchListView';
import { batchDemoSeeds } from './batchDemoSeeds';
import { wallDisplayDemoBatches } from './wallDisplayDemoBatches';
import { withMissingSeedRecords } from '../mockSeedMerge';
export { BATCH_NOT_PERMITTED, BATCH_REASON_REQUIRED };
import { mockDpVendorService } from '../digitalPathology/mockDpVendorService';
import { mockAiScreeningResultService } from '../digitalPathology/mockAiScreeningResultService';
import { stainQcSystem } from '../stainQc/stainQcServiceInstance';
import { runQcAllowsDistribution } from '../stainQc/stainQcRules';
import { mockMolecularOrderOutboundQueueService } from '../molecularOrders/mockMolecularOrderOutboundQueueService';
import type {
  IBatchService, Batch, BatchItem, AddItemOutcome, BatchProcessingNode, CarrierScanResult,
} from './IBatchService';
import { withReasonCode } from '../reasons/benchReasons';
import { exhaustedOnScan } from '@/utils/blockExceptionStates';
import { slideFitsCarrier, slideSizeOnScan } from '@/utils/blockPieceRules';
import { mockEquipmentService } from '../equipment/mockEquipmentService';

/** Batch 739 (fluid decision 4): an active liquid-based cytology processor from the Equipment register, or null. */
async function processorFor(equipmentId: string): Promise<{ code: string; make?: string; model?: string } | null> {
  const r = await mockEquipmentService.getActive('lbc_processor');
  const eq = r.ok ? r.data.find(e => e.id === equipmentId) : undefined;
  return eq ? { code: eq.code, make: eq.make, model: eq.model } : null;
}

const STORAGE_KEY = 'batches';

// Batch 404: the demo batches (batchDemoSeeds.ts) are added to a browser's
// stored batches when missing, once per load, never replacing one.
let demoSeedsChecked = false;
function loadBatches(): Batch[] {
  const stored = storageGet<Batch[]>(STORAGE_KEY, []);
  if (demoSeedsChecked) return stored;
  demoSeedsChecked = true;
  const { records, added } = withMissingSeedRecords(stored, [...batchDemoSeeds(), ...wallDisplayDemoBatches()]); // Batch 747: S8 wall volume
  if (added > 0) storageSet(STORAGE_KEY, records);
  return records;
}
function saveBatches(batches: Batch[]): void {
  storageSet(STORAGE_KEY, batches);
}

let counter = 0;
function genId(prefix: string): ID {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

// Batch 726: the disposable barcode generator moved to disposableBarcode.ts (file-size rule).

function findBatch(batches: Batch[], id: ID): Batch | undefined {
  return batches.find(b => b.id === id);
}

/** Batch 726 (spec §7.1): writes station scan events; a refusal (no or unknown station) records nothing and never fails the batch call. */
async function recordStationEvents(events: NewStationScanEvent[]): Promise<void> {
  if (events.length === 0) return;
  await mockStationScanEventService.recordMany(events).catch(() => undefined);
}

// Real, additive — per 'Cytology Staining' (stainer rack batch),
// Part 3 of the Protocol-Driven Workflow Infrastructure story:
// "completion transitions slides to 'Ready for Screening'." Real,
// deliberate reuse of the existing StainOrderStatus value 'Ready for
// Review' rather than adding a near-duplicate 'Ready for Screening'
// string — same real vocabulary-drift concern BATCH_PROCESSING_NODES'
// own header already documents for 'Microtomy' vs 'Microtomy /
// Sectioning'. A cytology slide that's ready for the cytotechnologist
// to screen and a histology slide that's ready for the pathologist to
// review are the same real state (stained, coverslipped, ready for a
// human's first look) — one shared status, not two competing ones.
//
// Fire-and-forget, same real posture as dispatchReferralIfApplicable
// above — a real failure resolving/persisting this must never block
// the batch's own, already-successful completion.
/** Batch 763: a staining rack's run, for its QC checkpoint: the rack, its stainer when known, and its slides. */
const stainRunOf = (b: Batch, instrumentCode?: string) => ({ batchId: b.id, masterBarcode: b.masterBarcode, stainerIdOrCode: instrumentCode ?? null, slides: b.items.filter(i => i.materialType === 'slide').map(i => ({ slideId: i.displayId, caseAccession: i.caseAccession })) });

export async function transitionSlidesToReadyForScreeningIfApplicable(batch: Batch): Promise<void> {
  if (batch.processingNode !== 'Cytology Staining') return;
  try {
    // Real, deliberate per-case grouping — several items in the same
    // rack batch commonly belong to the same case (or even the same
    // specimen), and each needs its own real caseRouter.updateCase
    // call, not one call per item racing against itself.
    const byCase = new Map<string, Array<{ specimenLetter: string; displayId: string }>>();
    for (const item of batch.items) {
      const resolved = await resolveMaterialFromScan(item.displayId);
      if (!resolved) continue;
      const targets = byCase.get(resolved.caseData.id) ?? [];
      targets.push({ specimenLetter: resolved.specimenLetter as string, displayId: item.displayId });
      byCase.set(resolved.caseData.id, targets);
    }
    // PS-71 (Batch 458): each case's slides are marked on the newest copy of
    // the case and saved with its version (updateCaseWithRetryOrThrow); on a
    // conflict the change is re-applied to the newer case, so another
    // person's change to other slides is kept. Replaces the old retry that
    // re-saved the stale specimens array without a version. A final
    // conflict throws into the catch below (no audit claiming success).
    for (const [caseId, targets] of byCase) {
      await updateCaseWithRetryOrThrow(caseId, current => {
        let specimens = (current.specimens as any[]) ?? [];
        for (const t of targets) {
          specimens = specimens.map((sp: any) => {
            if (sp.label !== t.specimenLetter) return sp;
            const updateStain = (stain: any) => stain.displayId === t.displayId ? { ...stain, status: 'Ready for Review' } : stain;
            return {
              ...sp,
              blocks: (sp.blocks ?? []).map((b: any) => ({ ...b, stains: (b.stains ?? []).map(updateStain) })),
              decants: (sp.decants ?? []).map((d: any) => ({ ...d, stains: (d.stains ?? []).map(updateStain) })),
            };
          });
        }
        return { specimens } as any;
      }, caseRouter);
    }
    mockAuditService.logEvent({
      type: 'system', event: 'Cytology Staining Batch Complete — Slides Ready for Screening',
      detail: `Batch ${batch.masterBarcode}: ${batch.items.length} slide(s) transitioned to Ready for Review.`,
      user: 'System', caseId: null, confidence: null,
    }).catch(() => {});
  } catch (e) {
    console.error('[Batch] Failed to transition slides to Ready for Screening on Cytology Staining completion:', e);
  }
}

// Real, additive — per 'Cytology Imaging' (imager batch), closing the
// Story 10 gap: "mockAiScreeningResultService.order() had no real
// callers." This is that real caller. One order per distinct
// specimen (never per slide) — a real AI screening product screens a
// specimen's slide(s) as one unit, not once per individual slide in
// the imaging batch.
//
// Real, deliberate default-vendor resolution: no explicit "default
// vendor" flag exists anywhere in the DP Vendor Dictionary
// (services/digitalPathology/mockDpVendorService.ts) — resolves via
// getByModality('cervical_cytology'), which already returns only
// active vendors sorted by sortOrder, and takes the first. Today that
// resolves to Hologic Genius (sortOrder 5), the same real vendor
// Part 2b's own instrument trigger targets — not a hardcoded vendor
// ID, so this adapts automatically if the Dictionary's own
// configuration changes. Skips honestly (logs, never throws) if no
// active cervical_cytology vendor is configured at all.
async function triggerAiScreeningOrderIfApplicable(batch: Batch): Promise<void> {
  if (batch.processingNode !== 'Cytology Imaging') return;
  try {
    const vendorRes = await mockDpVendorService.getByModality('cervical_cytology');
    const vendorId = vendorRes.ok ? vendorRes.data[0]?.id : undefined;
    if (!vendorId) {
      mockAuditService.logEvent({
        type: 'system', event: 'Cytology Imaging Batch Complete — AI Screening Order Skipped',
        detail: `Batch ${batch.masterBarcode}: no active cervical_cytology AI vendor configured — no screening order placed.`,
        user: 'System', caseId: null, confidence: null,
      }).catch(() => {});
      return;
    }

    const ordered = new Set<string>(); // `${caseId}:${specimenId}` — real de-dup, one order per specimen
    for (const item of batch.items) {
      const resolved = await resolveMaterialFromScan(item.displayId);
      if (!resolved) continue;
      const specimen = ((resolved.caseData.specimens as any[]) ?? []).find((sp: any) => sp.label === resolved.specimenLetter);
      if (!specimen) continue;
      const key = `${resolved.caseData.id}:${specimen.id}`;
      if (ordered.has(key)) continue;
      ordered.add(key);
      await mockAiScreeningResultService.order({
        caseId: resolved.caseData.id,
        specimenId: specimen.id,
        vendorId,
        orderedAt: new Date().toISOString(),
      });
    }
    mockAuditService.logEvent({
      type: 'system', event: 'Cytology Imaging Batch Complete — AI Screening Ordered',
      detail: `Batch ${batch.masterBarcode}: AI screening ordered for ${ordered.size} specimen(s).`,
      user: 'System', caseId: null, confidence: null,
    }).catch(() => {});
  } catch (e) {
    console.error('[Batch] Failed to order AI screening on Cytology Imaging completion:', e);
  }
}

// Real, per direct follow-up on the RFP-APLIS-2026-GLOBAL Inter-
// Laboratory Specimen Referral gap: dispatches the real outbound
// manifest and creates the real tracking record the moment an
// 'External Referral' batch genuinely completes reconciliation —
// "Automated creation of outgoing referral manifests," per that
// gap's own wording, not a separate, manual trigger a tech has to
// remember to click. Fire-and-forget: a real referral-side failure
// must never block the batch's own, already-successful reconciliation
// completion, the same real posture the rack-release call above
// already takes.
function dispatchReferralIfApplicable(batch: Batch): void {
  if (batch.processingNode !== 'External Referral') return;
  if (!batch.referralDestinationFacilityId) return;
  try {
    const base = buildReferralManifestPayload(batch);
    const labId = batch.referralDestinationFacilityId;
    // Batch 731 (spec §10.5): every item in the referral is "sent out" (completing the batch already checked its own permission).
    void import('../itemEndStates/recordEndStateFromAction').then(({ recordEndStateFromAction }) => recordEndStateFromAction(batch.items.map(i => ({
      itemId: i.displayId, materialType: i.materialType === 'specimen' ? 'wet_tissue' as const : i.materialType,
      caseAccession: i.caseAccession, state: 'sent_out' as const, reason: `Referral batch ${batch.masterBarcode} completed${batch.referralTestRequested ? ` (${batch.referralTestRequested})` : ''}`,
      userId: batch.reconciliationStartedByUserId ?? batch.createdByUserId, userName: batch.reconciliationStartedByUserName ?? batch.createdByUserName, source: 'referral' as const,
    })))).catch(() => undefined);
    // The tracking record exists from the moment the batch is complete, so a result is never "tracking not found".
    mockReferralTrackingService.createOnDispatch(batch.id).catch(() => {});
    // Batch 467b: the send-out molecular orders this batch carries (its lab, its requested test, its specimens) go to
    // the reference lab with it (IN_RUN), and the manifest names them so the lab can echo each order id with its
    // result. A failure here never blocks the referral.
    void (async () => {
      let molecularOrders: { orderId: string; caseAccession: string; assayCode: string }[] = [];
      try {
        const { molecularOrderEngine } = await import('../molecularOrders/molecularOrderEngineLive');
        molecularOrders = await molecularOrderEngine.onReferralDispatched({ batchId: batch.id, labId, testRequested: batch.referralTestRequested, items: batch.items.map(i => ({ caseAccession: i.caseAccession, specimenLabel: i.specimenLabel })) });
      } catch (e) {
        console.error('[Batch] referral: molecular orders not marked sent:', e);
      }
      const payload = molecularOrders.length ? { ...base, molecularOrders } : base;
      mockReferralOutboundQueueService.enqueue({ batchId: batch.id, payload }).catch(() => {});
    })();
  } catch {
    // Real, honest no-op: buildReferralManifestPayload's own real
    // guard clauses (wrong node, missing destination) are already
    // checked above; this catch exists only for a genuinely
    // unexpected failure, which must never block the batch's own
    // completion.
  }
}

export const mockBatchService: IBatchService = {
  async getAll(): Promise<ServiceResult<Batch[]>> {
    return { ok: true, data: loadBatches() };
  },

  async getById(id: ID): Promise<ServiceResult<Batch>> {
    const batch = findBatch(loadBatches(), id);
    if (!batch) return { ok: false, error: E.notFound };
    return { ok: true, data: batch };
  },

  async getByMasterBarcode(barcode: string): Promise<ServiceResult<Batch>> {
    // Batch 761: a reusable rack has one run per use, all with its barcode; the open run is the one meant.
    const batch = currentRunForBarcode(loadBatches(), barcode);
    if (!batch) return { ok: false, error: E.notFound };
    return { ok: true, data: batch };
  },

  async create(draft): Promise<ServiceResult<Batch>> {
    const batches = loadBatches();

    let masterBarcode: string;
    if (draft.identifierMode === 'semi_permanent') {
      // Real FR-1.2 Mode B — the rack's OWN real, already-engraved
      // identifier becomes the batch's own masterBarcode directly
      // (never a second, PathScribe-invented code for the same real
      // hardware), and the real hardware gets atomically checked out
      // first — a real, honest failure here (already checked out to a
      // different active batch) must stop batch creation entirely,
      // not create an orphaned batch with no real, available rack
      // behind it.
      if (!draft.rackId?.trim()) return { ok: false, error: E.rackIdRequired };
      masterBarcode = draft.rackId.trim().toUpperCase();
    } else {
      masterBarcode = generateDisposableBarcode(draft.containerType, new Set(batches.map(b => b.masterBarcode.toUpperCase())));
    }

    const batch: Batch = {
      id: genId('batch'),
      masterBarcode,
      containerType: draft.containerType,
      identifierMode: draft.identifierMode,
      linkedRackId: draft.identifierMode === 'semi_permanent' ? draft.rackId?.trim().toUpperCase() : undefined,
      processingNode: draft.processingNode,
      solutionType: draft.processingNode === 'Decal / Special Processing' ? draft.solutionType : undefined,
      targetDurationMinutes: draft.processingNode === 'Decal / Special Processing' ? draft.targetDurationMinutes : undefined,
      referralDestinationFacilityId: draft.processingNode === 'External Referral' ? draft.referralDestinationFacilityId : undefined,
      referralTestRequested: draft.processingNode === 'External Referral' ? draft.referralTestRequested : undefined,
      cytologyStainTypeId: draft.processingNode === 'Cytology Staining' ? draft.cytologyStainTypeId : undefined,
      stainingReagentLotIds: draft.processingNode === 'Staining' ? draft.stainingReagentLotIds : undefined,
      protocol: draft.protocol,
      priority: draft.priority,
      status: 'active',
      items: [],
      unexpectedScans: [],
      stationId: draft.stationId,
      purposeId: draft.purposeId || DEFAULT_BATCH_PURPOSE_ID,
      ...(draft.largeFormat && draft.processingNode === 'Staining' ? { largeFormat: true } : {}),
      ...(draft.processorEquipmentId && draft.processingNode === 'Cytology Processing' ? { processorEquipmentId: draft.processorEquipmentId } : {}),
      createdAt: new Date().toISOString(),
      createdByUserId: draft.createdByUserId,
      createdByUserName: draft.createdByUserName,
    };

    if (draft.identifierMode === 'semi_permanent' && draft.rackId) {
      const checkOutResult = await mockHardwareContainerRegistryService.checkOut(draft.rackId, batch.id);
      // Real, established workaround for a real TS narrowing quirk this
      // codebase already hit (and fixed the same way) in
      // BatchDetailView.tsx — see that file's own comment for the full
      // reasoning.
      if ('error' in checkOutResult) return { ok: false, error: checkOutResult.error };
      // Batch 737: a rack registered as large-format makes the staining carrier large-format.
      if (checkOutResult.data.supportsLargeFormat && batch.processingNode === 'Staining') batch.largeFormat = true;
    }

    // Real, per PS-289/PS-292's own "batch-manifest scanning with
    // automatic control-slide appending" piece — for every real
    // reagent lot selected for this new 'Staining' batch whose own
    // stain requires an auto-appended control (shouldAutoAppendControl.ts),
    // and isn't already represented in this same, brand-new batch
    // (trivially true at creation, but checked the same real way a
    // later addition would be, for forward compatibility), create and
    // append one real control item now. Never blocks batch creation
    // on a failure here — a reagent lot that fails to resolve, or a
    // stain type that no longer exists, is a real, separate data
    // problem the tech's own physical batch creation must not be
    // held hostage to.
    if (batch.processingNode === 'Staining' && batch.stainingReagentLotIds && batch.stainingReagentLotIds.length > 0) {
      for (const reagentLotId of batch.stainingReagentLotIds) {
        try {
          const lotRes = await mockReagentLotService.getById(reagentLotId);
          if (!lotRes.ok || !lotRes.data.stainTypeId) continue;
          const stainTypesRes = await mockStainTypeService.getAll();
          if (!stainTypesRes.ok) continue;
          const stainType = stainTypesRes.data.find(s => s.id === lotRes.data.stainTypeId);
          if (!stainType || !shouldAutoAppendControl(stainType)) continue;
          if (await batchHasControlForLot(batch, reagentLotId)) continue;

          let facilityId = 'unknown';
          if (draft.stationId) {
            const stationRes = await mockScanStationService.getById(draft.stationId);
            if (stationRes.ok) facilityId = stationRes.data.facilityId;
          }
          const { caseData, slideId } = await createControlSlideCase(lotRes.data, stainType, facilityId);
          batch.items.push({
            id: genId('batch-item'), materialType: 'slide', displayId: slideId,
            caseAccession: caseData.accession.fullAccession ?? caseData.id, // control cases always set it (id === fullAccession)
            specimenLabel: 'A', addedAt: new Date().toISOString(),
            addedByUserId: 'system', addedByUserName: 'System (auto-appended control)',
          });
        } catch {
          // Real, deliberate silent skip — see this block's own header.
        }
      }
    }

    batches.push(batch);
    saveBatches(batches);
    mockAuditService.logEvent({
      type: 'system', event: 'Batch Created',
      detail: `Batch ${batch.masterBarcode} created — ${batch.processingNode}, protocol "${batch.protocol}", ${batch.priority}.`,
      user: draft.createdByUserName, caseId: null, confidence: null,
    }).catch(() => {});
    // Real, per the Protocol-Driven Workflow Infrastructure story's
    // Part 2b instrument trigger — "at cytology batch creation,
    // enqueues 'order.instrument' for the Hologic processor." Fire-
    // and-forget, same real posture as every other outbound dispatch
    // in this app: a real queueing failure here must never block the
    // batch's own, already-successful creation.
    if (batch.processingNode === 'Cytology Processing') {
      // Batch 739 (fluid decision 4): the chosen processor from the Equipment register, not a fixed vendor.
      const processor = draft.processorEquipmentId ? await processorFor(draft.processorEquipmentId) : null;
      mockMolecularOrderOutboundQueueService.enqueue({
        eventType: 'order.instrument',
        payload: { masterBarcode: batch.masterBarcode, ...(processor ? { processorCode: processor.code, processorMake: processor.make, processorModel: processor.model } : {}) },
      }).catch(console.error);
    }
    return { ok: true, data: batch };
  },

  async addItemByScan(batchId: ID, scannedValue: string, byUserId: string, byUserName: string, fovCount?: number, stationId?: string): Promise<AddItemOutcome> {
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { outcome: 'not-found', reason: `No batch found with id "${batchId}".`, scanned: scannedValue };
    // Batch 726: a sealed or closed manifest takes nothing (spec §2 row 1).
    if (!acceptsItems(batch)) return { outcome: 'not-accepting', reason: `Batch ${batch.masterBarcode} is not taking items (${batch.sealedAt ? 'sealed' : batch.status}).`, sealed: !!batch.sealedAt, status: batch.status };

    const resolved = await resolveMaterialFromScan(scannedValue);
    if (!resolved) {
      return { outcome: 'not-found', reason: `"${scannedValue}" doesn't match any real cassette or slide on any case.`, scanned: scannedValue };
    }
    const { fullAccession, specimenLetter, displayId } = resolved;

    if (batch.items.some(i => i.displayId === displayId)) {
      return { outcome: 'already-in-batch', reason: `${displayId} is already in this batch.`, displayId };
    }
    // Batch 737 (spec §11.1): a large-format slide needs a staining carrier that takes large-format slides.
    if (!slideFitsCarrier(slideSizeOnScan(resolved.caseData, resolved.target, displayId), batch)) {
      return { outcome: 'slide-too-large', reason: `${displayId} is a large-format slide; batch ${batch.masterBarcode} does not take large-format slides.`, displayId };
    }

    // Real protocol-validation starting point, per the spec's own
    // "checks tissue type and run parameters upon each scan" — no real
    // tissue-type field exists anywhere in this app yet to validate
    // against (confirmed directly), so the real, meaningful check
    // available today is: the same physical cassette/slide can't
    // genuinely be in two different active processing runs at once.
    const otherActiveBatch = batches.find(b => b.id !== batchId && b.status === 'active' && b.items.some(i => i.displayId === displayId));
    if (otherActiveBatch) {
      mockAuditService.logEvent({
        type: 'system', event: 'Batch Item Scan Rejected — Already In Another Active Batch',
        detail: `${displayId} scan into batch ${batch.masterBarcode} rejected — already active in batch ${otherActiveBatch.masterBarcode} (${otherActiveBatch.protocol}).`,
        user: byUserName, caseId: fullAccession, confidence: null,
      }).catch(() => {});
      return {
        outcome: 'in-other-active-batch',
        reason: `${displayId} is already in active batch ${otherActiveBatch.masterBarcode} (${otherActiveBatch.protocol}).`,
        displayId,
        otherBatchId: otherActiveBatch.id,
        otherMasterBarcode: otherActiveBatch.masterBarcode,
      };
    }

    const item: BatchItem = {
      id: genId('item'),
      materialType: resolved.target.level,
      displayId,
      caseAccession: fullAccession,
      specimenLabel: specimenLetter,
      addedAt: new Date().toISOString(),
      addedByUserId: byUserId,
      addedByUserName: byUserName,
      // Real, additive — per BatchItem.fovCount's own doc comment:
      // only ever meaningful on a 'Cytology Imaging' batch. A caller
      // passing fovCount on any other node is silently ignored here
      // rather than stored as meaningless data.
      fovCount: batch.processingNode === 'Cytology Imaging' ? fovCount : undefined,
    };
    const updatedBatch: Batch = { ...batch, items: [...batch.items, item] };
    const updatedBatches = batches.map(b => b.id === batchId ? updatedBatch : b);
    saveBatches(updatedBatches);
    mockAuditService.logEvent({
      type: 'system', event: 'Batch Item Added',
      detail: `${displayId} added to batch ${batch.masterBarcode} (${batch.processingNode}).`,
      user: byUserName, caseId: fullAccession, confidence: null,
    }).catch(() => {});
    if (stationId) {
      await recordStationEvents([{ itemId: displayId, materialType: item.materialType, caseAccession: fullAccession, carrierId: batch.masterBarcode, batchId: batch.id, stationId, node: batch.processingNode, userId: byUserId, userName: byUserName, action: 'loaded', result: 'ok' }]);
    }
    // Batch 737 (spec §10.6): an exhausted block is still added (it is physically in the carrier), with a warning.
    if (exhaustedOnScan(resolved.caseData, resolved.target, specimenLetter)) {
      mockAuditService.logEvent({ type: 'system', event: 'Exhausted Block Scanned Into Batch', detail: `${displayId} is exhausted (no tissue remains) and was scanned into batch ${batch.masterBarcode} (${batch.processingNode}).`, user: byUserName, caseId: fullAccession, confidence: null }).catch(() => {});
      return { outcome: 'added', batch: updatedBatch, item, warning: 'blockExhausted' };
    }
    return { outcome: 'added', batch: updatedBatch, item };
  },

  async removeItem(batchId: ID, itemId: ID, _byUserId: string, byUserName: string): Promise<ServiceResult<Batch>> {
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { ok: false, error: E.notFound };
    if (batch.sealedAt) return { ok: false, error: E.batchSealed };
    const removedItem = batch.items.find(i => i.id === itemId);
    const updatedBatch: Batch = { ...batch, items: batch.items.filter(i => i.id !== itemId) };
    saveBatches(batches.map(b => b.id === batchId ? updatedBatch : b));
    if (removedItem) {
      mockAuditService.logEvent({
        type: 'system', event: 'Batch Item Removed',
        detail: `${removedItem.displayId} removed from batch ${batch.masterBarcode} (${batch.processingNode}) — batch splitting.`,
        user: byUserName, caseId: removedItem.caseAccession, confidence: null,
      }).catch(() => {});
    }
    return { ok: true, data: updatedBatch };
  },

  async moveItem(fromBatchId: ID, itemId: ID, toBatchId: ID, byUserId: string, byUserName: string): Promise<ServiceResult<{ fromBatch: Batch; toBatch: Batch }>> {
    if (fromBatchId === toBatchId) return { ok: false, error: E.sameBatch };
    const batches = loadBatches();
    const fromBatch = findBatch(batches, fromBatchId);
    if (!fromBatch) return { ok: false, error: E.notFound };
    const toBatch = findBatch(batches, toBatchId);
    if (!toBatch) return { ok: false, error: E.notFound };

    // Real, honest guard — see this method's own doc comment
    // (IBatchService.ts) for why both sides must be 'active'.
    if (fromBatch.status !== 'active') return { ok: false, error: E.sourceNotActive };
    if (toBatch.status !== 'active') return { ok: false, error: E.destinationNotActive };
    if (fromBatch.sealedAt || toBatch.sealedAt) return { ok: false, error: E.batchSealed };

    const item = fromBatch.items.find(i => i.id === itemId);
    if (!item) return { ok: false, error: E.itemNotFound };
    if (toBatch.items.some(i => i.displayId === item.displayId)) {
      return { ok: false, error: E.itemAlreadyInDestination };
    }

    const transfer = {
      fromBatchId, fromMasterBarcode: fromBatch.masterBarcode,
      toBatchId, toMasterBarcode: toBatch.masterBarcode,
      at: new Date().toISOString(), byUserId, byUserName,
    };
    const movedItem: BatchItem = {
      ...item,
      addedAt: transfer.at, addedByUserId: byUserId, addedByUserName: byUserName,
      reconciliationStatus: undefined, // real, honest reset — this item hasn't been reconciled in its new batch's own pass yet
      transferHistory: [...(item.transferHistory ?? []), transfer],
    };

    const updatedFromBatch: Batch = { ...fromBatch, items: fromBatch.items.filter(i => i.id !== itemId) };
    const updatedToBatch: Batch = { ...toBatch, items: [...toBatch.items, movedItem] };
    saveBatches(batches.map(b => {
      if (b.id === fromBatchId) return updatedFromBatch;
      if (b.id === toBatchId) return updatedToBatch;
      return b;
    }));
    mockAuditService.logEvent({
      type: 'system', event: 'Batch Item Moved',
      detail: `${item.displayId} moved from batch ${fromBatch.masterBarcode} to batch ${toBatch.masterBarcode}.`,
      user: byUserName, caseId: item.caseAccession, confidence: null,
    }).catch(() => {});
    return { ok: true, data: { fromBatch: updatedFromBatch, toBatch: updatedToBatch } };
  },

  async startReconciliation(batchId: ID, byUserId: string, byUserName: string): Promise<ServiceResult<Batch>> {
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { ok: false, error: E.notFound };
    if (batch.status !== 'active') return { ok: false, error: E.notActive };
    const updatedBatch: Batch = {
      ...batch,
      status: 'reconciling',
      reconciliationStartedAt: new Date().toISOString(),
      reconciliationStartedByUserId: byUserId,
      reconciliationStartedByUserName: byUserName,
      // Real, deliberate reset — every item starts this new
      // reconciliation pass genuinely unverified, even if a PRIOR
      // reconciliation attempt on this same batch had already marked
      // some items matched (e.g. a batch sent back into reconciliation
      // after an abort) — carrying stale matched flags forward would
      // let a real, un-rescanned item silently pass this time.
      items: batch.items.map(i => ({ ...i, reconciliationStatus: undefined })),
      unexpectedScans: [],
    };
    saveBatches(batches.map(b => b.id === batchId ? updatedBatch : b));
    mockAuditService.logEvent({
      type: 'system', event: 'Batch Reconciliation Started',
      detail: `Out-of-process verification started for batch ${batch.masterBarcode} (${batch.items.length} item(s) to verify).`,
      user: byUserName, caseId: null, confidence: null,
    }).catch(() => {});
    return { ok: true, data: updatedBatch };
  },

  async scanItemOut(batchId: ID, scannedValue: string, byUserId: string, byUserName: string, stationId?: string): Promise<ServiceResult<Batch>> {
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { ok: false, error: E.notFound };
    if (batch.status !== 'reconciling') return { ok: false, error: E.notReconciling };

    const resolved = await resolveMaterialFromScan(scannedValue);
    const displayId = resolved?.displayId ?? scannedValue.trim();
    const matchedItem = batch.items.find(i => i.displayId === displayId);

    let updatedBatch: Batch;
    if (matchedItem) {
      updatedBatch = {
        ...batch,
        items: batch.items.map(i => i.id === matchedItem.id ? { ...i, reconciliationStatus: 'matched' as const } : i),
      };
      saveBatches(batches.map(b => b.id === batchId ? updatedBatch : b));
      mockAuditService.logEvent({
        type: 'system', event: 'Batch Item Verified — Matched',
        detail: `${displayId} scanned out of batch ${batch.masterBarcode} and matched against manifest.`,
        user: byUserName, caseId: matchedItem.caseAccession, confidence: null,
      }).catch(() => {});
    } else {
      // Real "Unexpected/Extra" — a real, physical item scanned out of
      // the carrier that was never part of this batch's own manifest.
      updatedBatch = {
        ...batch,
        unexpectedScans: [...batch.unexpectedScans, { id: genId('unexpected'), scannedDisplayId: displayId, at: new Date().toISOString(), byUserId, byUserName }],
      };
      saveBatches(batches.map(b => b.id === batchId ? updatedBatch : b));
      mockAuditService.logEvent({
        type: 'system', event: 'Batch Item Verified — Unexpected/Extra',
        detail: `${displayId} scanned out of batch ${batch.masterBarcode} but is NOT on the batch's own manifest — flagged as unexpected/extra.`,
        user: byUserName, caseId: resolved?.fullAccession ?? null, confidence: null,
      }).catch(() => {});
    }
    // Batch 726 (spec §7.1): the scan, matched or unexpected, on the station log.
    if (stationId) {
      await recordStationEvents([{
        itemId: displayId, materialType: matchedItem?.materialType ?? resolved?.target.level ?? 'unknown', caseAccession: matchedItem?.caseAccession ?? resolved?.fullAccession,
        carrierId: batch.masterBarcode, batchId: batch.id, stationId, node: batch.processingNode, userId: byUserId, userName: byUserName,
        action: matchedItem ? 'matched' : 'unexpected', result: matchedItem ? 'ok' : (resolved ? 'wrong-item' : 'not-found'),
      }]);
    }
    return { ok: true, data: updatedBatch };
  },

  async completeReconciliation(batchId: ID): Promise<ServiceResult<Batch>> {
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { ok: false, error: E.notFound };
    if (batch.status !== 'reconciling') return { ok: false, error: E.notReconciling };

    // Real "Hard Stop Gatekeeper" — per the spec's own words: "cannot
    // be marked Complete... until missing or extra items are
    // reconciled." Enforced here, server-side, not just a disabled
    // button — a caller that somehow bypasses the UI still can't force
    // this through.
    // Batch 408: one rule (services/batches/batchListView.ts), shared with the
    // Complete button: every item scanned out, nothing unexpected, and (per
    // the RFP-APLIS-2026-GLOBAL cold-chain gap) no unacknowledged excursion.
    const gate = reconciliationGate(batch);
    if (gate.blocker) return { ok: false, error: gate.blocker };

    const updatedBatch: Batch = { ...batch, status: 'complete', completedAt: new Date().toISOString() };
    saveBatches(batches.map(b => b.id === batchId ? updatedBatch : b));
    dispatchReferralIfApplicable(updatedBatch);
    transitionSlidesToReadyForScreeningIfApplicable(updatedBatch).catch(() => {});
    triggerAiScreeningOrderIfApplicable(updatedBatch).catch(() => {});
    // Real FR-3.2 "disbanding logic" — auto-release on a real,
    // successful completion path, not just the explicit "Release Rack"
    // action. Fire-and-forget: a real hardware check-in failure must
    // never block the batch's own, already-successful completion.
    if (updatedBatch.identifierMode === 'semi_permanent' && updatedBatch.linkedRackId) {
      mockHardwareContainerRegistryService.checkIn(updatedBatch.linkedRackId).catch(() => {});
    }
    mockAuditService.logEvent({
      type: 'system', event: 'Batch Complete',
      detail: `Batch ${batch.masterBarcode} reconciled and marked complete — all ${batch.items.length} item(s) matched, no unexpected scans.`,
      user: 'System', caseId: null, confidence: null,
    }).catch(() => {});
    return { ok: true, data: updatedBatch };
  },

  async overrideAndComplete(batchId: ID, byUserId: string, byUserName: string, reason: string, stationId?: string, reasonCode?: string): Promise<ServiceResult<Batch>> {
    if (!reason.trim()) return { ok: false, error: BATCH_REASON_REQUIRED };
    if (!(await authorizationService.enforce('batch:reconciliation:override')).allowed) return { ok: false, error: BATCH_NOT_PERMITTED };
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { ok: false, error: E.notFound };
    if (batch.status !== 'reconciling') return { ok: false, error: E.notReconciling };

    const updatedBatch: Batch = {
      ...batch,
      status: 'complete',
      completedAt: new Date().toISOString(),
      override: { byUserId, byUserName, reason: reason.trim(), ...(reasonCode ? { reasonCode } : {}), at: new Date().toISOString() },
    };
    saveBatches(batches.map(b => b.id === batchId ? updatedBatch : b));
    dispatchReferralIfApplicable(updatedBatch);
    transitionSlidesToReadyForScreeningIfApplicable(updatedBatch).catch(() => {});
    triggerAiScreeningOrderIfApplicable(updatedBatch).catch(() => {});
    if (updatedBatch.identifierMode === 'semi_permanent' && updatedBatch.linkedRackId) {
      mockHardwareContainerRegistryService.checkIn(updatedBatch.linkedRackId).catch(() => {});
    }
    const missingCount = batch.items.filter(i => i.reconciliationStatus !== 'matched').length;
    mockAuditService.logEvent({
      type: 'system', event: 'Batch Reconciliation Overridden',
      detail: withReasonCode(`Batch ${batch.masterBarcode} force-completed by supervisor override — ${missingCount} missing item(s), ${batch.unexpectedScans.length} unexpected scan(s). Reason: ${reason.trim()}`, reasonCode),
      user: byUserName, caseId: null, confidence: null,
    }).catch(() => {});
    // Batch 726 (spec §7.1): each item still missing when the override closed the batch.
    if (stationId) {
      await recordStationEvents(carrierItemEvents({ ...batch, items: batch.items.filter(i => i.reconciliationStatus !== 'matched') }, { stationId, userId: byUserId, userName: byUserName, action: 'missing', note: 'Missing when the reconciliation was completed by override.' }).map(e => ({ ...e, inferredFromCarrier: false })));
    }
    return { ok: true, data: updatedBatch };
  },

  async setColdChainExcursion(batchId: ID, readingId: string, temperatureCelsius: number, detectedAt: string): Promise<ServiceResult<Batch>> {
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { ok: false, error: E.notFound };
    if (batch.coldChainExcursion && !batch.coldChainExcursion.acknowledgedAt) {
      return { ok: false, error: E.excursionAlreadyOpen };
    }
    const updatedBatch: Batch = { ...batch, coldChainExcursion: { detectedAt, readingId, temperatureCelsius } };
    saveBatches(batches.map(b => b.id === batchId ? updatedBatch : b));
    mockAuditService.logEvent({
      type: 'system', event: 'Cold-Chain Excursion Detected',
      detail: `Batch ${batch.masterBarcode}: real cold-chain excursion detected at ${temperatureCelsius}°C (reading ${readingId}). Batch completion blocked until acknowledged.`,
      user: 'System', caseId: null, confidence: null,
    }).catch(() => {});
    return { ok: true, data: updatedBatch };
  },

  async acknowledgeColdChainExcursion(batchId: ID, byUserId: string, byUserName: string, note: string, reasonCode?: string): Promise<ServiceResult<Batch>> {
    if (!note.trim()) return { ok: false, error: BATCH_REASON_REQUIRED };
    if (!(await authorizationService.enforce('batch:cold-chain-excursion:acknowledge')).allowed) return { ok: false, error: BATCH_NOT_PERMITTED };
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { ok: false, error: E.notFound };
    if (!batch.coldChainExcursion) return { ok: false, error: E.noExcursion };
    const updatedBatch: Batch = {
      ...batch,
      coldChainExcursion: {
        ...batch.coldChainExcursion,
        acknowledgedAt: new Date().toISOString(), acknowledgedByUserId: byUserId, acknowledgedByUserName: byUserName, acknowledgedNote: note.trim(), ...(reasonCode ? { acknowledgedReasonCode: reasonCode } : {}),
      },
    };
    saveBatches(batches.map(b => b.id === batchId ? updatedBatch : b));
    mockAuditService.logEvent({
      type: 'user', event: 'Cold-Chain Excursion Acknowledged',
      detail: withReasonCode(`Batch ${batch.masterBarcode}: cold-chain excursion acknowledged. Note: ${note.trim()}`, reasonCode),
      user: byUserName, caseId: null, confidence: null,
    }).catch(() => {});
    return { ok: true, data: updatedBatch };
  },

  // Real, additive — per 'Cytology Processing' (CytologyInstrumentStatus's
  // own doc comment, IBatchService.ts). Called by
  // processInboundCytologyInstrumentStatusEvent.ts the moment the
  // ThinPrep instrument reports a real status transition.
  async setCytologyInstrumentStatus(batchId: ID, status): Promise<ServiceResult<Batch>> {
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { ok: false, error: E.notFound };
    if (batch.processingNode !== 'Cytology Processing') {
      return { ok: false, error: E.notCytologyProcessing };
    }
    const updatedBatch: Batch = { ...batch, cytologyInstrumentStatus: status };
    saveBatches(batches.map(b => b.id === batchId ? updatedBatch : b));
    mockAuditService.logEvent({
      type: 'system', event: 'Cytology Instrument Status Update',
      detail: `Batch ${batch.masterBarcode} (Cytology Processing): instrument reports '${status}'.`,
      user: 'System', caseId: null, confidence: null,
    }).catch(() => {});
    return { ok: true, data: updatedBatch };
  },

  async setStainingInstrumentStatus(batchId: ID, status, instrumentCode?: string): Promise<ServiceResult<Batch>> {
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { ok: false, error: E.notFound };
    if (batch.processingNode !== 'Staining') {
      return { ok: false, error: E.notStaining };
    }
    const updatedBatch: Batch = { ...batch, stainingInstrumentStatus: status };
    saveBatches(batches.map(b => b.id === batchId ? updatedBatch : b));
    mockAuditService.logEvent({
      type: 'system', event: 'Staining Instrument Status Update',
      detail: `Batch ${batch.masterBarcode} (Staining): instrument reports '${status}'.`,
      user: 'System', caseId: null, confidence: null,
    }).catch(() => {});
    // Batch 763: a completed run's QC checkpoint opens (its stainer's QC mode decides who signs off).
    if (status === 'Run Completed') await stainQcSystem.openRun(stainRunOf(updatedBatch, instrumentCode)).catch(() => undefined);

    // Real, per the original Stain QC Module spec's own §2.4 — a
    // real, confirmed run failure auto-raises a real deficiency
    // against every real specimen this batch's own items belong to,
    // never left for a human to notice and raise by hand (unlike
    // def-missing-fixation-completion's own deliberately manual
    // posture) — a known instrument failure is a real, conclusive
    // signal already in hand the moment it's received.
    if (status === 'Run Failed') {
      const affectedAccessions = [...new Set((batch.items ?? []).map(i => i.caseAccession))];
      for (const accession of affectedAccessions) {
        const caseData = await caseRouter.getCase(accession);
        if (!caseData) continue;
        const specimenLabels = [...new Set((batch.items ?? []).filter(i => i.caseAccession === accession).map(i => i.specimenLabel).filter((l): l is string => !!l))];
        const targets = specimenLabels.length > 0 ? specimenLabels : [undefined];
        for (const specimenLabel of targets) {
          const specimen = specimenLabel ? (caseData.specimens ?? []).find(sp => sp.label === specimenLabel) : undefined;
          await mockSpecimenDeficiencyService.raise({
            caseId: caseData.id,
            specimenId: specimen?.id,
            specimenLabel,
            deficiencyTypeId: 'def-stain-batch-failed',
            comment: `Automated stainer reported 'Run Failed' for batch ${batch.masterBarcode}.`,
            raisedBy: 'system',
          }).catch(() => {});
        }
      }
    }

    return { ok: true, data: updatedBatch };
  },

  async confirmQcVisualRead(batchId: ID, userId: string, userName: string): Promise<ServiceResult<Batch>> {
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { ok: false, error: E.notFound };
    if (batch.processingNode !== 'Staining') {
      return { ok: false, error: E.notStaining };
    }
    const updatedBatch: Batch = { ...batch, qcVisualReadConfirmation: { userId, userName, confirmedAt: new Date().toISOString() } };
    saveBatches(batches.map(b => b.id === batchId ? updatedBatch : b));
    mockAuditService.logEvent({
      type: 'system', event: 'QC Visual Read Confirmed',
      detail: `Batch ${batch.masterBarcode} (Staining): visual read checklist confirmed by ${userName}.`,
      user: userId, caseId: null, confidence: null,
    }).catch(() => {});
    return { ok: true, data: updatedBatch };
  },

  async abort(batchId: ID, _byUserId: string, byUserName: string, reason: string, reasonCode?: string): Promise<ServiceResult<Batch>> {
    // Batch 404 (Pete): a reason is always required, and aborting needs its permission.
    if (!reason.trim()) return { ok: false, error: BATCH_REASON_REQUIRED };
    if (!(await authorizationService.enforce('batch:run:abort')).allowed) return { ok: false, error: BATCH_NOT_PERMITTED };
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { ok: false, error: E.notFound };
    const updatedBatch: Batch = { ...batch, status: 'aborted', abortedAt: new Date().toISOString(), abortReason: reason.trim(), ...(reasonCode ? { abortReasonCode: reasonCode } : {}) };
    saveBatches(batches.map(b => b.id === batchId ? updatedBatch : b));
    if (updatedBatch.identifierMode === 'semi_permanent' && updatedBatch.linkedRackId) {
      mockHardwareContainerRegistryService.checkIn(updatedBatch.linkedRackId).catch(() => {});
    }
    mockAuditService.logEvent({
      type: 'system', event: 'Batch Aborted',
      detail: withReasonCode(`Batch ${batch.masterBarcode} (${batch.processingNode}, ${batch.items.length} item(s)) aborted. Reason: ${reason.trim()}`, reasonCode),
      user: byUserName, caseId: null, confidence: null,
    }).catch(() => {});
    return { ok: true, data: updatedBatch };
  },

  async releaseRack(batchId: ID, _byUserId: string, byUserName: string): Promise<ServiceResult<Batch>> {
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { ok: false, error: E.notFound };
    if (batch.identifierMode !== 'semi_permanent' || !batch.linkedRackId) {
      return { ok: false, error: E.noRack };
    }
    const checkInResult = await mockHardwareContainerRegistryService.checkIn(batch.linkedRackId);
    if ('error' in checkInResult) return { ok: false, error: checkInResult.error };

    const updatedBatch: Batch = { ...batch, linkedRackId: undefined };
    saveBatches(batches.map(b => b.id === batchId ? updatedBatch : b));
    mockAuditService.logEvent({
      type: 'system', event: 'Batch Rack Released',
      detail: `Rack ${batch.linkedRackId} manually released from batch ${batch.masterBarcode} — still ${batch.status}, hardware now Available for re-use.`,
      user: byUserName, caseId: null, confidence: null,
    }).catch(() => {});
    return { ok: true, data: updatedBatch };
  },

  // Batch 726 (Lab Workflow & Batch spec, Decision 9, §10.2): the carrier keeps its batch as it moves from Decal to
  // Processing. This used to create a new Processing batch with a new barcode and empty the Decal one; now it is the
  // same move as advanceToNode (one batch, a step history, the manifest sealed). Both halves of the answer are the
  // same batch, so callers written for the old shape keep working.
  async transferToProcessing(batchId: ID, byUserId: string, byUserName: string): Promise<ServiceResult<{ fromBatch: Batch; toBatch: Batch }>> {
    const batch = findBatch(loadBatches(), batchId);
    if (!batch) return { ok: false, error: E.notFound };
    if (batch.processingNode !== 'Decal / Special Processing') return { ok: false, error: E.notDecal };
    // No station is passed: the move is made on Batch Management, and an event is never recorded against a station the
    // person is not at (spec §7.6).
    const moved = await mockBatchService.advanceToNode(batchId, 'Processing', byUserId, byUserName);
    if (moved.ok !== true) return moved;
    return { ok: true, data: { fromBatch: moved.data, toBatch: moved.data } };
  },

  // Batch 726: the carrier at the workstations (stationCarrierRules.ts has the rules).
  async sealManifest(batchId: ID, byUserId: string, byUserName: string): Promise<ServiceResult<Batch>> {
    if (!(await authorizationService.enforce('batch:manifest:seal')).allowed) return { ok: false, error: BATCH_NOT_PERMITTED };
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { ok: false, error: E.notFound };
    const problem = sealProblem(batch);
    if (problem) return { ok: false, error: problem };
    const updated = sealBatch(batch, { id: byUserId, name: byUserName }, new Date().toISOString());
    saveBatches(batches.map(b => b.id === batchId ? updated : b));
    mockAuditService.logEvent({ type: 'system', event: 'Batch Manifest Sealed', detail: `Batch ${batch.masterBarcode} manifest sealed with ${batch.items.length} item(s).`, user: byUserName, caseId: null, confidence: null }).catch(() => {});
    return { ok: true, data: updated };
  },

  async advanceToNode(batchId: ID, toNode: BatchProcessingNode, byUserId: string, byUserName: string, stationId?: string): Promise<ServiceResult<Batch>> {
    if (!(await authorizationService.enforce('batch:carrier:advance')).allowed) return { ok: false, error: BATCH_NOT_PERMITTED };
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { ok: false, error: E.notFound };
    const problem = advanceProblem(batch, toNode);
    if (problem) return { ok: false, error: problem };
    // Batch 763: a staining run goes on to distribution only once its QC is decided (the checkpoint opens here if the
    // stainer never reported Run Completed; an auto-accept stainer passes at once).
    if (batch.processingNode === 'Staining' && toNode === 'Checkout' && !runQcAllowsDistribution(await stainQcSystem.openRun(stainRunOf(batch)))) return { ok: false, error: E.stainQcPending };
    const updated = advanceBatch(batch, toNode, { id: byUserId, name: byUserName }, new Date().toISOString(), stationId);
    saveBatches(batches.map(b => b.id === batchId ? updated : b));
    mockAuditService.logEvent({ type: 'system', event: 'Batch Carrier Moved', detail: `Carrier ${batch.masterBarcode} moved from ${batch.processingNode} to ${toNode} with ${batch.items.length} item(s).`, user: byUserName, caseId: null, confidence: null }).catch(() => {});
    if (stationId) await recordStationEvents(carrierItemEvents(updated, { stationId, userId: byUserId, userName: byUserName, action: 'loaded' }));
    return { ok: true, data: updated };
  },

  async recordCarrierScan(batchId: ID, stationId: string, byUserId: string, byUserName: string, result: CarrierScanResult): Promise<ServiceResult<Batch>> {
    if (!stationId) return { ok: false, error: E.stationRequired };
    if (result === 'mismatch' && !(await authorizationService.enforce('station:scan-mismatch:continue')).allowed) return { ok: false, error: BATCH_NOT_PERMITTED };
    const batches = loadBatches();
    const batch = findBatch(batches, batchId);
    if (!batch) return { ok: false, error: E.notFound };
    // Batch 734 (Pete): an ad-hoc carrier follows the station it is opened at; the move is recorded, nothing is asked.
    const moved = carrierMovesHere(batch, stationId);
    const updated: Batch = moved
      ? { ...batch, stationId, stationMoves: [...(batch.stationMoves ?? []), { fromStationId: batch.stationId, toStationId: stationId, at: new Date().toISOString(), byUserId, byUserName }] }
      : batch.stationId ? batch : { ...batch, stationId };
    if (updated !== batch) saveBatches(batches.map(b => b.id === batchId ? updated : b));
    if (result === 'mismatch') {
      mockAuditService.logEvent({ type: 'system', event: 'Carrier Opened At Another Step', detail: `Carrier ${batch.masterBarcode} (${batch.processingNode}) opened at station ${stationId} after a mismatch warning.`, user: byUserName, caseId: null, confidence: null }).catch(() => {});
    }
    await recordStationEvents(carrierItemEvents(updated, { stationId, userId: byUserId, userName: byUserName, action: 'received', result, note: result === 'mismatch' ? 'Opened at a station for another step after a warning.' : moved ? `Ad-hoc carrier moved here from station ${batch.stationId}.` : undefined }));
    return { ok: true, data: updated };
  },
};
