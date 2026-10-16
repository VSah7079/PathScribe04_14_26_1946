// src/services/specimens/resolveSpecimenLisSyncState.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 512: the LIS sync state a specimen gets when it is saved from the
// report page's specimen editor (decided here, not in the modal).
//
// The field records whether PathScribe has changed the specimen since the LIS
// sent it. It is NOT the LIS's own status for the case (that is the case's
// workflow status, shown on the worklist).
//
//   • Orchestration (O26-) case → 'local_only' (the specimen goes out with the
//     result message at sign-out; no separate sync).
//   • LIS (S26-) case, new or edited → 'pending_sync' (needs writing back).
//     That includes a specimen with NO sync state: that is how ordinary LIS
//     specimens arrive, and it means the same as 'lis_owned'. Before Batch 512
//     only the literal 'lis_owned' was recognised, so editing an ordinary LIS
//     specimen never flagged it.
//   • Edited again after it was sent or rejected → 'pending_sync' as well:
//     the new change hasn't been sent yet (the type's own definition).
// ─────────────────────────────────────────────────────────────────────────────

import type { SpecimenLisSyncState } from '@/types/case/Specimen';

export function resolveSpecimenLisSyncState(isOrchestrationCase: boolean): SpecimenLisSyncState {
  if (isOrchestrationCase) return 'local_only';
  return 'pending_sync';
}

/** Whether a sync state needs a badge in the specimen list (only unsent or answered changes do). */
export function lisSyncStateNeedsBadge(state: SpecimenLisSyncState | undefined): state is 'pending_sync' | 'sync_sent' | 'sync_rejected' {
  return state === 'pending_sync' || state === 'sync_sent' || state === 'sync_rejected';
}
