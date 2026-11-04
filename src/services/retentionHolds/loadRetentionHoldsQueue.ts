// src/services/retentionHolds/loadRetentionHoldsQueue.ts
// Batch 610 (#12): reads the cases and lists the active retention holds.
// Bypasses per-user case access control, like the disposal queue: holds are a
// facility-level records task, not a decision about who may read a case.
import { caseRouter } from '../cases/CaseRouter';
import { computeRetentionHoldsQueue, type RetentionHoldRow } from './retentionHoldsQueue';

export async function loadRetentionHoldsQueue(): Promise<RetentionHoldRow[]> {
  const res = await caseRouter.getAll(undefined, { bypassAccessControl: true, includeOrchestration: true });
  return res.ok ? computeRetentionHoldsQueue(res.data) : [];
}
