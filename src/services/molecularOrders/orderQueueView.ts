// src/services/molecularOrders/orderQueueView.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 406. The Molecular Order Queue page's decisions, moved out of the
// page: newest entries first, and telling a molecular order from an
// instrument order by its payload; and whether a reflex order is already queued (Batch 669).
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { MolecularOrderOutboundQueueEntry, MolecularOrderPayload, InstrumentOrderPayload } from '@/types/case/MolecularOrderOutboundQueueEntry';

export function queueEntriesNewestFirst(entries: readonly MolecularOrderOutboundQueueEntry[]): MolecularOrderOutboundQueueEntry[] {
  return [...entries].sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
}

export function isMolecularOrderPayload(payload: MolecularOrderPayload | InstrumentOrderPayload): payload is MolecularOrderPayload {
  return 'assayCode' in payload;
}

/** Batch 669 (mol-3): whether a reflex genotyping order for this specimen is already on the queue (any status, a failed one
 *  can be retried). A positive screen result sent again under a new message id then adds no second order. */
export function hasReflexOrder(
  entries: readonly MolecularOrderOutboundQueueEntry[], accessionNumber: string, specimenLetter: string, assayCode: string,
): boolean {
  return entries.some(e => e.eventType === 'order.molecular' && isMolecularOrderPayload(e.payload)
    && e.payload.orderReason === 'hpv_reflex_genotyping' && e.payload.accessionNumber === accessionNumber
    && e.payload.specimenLetter === specimenLetter && e.payload.assayCode === assayCode);
}

/** Batch 669 (mol-3): what the demo's outcome line says after a simulated inbound HPV result — a locale key under
 *  molecularOrderQueue (and the translated outcome to put in it), never the processor's raw code. Pure. */
export function simulatedResultMessage(result: { outcome: string; reflex?: 'queued' | 'already-queued' }): { key: string; outcomeKey?: string } {
  if (result.outcome === 'applied') {
    if (result.reflex === 'queued') return { key: 'molecularOrderQueue.resultAppliedWithReflex' };
    if (result.reflex === 'already-queued') return { key: 'molecularOrderQueue.resultAppliedReflexExists' };
    return { key: 'molecularOrderQueue.resultApplied' };
  }
  const known = ['already-applied', 'case-not-found', 'specimen-not-found', 'invalid-payload'];
  return { key: 'molecularOrderQueue.resultOutcome', outcomeKey: `molecularOrderQueue.outcome.${known.includes(result.outcome) ? result.outcome : 'unknown'}` };
}
