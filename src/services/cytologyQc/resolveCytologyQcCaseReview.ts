// src/services/cytologyQc/resolveCytologyQcCaseReview.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 396 (Pete: record the verdict where you review the case). Which QC
// peer review, if any, a reader can act on for one case, and what they can
// do with it. Used by the review bar on the cytology screening page and by
// the queue's rows. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyQcCaseAssignment } from '@/types/cytologyQc/CytologyQcRule';
import { resolveQcReviewerEligibility } from './resolveQcReviewerEligibility';
import { QC_REVIEW_NOT_PERMITTED } from './qcReviewErrors';

export interface CytologyQcCaseReview {
  assignment: CytologyQcCaseAssignment | null;
  /** Pending, and the reader didn't sign the case out. */
  canAssignToMe: boolean;
  /** In review by this reader: they can record concurrence or a discrepancy. */
  canRecordVerdict: boolean;
  assignedToOther: boolean;
  /** Pending, but the reader signed it out, so someone else must review it. */
  isOwnCase: boolean;
}

const ACTIVE = new Set(['QC_PENDING', 'QC_IN_REVIEW']);

export function resolveCytologyQcCaseReview(assignments: CytologyQcCaseAssignment[], userId: string | null | undefined): CytologyQcCaseReview {
  const active = assignments.filter(a => ACTIVE.has(a.state));
  // The reader's own review first, then one waiting for a reviewer, then any.
  const assignment = active.find(a => a.state === 'QC_IN_REVIEW' && a.assignedReviewerId === userId)
    ?? active.find(a => a.state === 'QC_PENDING')
    ?? active[0]
    ?? null;
  if (!assignment || !userId) {
    return { assignment, canAssignToMe: false, canRecordVerdict: false, assignedToOther: !!assignment && assignment.state === 'QC_IN_REVIEW', isOwnCase: false };
  }
  const pending = assignment.state === 'QC_PENDING';
  const eligible = resolveQcReviewerEligibility(userId, assignment.primarySignOutProviderId);
  return {
    assignment,
    canAssignToMe: pending && eligible,
    canRecordVerdict: assignment.state === 'QC_IN_REVIEW' && assignment.assignedReviewerId === userId,
    assignedToOther: assignment.state === 'QC_IN_REVIEW' && assignment.assignedReviewerId !== userId,
    isOwnCase: pending && !eligible,
  };
}

/** The message key for a failed QC action's error. */
export function cytologyQcErrorKey(error: string | undefined): 'notPermitted' | 'selfReview' | 'failed' {
  if (error === QC_REVIEW_NOT_PERMITTED) return 'notPermitted';
  if (error?.startsWith('Self-review')) return 'selfReview';
  return 'failed';
}
