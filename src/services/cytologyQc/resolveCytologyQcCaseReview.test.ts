import { describe, it, expect } from 'vitest';
import { resolveCytologyQcCaseReview, cytologyQcErrorKey } from './resolveCytologyQcCaseReview';
import { QC_REVIEW_NOT_PERMITTED } from './qcReviewErrors';

const a = (over: Record<string, unknown> = {}) => ({ id: 'qc-1', caseId: 'C1', state: 'QC_PENDING', primarySignOutProviderId: 'SIGNER', priorityTier: 'routine_random', badges: [], ...over }) as any;

describe('resolveCytologyQcCaseReview (Batch 396)', () => {
  it('no open review: nothing to show', () => {
    expect(resolveCytologyQcCaseReview([a({ state: 'FINAL_APPROVED' })], 'ME').assignment).toBeNull();
  });
  it('a pending review can be taken by anyone but its signer', () => {
    expect(resolveCytologyQcCaseReview([a()], 'ME')).toMatchObject({ canAssignToMe: true, canRecordVerdict: false, isOwnCase: false });
    expect(resolveCytologyQcCaseReview([a()], 'SIGNER')).toMatchObject({ canAssignToMe: false, isOwnCase: true });
  });
  it('the reviewer records the verdict; others see it is taken', () => {
    const inReview = a({ state: 'QC_IN_REVIEW', assignedReviewerId: 'ME' });
    expect(resolveCytologyQcCaseReview([inReview], 'ME')).toMatchObject({ canRecordVerdict: true, assignedToOther: false });
    expect(resolveCytologyQcCaseReview([inReview], 'OTHER')).toMatchObject({ canRecordVerdict: false, assignedToOther: true });
  });
  it('prefers the reader’s own review over another open one on the same case', () => {
    const mine = a({ id: 'mine', state: 'QC_IN_REVIEW', assignedReviewerId: 'ME' });
    expect(resolveCytologyQcCaseReview([a({ id: 'other' }), mine], 'ME').assignment?.id).toBe('mine');
  });
  it('maps service errors to message keys', () => {
    expect(cytologyQcErrorKey(QC_REVIEW_NOT_PERMITTED)).toBe('notPermitted');
    expect(cytologyQcErrorKey('Self-review is not permitted: x')).toBe('selfReview');
    expect(cytologyQcErrorKey('anything else')).toBe('failed');
  });
});
