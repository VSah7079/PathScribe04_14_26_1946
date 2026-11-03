// src/services/digitalPathology/wsiScanQueue.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 434 (Pete: a scan batch takes its slides from the scanning queue).
// The scanning queue is every slide the Slide Distribution Station routed to
// Digital ('In Scanning Queue', or 'Loaded on Scanner' once a rack and slot
// were recorded) that isn't in a scan batch yet. This file is the pure part:
// building the queue from cases, checking a load, and what happens to each
// slide's record when a batch is loaded or unloaded. The workflow (permission,
// saving, the interface engine) is wsiScanBatchWorkflow.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { WsiScanBatch, WsiScanSlide } from './IWsiScanBatchService';
import { slideScannedOk } from './IWsiScanBatchService';
import type { SlideDistributionEvent, StainOrder } from '@/types/case/Specimen';

export interface ScanQueueSlide {
  /** `${caseId}|${blockId}|${stainId}`: stable across reloads. */
  key: string;
  caseId: string;
  accession: string;
  priority?: string;
  specimenId: string;
  specimenLabel: string;
  blockId: string;
  blockLabel: string;
  stainId: string;
  stainName: string;
  /** What Slide Distribution recorded (a register code, or older free text). */
  scannerInstrumentId?: string;
  rackId?: string;
  slotPosition?: string;
  routedAt?: string;
}

interface CaseLike {
  id: string;
  accession?: { fullAccession?: string; accessionNumber?: string };
  order?: { priority?: string };
  specimens?: { id: string; label?: string; blocks?: { id: string; label?: string; stains?: StainOrder[] }[] }[];
}

const QUEUED: ReadonlySet<NonNullable<StainOrder['distributionStatus']>> = new Set(['In Scanning Queue', 'Loaded on Scanner']);

/** Slides routed to Digital and not in a scan batch, STAT first, then oldest first (pure). */
export function buildScanQueue(cases: readonly CaseLike[]): ScanQueueSlide[] {
  const out: ScanQueueSlide[] = [];
  for (const c of cases) {
    for (const sp of c.specimens ?? []) {
      for (const b of sp.blocks ?? []) {
        for (const st of b.stains ?? []) {
          if (st.distributionDestination !== 'digital' || !st.distributionStatus || !QUEUED.has(st.distributionStatus) || st.wsiScanBatchId) continue;
          const routed = [...(st.distributionEvents ?? [])].reverse().find(e => e.action === 'assigned' || e.action === 'loaded_on_scanner');
          out.push({
            key: `${c.id}|${b.id}|${st.id}`,
            caseId: c.id,
            accession: c.accession?.fullAccession || c.accession?.accessionNumber || c.id,
            priority: c.order?.priority,
            specimenId: sp.id,
            specimenLabel: sp.label ?? sp.id,
            blockId: b.id,
            blockLabel: `${sp.label ?? ''}${b.label ?? ''}` || b.id,
            stainId: st.id,
            stainName: st.stainName,
            scannerInstrumentId: st.scannerAssignment?.scannerInstrumentId,
            rackId: st.scannerAssignment?.rackId,
            slotPosition: st.scannerAssignment?.slotPosition,
            routedAt: routed?.timestamp,
          });
        }
      }
    }
  }
  const rank = (p?: string) => (p === 'STAT' ? 0 : p === 'Rush' ? 1 : 2);
  return out.sort((a, b) => rank(a.priority) - rank(b.priority) || (a.routedAt ?? '').localeCompare(b.routedAt ?? ''));
}

export type ScanLoadRefusal = 'NO_SCANNER' | 'NO_SLIDES' | 'NOT_IN_QUEUE';

/** The batch's slides, positioned in the order chosen (the rack/slot when recorded), or why it can't load (pure). */
export function planScanLoad(
  scannerCode: string | null | undefined,
  chosenKeys: readonly string[],
  queue: readonly ScanQueueSlide[],
): { ok: true; slides: WsiScanSlide[] } | { ok: false; error: ScanLoadRefusal } {
  if (!scannerCode) return { ok: false, error: 'NO_SCANNER' };
  if (chosenKeys.length === 0) return { ok: false, error: 'NO_SLIDES' };
  const byKey = new Map(queue.map(q => [q.key, q]));
  const chosen = chosenKeys.map(k => byKey.get(k));
  if (chosen.some(c => !c)) return { ok: false, error: 'NOT_IN_QUEUE' };
  return {
    ok: true,
    slides: (chosen as ScanQueueSlide[]).map((q, i) => ({
      slidePosition: q.rackId && q.slotPosition ? `${q.rackId}-${q.slotPosition}` : String(i + 1),
      caseId: q.caseId,
      specimenId: q.specimenId,
      blockId: q.blockId,
      stainId: q.stainId,
      slideLabel: `${q.blockLabel} ${q.stainName}`.trim(),
      scanStatus: 'pending',
    })),
  };
}

function event(action: SlideDistributionEvent['action'], techUserId: string, detail: string, at: string): SlideDistributionEvent {
  return { id: `sde-${Date.parse(at).toString(36)}-${Math.random().toString(36).slice(2, 6)}`, action, timestamp: at, techUserId, detail };
}

/** The slide's record once loaded in a batch (pure). */
export function stainLoaded(stain: StainOrder, batch: Pick<WsiScanBatch, 'id' | 'batchBarcode' | 'scannerInstrumentId'>, position: string, techUserId: string, at: string): StainOrder {
  return {
    ...stain,
    distributionStatus: 'Loaded on Scanner',
    wsiScanBatchId: batch.id,
    scannerAssignment: { ...(stain.scannerAssignment ?? {}), scannerInstrumentId: batch.scannerInstrumentId },
    distributionEvents: [...(stain.distributionEvents ?? []), event('loaded_on_scanner', techUserId, `loaded in scan batch ${batch.batchBarcode} on ${batch.scannerInstrumentId}, position ${position}`, at)],
  };
}

/** The slide's record once its batch is unloaded: 'Scanned' when it scanned
 *  and passed image QC, otherwise back in the scanning queue (pure). */
export function stainUnloaded(stain: StainOrder, batch: Pick<WsiScanBatch, 'batchBarcode'>, slide: WsiScanSlide, techUserId: string, at: string, imageQc: 'release' | 'pending' = 'release'): StainOrder {
  const ok = slideScannedOk(slide);
  // Batch 763: a scanned image whose scanner needs QC sign-off is kept from the pathologist until it passes.
  const held = ok && imageQc === 'pending';
  const why = slide.scanStatus === 'completed' ? `image QC failed${slide.failureReason ? `: ${slide.failureReason}` : ''}`
    : slide.scanStatus === 'failed' ? `scan failed${slide.failureReason ? `: ${slide.failureReason}` : ''}`
      : 'not scanned';
  return {
    ...stain,
    distributionStatus: ok ? 'Scanned' : 'In Scanning Queue',
    lastScanOutcome: held ? 'imageQcPending' : ok ? 'scanned' : slide.scanStatus === 'completed' ? 'imageQcFailed' : slide.scanStatus === 'failed' ? 'scanFailed' : 'notScanned',
    wsiScanBatchId: ok ? stain.wsiScanBatchId : undefined,
    distributionEvents: [...(stain.distributionEvents ?? []), event('unloaded_from_scanner', techUserId,
      held ? `unloaded from scan batch ${batch.batchBarcode}: scanned, waiting for image QC` : ok ? `unloaded from scan batch ${batch.batchBarcode}: scanned` : `unloaded from scan batch ${batch.batchBarcode}: ${why}; back in the scanning queue`, at)],
  };
}

/** Counts for a batch row (pure). */
export function scanBatchProgress(batch: Pick<WsiScanBatch, 'slides'>): { total: number; scanned: number; failed: number; pending: number } {
  const total = batch.slides.length;
  const scanned = batch.slides.filter(slideScannedOk).length;
  const failed = batch.slides.filter(s => s.scanStatus === 'failed' || (s.scanStatus === 'completed' && s.qcPassed === false)).length;
  return { total, scanned, failed, pending: total - scanned - failed };
}

/** What can be done with a batch now (pure). */
export function scanBatchActions(batch: Pick<WsiScanBatch, 'status' | 'slides'>): { canSend: boolean; canUnload: boolean } {
  const done = batch.slides.length > 0 && batch.slides.every(s => s.scanStatus === 'completed' || s.scanStatus === 'failed');
  return {
    canSend: batch.status === 'loaded',
    canUnload: batch.status === 'loaded' || ((batch.status === 'scanning' || batch.status === 'completed' || batch.status === 'failed') && done),
  };
}
