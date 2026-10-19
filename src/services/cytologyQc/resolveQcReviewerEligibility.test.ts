import { describe, it, expect } from 'vitest';
import { resolveQcReviewerEligibility } from './resolveQcReviewerEligibility';

describe('resolveQcReviewerEligibility', () => {
  it('a real, different reviewer is genuinely eligible', () => {
    expect(resolveQcReviewerEligibility('prov-2', 'prov-1')).toBe(true);
  });

  it('the real primary sign-out provider is never eligible to review their own case, per spec\'s own hard Self-Review Prevention rule', () => {
    expect(resolveQcReviewerEligibility('prov-1', 'prov-1')).toBe(false);
  });
});

import { resolveQcReviewerPool, effectiveQcReviewerRoles } from './resolveQcReviewerEligibility';

describe('reviewer pool (Batch 608, #50 #79)', () => {
  it('an empty or missing pool admits anyone', () => {
    expect(resolveQcReviewerPool(undefined, [])).toBe(true);
    expect(resolveQcReviewerPool([], ['X'])).toBe(true);
  });
  it('otherwise the reviewer needs a matching role, ignoring case', () => {
    expect(resolveQcReviewerPool(['SENIOR_CT', 'PATHOLOGIST'], ['pathologist'])).toBe(true);
    expect(resolveQcReviewerPool(['SENIOR_CT'], ['PATHOLOGIST'])).toBe(false);
    expect(resolveQcReviewerPool(['SENIOR_CT'], undefined)).toBe(false);
  });
  it('staff without pools set: Pathologist counts as PATHOLOGIST; an explicit list wins', () => {
    expect(effectiveQcReviewerRoles({ roles: ['Pathologist'] })).toEqual(['PATHOLOGIST']);
    expect(effectiveQcReviewerRoles({ roles: ['Pathologist'], qcReviewerRoles: ['SENIOR_CT'] })).toEqual(['SENIOR_CT']);
    expect(effectiveQcReviewerRoles({ roles: ['Admin'] })).toEqual([]);
  });
});
