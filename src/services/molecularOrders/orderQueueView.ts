// src/services/molecularOrders/orderQueueView.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 406. The Molecular Order Queue page's decisions, moved out of the
// page: newest entries first, and telling a molecular order from an
// instrument order by its payload.
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
