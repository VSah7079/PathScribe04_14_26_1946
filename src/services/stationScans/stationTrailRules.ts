// src/services/stationScans/stationTrailRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 729 (Lab Workflow & Batch spec §7.4, §7.5, §10.1): what the station
// scan events say about a case and about work that has stopped. Pure.
//   • scanTrail: the Case History scan trail (who, where, when), newest first.
//   • staleItems: items whose last scan is older than a set time and whose work
//     has not ended (§7.5: "an item has not been scanned for longer than a set
//     time"). Work ends for a block when it is completed at the Microtome (it is
//     filed), for a slide when it is completed at Slide Distribution, Checkout or
//     External Referral (isFinishedScan). An item counts by its own scans only: a carrier-wide
//     event (inferredFromCarrier) shows on the trail but does not keep an item
//     "seen" (§10.3: per-item checks leave carrier-inferred events out).
//   • looseItemsByNode: items whose last scan put them at a step with no
//     carrier (§10.1: carrier-less work does not drop off the wall).
// ─────────────────────────────────────────────────────────────────────────────
import type { StationScanEvent } from './IStationScanEventService';
import type { BatchProcessingNode } from '../batches/IBatchService';

/** The trail for one case or item, newest first. */
export function scanTrail(events: readonly StationScanEvent[], filter: { itemId?: string; caseAccession?: string } = {}): StationScanEvent[] {
  const norm = (s?: string) => (s ?? '').trim().toUpperCase();
  return events
    .filter(e => (!filter.itemId || norm(e.itemId) === norm(filter.itemId)) && (!filter.caseAccession || norm(e.caseAccession) === norm(filter.caseAccession)))
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
}

/** Each item's last scan of its own (carrier-inferred events left out), carriers and unresolved scans excluded. */
export function lastOwnScanByItem(events: readonly StationScanEvent[]): Map<string, StationScanEvent> {
  const out = new Map<string, StationScanEvent>();
  for (const e of events) {
    if (e.inferredFromCarrier || e.materialType === 'carrier' || e.materialType === 'unknown' || e.result === 'not-found') continue;
    const prev = out.get(e.itemId);
    if (!prev || e.at > prev.at || (e.at === prev.at && e.id > prev.id)) out.set(e.itemId, e);
  }
  return out;
}

const BLOCK_TYPES = new Set(['block', 'matrix_block']);
const SLIDE_END_STAGES = new Set(['Slide Distribution', 'Checkout', 'External Referral', 'Slide Archival']);

/** Whether this scan ended the item's tracked work: a block completed at the Microtome, a slide completed at its last stop. */
export function isFinishedScan(e: Pick<StationScanEvent, 'action' | 'materialType' | 'node' | 'stationWorkflowStage'>): boolean {
  if (e.action !== 'completed') return false;
  if (BLOCK_TYPES.has(e.materialType)) return e.node === 'Microtomy / Sectioning' || e.stationWorkflowStage === 'Microtomy / Sectioning';
  return SLIDE_END_STAGES.has(e.stationWorkflowStage ?? '') || e.node === 'Checkout' || e.node === 'External Referral';
}

export interface StaleItem { itemId: string; caseAccession?: string; stationName: string; node?: BatchProcessingNode; lastAt: string; minutes: number }

/** Items not scanned for longer than `limitMinutes`, longest first. Finished items (isFinishedScan) are left out. */
export function staleItems(events: readonly StationScanEvent[], opts: { limitMinutes: number; now?: number; facilityId?: string }): StaleItem[] {
  const now = opts.now ?? Date.now();
  const out: StaleItem[] = [];
  for (const e of lastOwnScanByItem(events).values()) {
    if (isFinishedScan(e)) continue;
    if (opts.facilityId && e.facilityId !== opts.facilityId) continue;
    const minutes = Math.floor((now - new Date(e.at).getTime()) / 60000);
    if (minutes > opts.limitMinutes) out.push({ itemId: e.itemId, caseAccession: e.caseAccession, stationName: e.stationName, node: e.node, lastAt: e.at, minutes });
  }
  return out.sort((a, b) => b.minutes - a.minutes || a.itemId.localeCompare(b.itemId));
}

/** Items whose last own scan put them at a step with no carrier and their work there not yet completed, per step. */
export function looseItemsByNode(events: readonly StationScanEvent[], opts: { facilityId?: string } = {}): Map<BatchProcessingNode, number> {
  const out = new Map<BatchProcessingNode, number>();
  for (const e of lastOwnScanByItem(events).values()) {
    if (e.action === 'completed' || e.carrierId || !e.node) continue;
    if (opts.facilityId && e.facilityId !== opts.facilityId) continue;
    out.set(e.node, (out.get(e.node) ?? 0) + 1);
  }
  return out;
}
