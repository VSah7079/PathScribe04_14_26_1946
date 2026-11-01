// Batch 728 (Lab Workflow & Batch spec, Decision 4): research cases are left off the clinical worklists, in the
// tile counts and in the lists the tiles open alike (a tile still counts exactly the rows it shows).
import { describe, it, expect } from 'vitest';
import type { Case } from '@/types/case/Case';
import { computeWorklistTileCounts, filterWorklistCases, type WorklistCountDeps } from './worklistTileCounts';
import { isResearchCase, DEFAULT_RESEARCH_CASE_SETTINGS } from '../researchCases/researchCaseRules';

const mk = (id: string, accession: string, status = 'in-progress', mrn = 'MRN-1'): Case => ({
  id, status, accession: { accessionNumber: accession, fullAccession: accession }, patient: { id: `p-${id}`, mrn },
  specimens: [{ specimenDictionaryEntryId: 'e-surg' }], order: { priority: 'Routine' }, updatedAt: '2026-10-03T09:00:00Z',
} as unknown as Case);

const none = { has: () => false };
const deps = (over: Partial<WorklistCountDeps> = {}): WorklistCountDeps => ({
  specimenDictionary: [{ id: 'e-surg', specimenCategory: 'SURGICAL_TISSUE' }] as WorklistCountDeps['specimenDictionary'],
  userId: 'u', viewedCaseIds: none, amendmentAddendaCaseIds: none, informalReviewCaseIds: none, peerReviewCaseIds: none,
  delegatedCaseIds: [], wsiSlidesByCaseId: none, dpResultByCaseId: none, facilityTimezone: 'UTC', now: new Date('2026-10-03T12:00:00Z'),
  isResearchCase: c => isResearchCase(c, DEFAULT_RESEARCH_CASE_SETTINGS),
  ...over,
});

describe('research cases on the worklist (Decision 4)', () => {
  const cases = [mk('c1', 'S26-1'), mk('c2', 'RES26-1'), mk('c3', 'S26-2', 'pool'), mk('c4', 'S26-3', 'in-progress', 'RSCH-0001'), mk('c5', 'RES26-2', 'pool')];

  it('the list leaves them out', () => {
    const rows = filterWorklistCases({ cases, contextFilter: 'lis', branchFilter: 'all', activeFilter: 'all', physicianFilter: '', cytologyReviewCases: [] } as never, deps());
    expect(rows.map(c => c.id)).toEqual(['c1', 'c3']);
  });

  it('the counts leave them out too', () => {
    const counts = computeWorklistTileCounts({ cases, contextFilter: 'lis', branchFilter: 'all', cytologyReviewCount: 0 }, deps());
    expect(counts.lis).toMatchObject({ assignedCount: 1, poolCount: 1, totalCount: 2 });
    expect(counts.stats.total).toBe(1);
    expect(counts.stats.allBranches).toBe(2);
  });

  it('with the rule switched off every case shows', () => {
    const counts = computeWorklistTileCounts({ cases, contextFilter: 'lis', branchFilter: 'all', cytologyReviewCount: 0 }, deps({ isResearchCase: () => false }));
    expect(counts.lis.totalCount).toBe(5);
  });
});
