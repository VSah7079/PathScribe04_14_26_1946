// src/services/batches/batchListView.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 408 (Pete: "Close out batch management"). Decisions the Batch
// Management list and Batch Detail used to make inline:
//   - which batches are open (active or reconciling) or closed (complete or
//     aborted), the stage filter, and each stage tile's count;
//   - whether a reconciliation can be completed. One rule, shared with
//     mockBatchService.completeReconciliation, so the Complete button and
//     the service can't disagree. Before, the button ignored an
//     unacknowledged cold-chain excursion, which the service refused.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { Batch, BatchItem, BatchProcessingNode } from './IBatchService';
import { BATCH_ERRORS } from './IBatchService';

export const isOpenBatch = (b: Pick<Batch, 'status'>): boolean => b.status === 'active' || b.status === 'reconciling';
export const isClosedBatch = (b: Pick<Batch, 'status'>): boolean => b.status === 'complete' || b.status === 'aborted';

/** Open batches, narrowed to one processing stage when a stage tile is selected. */
export function openBatches<B extends Pick<Batch, 'status' | 'processingNode'>>(batches: readonly B[], stageFilter: BatchProcessingNode | null): B[] {
  return batches.filter(b => isOpenBatch(b) && (!stageFilter || b.processingNode === stageFilter));
}

export function closedBatches<B extends Pick<Batch, 'status'>>(batches: readonly B[]): B[] {
  return batches.filter(isClosedBatch);
}

/** A stage tile's count: open batches at that stage. */
export function openCountByNode(batches: readonly Pick<Batch, 'status' | 'processingNode'>[], node: BatchProcessingNode): number {
  return batches.filter(b => isOpenBatch(b) && b.processingNode === node).length;
}

export interface ReconciliationGate {
  /** Items not yet scanned out. */
  missingItems: BatchItem[];
  unexpectedCount: number;
  /** A cold-chain excursion is on file and not acknowledged. */
  coldChainPending: boolean;
  /** What stops completion, in the order the service checks it, or null. */
  blocker: typeof BATCH_ERRORS.itemsMissing | typeof BATCH_ERRORS.unexpectedScans | typeof BATCH_ERRORS.coldChainUnacknowledged | null;
  canComplete: boolean;
}

/** Whether a reconciling batch can be completed without a supervisor override. */
export function reconciliationGate(batch: Pick<Batch, 'status' | 'items' | 'unexpectedScans' | 'coldChainExcursion'>): ReconciliationGate {
  const missingItems = batch.items.filter(i => i.reconciliationStatus !== 'matched');
  const unexpectedCount = batch.unexpectedScans.length;
  const coldChainPending = !!batch.coldChainExcursion && !batch.coldChainExcursion.acknowledgedAt;
  const blocker = missingItems.length > 0 ? BATCH_ERRORS.itemsMissing
    : unexpectedCount > 0 ? BATCH_ERRORS.unexpectedScans
    : coldChainPending ? BATCH_ERRORS.coldChainUnacknowledged
    : null;
  return { missingItems, unexpectedCount, coldChainPending, blocker, canComplete: batch.status === 'reconciling' && blocker === null };
}
