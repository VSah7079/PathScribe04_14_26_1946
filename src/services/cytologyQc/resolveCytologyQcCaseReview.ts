// src/services/cytologyQc/resolveCytologyQcCaseReview.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 396 (Pete: record the verdict where you review the case). Which QC
// peer review, if any, a reader can act on for one case, and what they can
// do with it. Used by the review bar on the cytology screening page and by
// the queue's rows. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyQcCaseAssignment } from '@/types/cytologyQc/CytologyQcRule';
import { resolveQcReviewerEligibility, resolveQcReviewerPool } from './resolveQcReviewerEligibility';
import { QC_REVIEW_NOT_PERMITTED, QC_REVIEWER_NOT_IN_POOL } from './qcReviewErrors';

export interface CytologyQcCaseReview {
  assignment: CytologyQcCaseAssignment | null;
  /** Pending, and the reader didn't sign the case out. */
  canAssignToMe: boolean;
  /** In review by this reader: they can record concurrence or a discrepancy. */
  canRecordVerdict: boolean;
  assignedToOther: boolean;
  /** Pending, but the reader signed it out, so someone else must review it. */
  isOwnCase: boolean;
  /** Batch 608: pending, but the reader is not in the case's reviewer pool. */
  notInPool: boolean;
}

const ACTIVE = new Set(['QC_PENDING', 'QC_IN_REVIEW']);

/** `canRecord`: whether the reader holds cytology:qc-review:record (Batch 434:
 *  without it, Assign to Me and the verdict buttons aren't offered; the
 *  service refuses them anyway). */
export function resolveCytologyQcCaseReview(assignments: CytologyQcCaseAssignment[], userId: string | null | undefined, canRecord = true, reviewerRoles?: string[] | null): CytologyQcCaseReview {
  const active = assignments.filter(a => ACTIVE.has(a.state));
  // The reader's own review first, then one waiting for a reviewer, then any.
  const assignment = active.find(a => a.state === 'QC_IN_REVIEW' && a.assignedReviewerId === userId)
    ?? active.find(a => a.state === 'QC_PENDING')
    ?? active[0]
    ?? null;
  if (!assignment || !userId) {
    return { assignment, canAssignToMe: false, canRecordVerdict: false, assignedToOther: !!assignment && assignment.state === 'QC_IN_REVIEW', isOwnCase: false, notInPool: false };
  }
  const pending = assignment.state === 'QC_PENDING';
  const own = !resolveQcReviewerEligibility(userId, assignment.primarySignOutProviderId);
  const inPool = resolveQcReviewerPool(assignment.eligibleReviewerRoles, reviewerRoles);
  const eligible = !own && inPool;
  return {
    assignment,
    canAssignToMe: pending && eligible && canRecord,
    canRecordVerdict: assignment.state === 'QC_IN_REVIEW' && assignment.assignedReviewerId === userId && canRecord,
    assignedToOther: assignment.state === 'QC_IN_REVIEW' && assignment.assignedReviewerId !== userId,
    isOwnCase: pending && own,
    notInPool: pending && !own && !inPool,
  };
}

/** The message key for a failed QC action's error. */
export function cytologyQcErrorKey(error: string | undefined): 'notPermitted' | 'selfReview' | 'notInPool' | 'failed' {
  if (error === QC_REVIEW_NOT_PERMITTED) return 'notPermitted';
  if (error === QC_REVIEWER_NOT_IN_POOL) return 'notInPool';
  if (error?.startsWith('Self-review')) return 'selfReview';
  return 'failed';
}
