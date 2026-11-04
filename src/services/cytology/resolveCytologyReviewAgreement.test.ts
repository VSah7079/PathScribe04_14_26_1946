// Batch 410 (Pete): a later review's agreement with the initial screen, stored when it's saved.
import { describe, it, expect } from 'vitest';
import { initialScreenFor, resolveCytologyReviewAgreement } from './resolveCytologyReviewAgreement';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';

const categories = [
  { id: 'sat', section: 'adequacy' },
  { id: 'unsat', section: 'adequacy', isUnsatisfactory: true },
  { id: 'nilm', diagnosticRank: 0 }, { id: 'ascus', diagnosticRank: 1 }, { id: 'lsil', diagnosticRank: 2 }, { id: 'hsil', diagnosticRank: 4 },
  { id: 'org', diagnosticRank: 0 }, { id: 'rep', section: 'recommendation' }, { id: 'hpv', section: 'recommendation' },
] as never[];
const initial = {
  id: 'rv-p', role: 'primary_screen', primaryInterpretationId: 'nilm', additionalInterpretations: [{ categoryId: 'org' }],
  adequacySelections: [{ categoryId: 'sat' }], recommendations: [{ categoryId: 'rep' }],
  recordedAt: '2026-09-29T10:00:00Z', updatedAt: '2026-09-29T11:00:00Z', recordedBy: { userId: 'CT1', userName: 'CT One' },
} as CytologyReviewRecord;
const by = { at: '2026-09-30T18:00:00Z', by: { userId: 'P1', userName: 'Dr P' } };

describe('resolveCytologyReviewAgreement', () => {
  it('the same primary and picks: exact, nothing added or missed, tied to the initial screen\'s version', () => {
    expect(resolveCytologyReviewAgreement(initial, initial, categories, by)).toEqual({
      level: 'exact', adequacyDiscrepancy: false,
      addedInterpretationIds: [], missedInterpretationIds: [], addedRecommendationIds: [], missedRecommendationIds: [],
      comparedWithReviewId: 'rv-p', comparedWithUserId: 'CT1', comparedWithVersionAt: '2026-09-29T11:00:00Z',
      assessedAt: '2026-09-30T18:00:00Z', assessedBy: { userId: 'P1', userName: 'Dr P' },
    });
  });
  it('same side of the high-grade line: minor, with the secondary and recommendation differences', () => {
    const a = resolveCytologyReviewAgreement({ primaryInterpretationId: 'lsil', adequacySelections: [{ categoryId: 'sat' }], recommendations: [{ categoryId: 'hpv' }] }, initial, categories, by);
    expect(a).toMatchObject({ level: 'minor_discrepancy', addedInterpretationIds: ['lsil'], missedInterpretationIds: ['nilm', 'org'], addedRecommendationIds: ['hpv'], missedRecommendationIds: ['rep'] });
    expect(a.majorSubtype).toBeUndefined();
  });
  it('the follow-up finds high grade: major, false negative; adequacy is its own flag', () => {
    expect(resolveCytologyReviewAgreement({ primaryInterpretationId: 'hsil', adequacySelections: [{ categoryId: 'unsat' }] }, initial, categories, by))
      .toMatchObject({ level: 'major_discrepancy', majorSubtype: 'false_negative' });
  });
  it('compares with the latest initial screen, never itself, and nothing for the initial screen', () => {
    const older = { ...initial, id: 'rv-old', recordedAt: '2026-09-01T00:00:00Z' };
    expect(initialScreenFor([older, initial], 'pathologist_review')?.id).toBe('rv-p');
    expect(initialScreenFor([initial], 'primary_screen')).toBeUndefined();
    expect(initialScreenFor([], 'secondary_reviewer')).toBeUndefined();
  });
});
