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
  it('Batch 434: without cytology:qc-review:record, nothing to assign or record', () => {
    expect(resolveCytologyQcCaseReview([a()], 'ME', false)).toMatchObject({ canAssignToMe: false, isOwnCase: false });
    expect(resolveCytologyQcCaseReview([a({ state: 'QC_IN_REVIEW', assignedReviewerId: 'ME' })], 'ME', false)).toMatchObject({ canRecordVerdict: false });
  });
  it('Batch 608: a reader outside the pool cannot take the review and is told why', () => {
    const pooled = a({ eligibleReviewerRoles: ['SENIOR_CT'] });
    expect(resolveCytologyQcCaseReview([pooled], 'ME', true, ['PATHOLOGIST'])).toMatchObject({ canAssignToMe: false, notInPool: true, isOwnCase: false });
    expect(resolveCytologyQcCaseReview([pooled], 'ME', true, ['SENIOR_CT'])).toMatchObject({ canAssignToMe: true, notInPool: false });
    expect(resolveCytologyQcCaseReview([a()], 'ME', true, [])).toMatchObject({ canAssignToMe: true, notInPool: false });
  });
  it('Batch 608: maps the pool refusal', () => {
    expect(cytologyQcErrorKey('CYTOLOGY_QC_REVIEWER_NOT_IN_POOL')).toBe('notInPool');
  });
  it('maps service errors to message keys', () => {
    expect(cytologyQcErrorKey(QC_REVIEW_NOT_PERMITTED)).toBe('notPermitted');
    expect(cytologyQcErrorKey('Self-review is not permitted: x')).toBe('selfReview');
    expect(cytologyQcErrorKey('anything else')).toBe('failed');
  });
});
