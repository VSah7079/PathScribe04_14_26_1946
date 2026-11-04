// src/services/worklist/worklistTileCounts.test.ts
// Batch 450: proves the Worklist tile counts for PS-305, PS-307 and PS-309.
// Every "count matches the list" check compares computeWorklistTileCounts
// with filterWorklistCases, the same function the page uses for the rows a
// tile click shows.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Case } from '@/types/case/Case';
import {
  computeWorklistTileCounts,
  filterWorklistCases,
  type WorklistActiveFilter,
  type WorklistBranchFilter,
  type WorklistContextFilter,
  type WorklistCountDeps,
  type WorklistTileCounts,
} from './worklistTileCounts';

const ME = 'u-me';
const NOW = new Date('2026-10-03T15:00:00Z');

const dict = [
  { id: 'e-gyn', specimenCategory: 'GYN_CYTOLOGY' },
  { id: 'e-nongyn', specimenCategory: 'NON_GYN_CYTOLOGY' },
  { id: 'e-surg', specimenCategory: 'SURGICAL_TISSUE' },
] as WorklistCountDeps['specimenDictionary'];

type Branch = 'surgpath' | 'gyn' | 'nongyn' | 'autopsy';
interface Spec {
  id: string;
  status: string;
  branch?: Branch;
  urgent?: boolean;
  outreach?: boolean;
  extra?: Record<string, unknown>;
}

function mk({ id, status, branch = 'surgpath', urgent = false, outreach = false, extra = {} }: Spec): Case {
  const entry = branch === 'gyn' ? 'e-gyn' : branch === 'nongyn' ? 'e-nongyn' : 'e-surg';
  return {
    id,
    status,
    reportingMode: outreach ? 'orchestrator' : undefined,
    specimens: [{ specimenDictionaryEntryId: entry }],
    autopsy: branch === 'autopsy' ? { id: `a-${id}` } : undefined,
    order: { priority: urgent ? 'STAT' : 'Routine', requestingProvider: 'Dr Smith' },
    updatedAt: '2026-10-03T09:00:00Z',
    ...extra,
  } as unknown as Case;
}

function deps(over: Partial<WorklistCountDeps> = {}): WorklistCountDeps {
  return {

    specimenDictionary: dict,
    userId: ME,
    viewedCaseIds: new Set(['v1', 'v2']),
    amendmentAddendaCaseIds: new Map([['am1', 'notice']]),
    informalReviewCaseIds: new Set(['ir1']),
    peerReviewCaseIds: new Set(['pr1']),
    followUpCaseIds: new Set(['pr1', 'ir1']),
    delegatedCaseIds: ['dl1'],
    wsiSlidesByCaseId: new Map([['dp1', []]]),
    dpResultByCaseId: new Map([['dp2', {}]]),
    facilityTimezone: 'UTC',
    now: NOW,
    ...over,
  };
}

const attending = { participants: [{ status: 'active', staffId: ME, participationTypeIds: ['attending'] }] };

/** A mixed LIS + Outreach population spread over every branch and status. */
function population(): Case[] {
  const cases: Case[] = [];
  const branches: Branch[] = ['surgpath', 'gyn', 'nongyn', 'autopsy'];
  for (const b of branches) {
    for (const outreach of [false, true]) {
      const p = `${b}-${outreach ? 'o' : 'l'}`;
      cases.push(
        mk({ id: `${p}-urg-ip`, status: 'in-progress', branch: b, urgent: true, outreach }),
        mk({ id: `${p}-ip`, status: 'in-progress', branch: b, outreach }),
        mk({ id: `${p}-draft`, status: 'draft', branch: b, outreach }),
        mk({ id: `${p}-fin`, status: 'finalizing', branch: b, outreach }),
        mk({ id: `${p}-acc`, status: 'accessioned', branch: b, outreach }),
        mk({ id: `${p}-gc`, status: 'gross-complete', branch: b, outreach }),
        mk({ id: `${p}-done`, status: 'finalized', branch: b, outreach }),
        mk({ id: `${p}-old`, status: 'finalized', branch: b, outreach, extra: { updatedAt: '2026-09-01T09:00:00Z' } }),
        mk({ id: `${p}-hold`, status: 'in-progress', branch: b, outreach, extra: { caseHolds: [{ id: 'h', active: true }] } }),
        mk({ id: `${p}-pool`, status: 'pool', branch: b, outreach }),
        mk({ id: `${p}-pool-urg`, status: 'pool', branch: b, urgent: true, outreach }),
        mk({ id: `${p}-cs`, status: 'pending-countersign', branch: b, outreach, extra: attending }),
        mk({ id: `${p}-rel`, status: 'pending-release', branch: b, outreach, extra: { finalizedBy: ME } }),
        mk({ id: `${p}-ret`, status: 'returned', branch: b, outreach, extra: { returnedBy: ME } }),
      );
    }
  }
  // Id-set driven tiles, LIS surgpath and LIS cytology.
  cases.push(
    mk({ id: 'am1', status: 'in-progress' }),
    mk({ id: 'ir1', status: 'in-progress', branch: 'gyn' }),
    mk({ id: 'pr1', status: 'draft' }),
    mk({ id: 'v1', status: 'draft' }),
    mk({ id: 'v2', status: 'pool', branch: 'gyn' }),
  );
  return cases;
}

/** Each status tile: how its count is read, and the filter its click applies. */
const STATUS_TILES: { filter: WorklistActiveFilter; count: (t: WorklistTileCounts) => number }[] = [
  { filter: 'pool',           count: t => t.stats.pool },
  { filter: 'countersign',    count: t => t.countersignPendingCount },
  { filter: 'collaborating',  count: t => t.collaboratingCount },
  { filter: 'pendingrelease', count: t => t.pendingReleaseCount },
  { filter: 'needsrevision',  count: t => t.needsRevisionCount },
  // Urgent's tile shows assigned urgent cases plus an "N in pool" sublabel; the list shows both.
  { filter: 'urgent',         count: t => t.stats.urgent + t.urgentPoolCount },
  { filter: 'inprogress',     count: t => t.stats.inProgress },
  { filter: 'accessioned',    count: t => t.stats.accessioned },
  { filter: 'grosscomplete',  count: t => t.stats.grossComplete },
  { filter: 'onhold',         count: t => t.stats.onHold },
  { filter: 'dp',             count: t => t.stats.dpRelevant },
  { filter: 'gyncyto',        count: t => t.stats.gynCytology },
  { filter: 'nongyncyto',     count: t => t.stats.nonGynCytology },
  { filter: 'newcases',       count: t => t.stats.newCases },
  { filter: 'amended',        count: t => t.stats.amended },
  { filter: 'completed',      count: t => t.stats.completedToday },
  { filter: 'draft',          count: t => t.stats.draft },
  { filter: 'finalizing',     count: t => t.stats.finalizing },
  { filter: 'informalreview', count: t => t.stats.informalReview },
  { filter: 'peerreview',     count: t => t.stats.peerReview },
  // Batch 454: follow-ups due soon or overdue.
  { filter: 'followup',       count: t => t.stats.followUp },
];

function counts(cases: Case[], contextFilter: WorklistContextFilter, branchFilter: WorklistBranchFilter, d = deps()) {
  return computeWorklistTileCounts({ cases, contextFilter, branchFilter, cytologyReviewCount: 0 }, d);
}
function rows(cases: Case[], contextFilter: WorklistContextFilter, branchFilter: WorklistBranchFilter, activeFilter: WorklistActiveFilter, d = deps()) {
  return filterWorklistCases({ cases, contextFilter, branchFilter, activeFilter, physicianFilter: '', cytologyReviewCases: [] }, d);
}

describe('PS-307 status tile counts match the list a tile opens, per branch', () => {
  const cases = population();
  for (const context of ['lis', 'outreach'] as const) {
    for (const branch of ['all', 'surgpath', 'cytology', 'autopsy'] as const) {
      it(`${context}, branch ${branch}: every status tile count equals its row count`, () => {
        const t = counts(cases, context, branch);
        for (const tile of STATUS_TILES) {
          const shown = rows(cases, context, branch, tile.filter).length;
          expect({ tile: tile.filter, count: tile.count(t) }).toEqual({ tile: tile.filter, count: shown });
        }
      });
    }
  }

  it('with Surg Path selected, the Urgent tile counts only Surg Path urgent cases (the reported 7-vs-4 mismatch)', () => {
    const cases = [
      mk({ id: 's1', status: 'in-progress', urgent: true }),
      mk({ id: 's2', status: 'draft', urgent: true }),
      mk({ id: 's3', status: 'in-progress', urgent: true }),
      mk({ id: 's4', status: 'accessioned', urgent: true }),
      mk({ id: 'c1', status: 'in-progress', urgent: true, branch: 'gyn' }),
      mk({ id: 'c2', status: 'draft', urgent: true, branch: 'nongyn' }),
      mk({ id: 'a1', status: 'in-progress', urgent: true, branch: 'autopsy' }),
    ];
    expect(counts(cases, 'lis', 'all').stats.urgent).toBe(7);
    const t = counts(cases, 'lis', 'surgpath');
    expect(t.stats.urgent).toBe(4);
    expect(rows(cases, 'lis', 'surgpath', 'urgent').map(c => c.id)).toEqual(['s1', 's2', 's3', 's4']);
  });

  it('the selected branch also scopes the In Progress and Draft tiles', () => {
    const cases = [
      mk({ id: 's-ip', status: 'in-progress' }),
      mk({ id: 's-dr', status: 'draft' }),
      mk({ id: 'c-ip', status: 'in-progress', branch: 'gyn' }),
      mk({ id: 'c-dr1', status: 'draft', branch: 'gyn' }),
      mk({ id: 'c-dr2', status: 'draft', branch: 'nongyn' }),
    ];
    const cyto = counts(cases, 'lis', 'cytology');
    expect(cyto.stats.inProgress).toBe(1);
    expect(cyto.stats.draft).toBe(2);
    const surg = counts(cases, 'lis', 'surgpath');
    expect(surg.stats.inProgress).toBe(1);
    expect(surg.stats.draft).toBe(1);
  });
});

describe('PS-307 branch tab counts stay unfiltered', () => {
  const cases = population();
  it('each branch tab shows its own branch total whichever branch is selected', () => {
    for (const context of ['lis', 'outreach'] as const) {
      const tabs = (b: WorklistBranchFilter) => {
        const s = counts(cases, context, b).stats;
        return { all: s.allBranches, surgpath: s.surgpathBranch, cytology: s.cytologyBranch, autopsy: s.autopsy };
      };
      const base = tabs('all');
      for (const b of ['surgpath', 'cytology', 'autopsy'] as const) expect(tabs(b)).toEqual(base);
      // And each tab's number is the size of the list that tab shows (All Cases filter).
      expect(base.all).toBe(rows(cases, context, 'all', 'all').length);
      expect(base.surgpath).toBe(rows(cases, context, 'surgpath', 'all').length);
      expect(base.cytology).toBe(rows(cases, context, 'cytology', 'all').length);
      expect(base.autopsy).toBe(rows(cases, context, 'autopsy', 'all').length);
    }
  });

  it('selecting a branch does not shrink All Cases to that branch', () => {
    const s = counts(cases, 'lis', 'surgpath').stats;
    expect(s.allBranches).toBeGreaterThan(s.surgpathBranch);
    expect(s.allBranches).toBe(s.surgpathBranch + s.cytologyBranch + s.autopsy);
  });
});

describe('PS-305 LIS and Outreach tiles include pool cases', () => {
  const cases = population();

  it('with the LIS filter active, the LIS Cases tile (assigned plus pool) equals All Cases', () => {
    const t = counts(cases, 'lis', 'all');
    expect(t.lis.poolCount).toBeGreaterThan(0);
    expect(t.lis.totalCount).toBe(t.lis.assignedCount + t.lis.poolCount);
    expect(t.lis.totalCount).toBe(t.stats.allBranches);
    expect(t.lis.assignedCount).toBeLessThan(t.stats.allBranches); // the old, pool-less number disagreed
  });

  it('the Outreach tile includes pool cases the same way and equals All Cases under Outreach', () => {
    const t = counts(cases, 'outreach', 'all');
    expect(t.outreach.poolCount).toBeGreaterThan(0);
    expect(t.outreach.totalCount).toBe(t.outreach.assignedCount + t.outreach.poolCount);
    expect(t.outreach.totalCount).toBe(t.stats.allBranches);
  });

  it('the mode tiles are the same whichever context and branch is selected', () => {
    const ref = counts(cases, 'lis', 'all');
    for (const ctx of ['lis', 'outreach'] as const) {
      for (const b of ['all', 'surgpath', 'cytology', 'autopsy'] as const) {
        const t = counts(cases, ctx, b);
        expect(t.lis).toEqual(ref.lis);
        expect(t.outreach).toEqual(ref.outreach);
      }
    }
  });

  it('with the LIS filter active, LIS Cases, All Cases and the sum of the Surg Path, Cytology and Autopsy tabs all agree', () => {
    const t = counts(cases, 'lis', 'all');
    const sumOfBranches = t.stats.surgpathBranch + t.stats.cytologyBranch + t.stats.autopsy;
    expect(t.lis.totalCount).toBe(t.stats.allBranches);
    expect(sumOfBranches).toBe(t.stats.allBranches);
    expect(rows(cases, 'lis', 'all', 'all').length).toBe(t.stats.allBranches);
  });

  it('pool badges: urgent counts assigned urgent cases only, hasUrgentPool flags an urgent pool case', () => {
    const cases = [
      mk({ id: 'l1', status: 'in-progress', urgent: true }),
      mk({ id: 'l2', status: 'pool', urgent: true }),
      mk({ id: 'o1', status: 'pool', outreach: true }),
    ];
    const t = counts(cases, 'lis', 'all');
    expect(t.lis).toEqual({ assignedCount: 1, urgentCount: 1, poolCount: 1, totalCount: 2, hasUrgentPool: true });
    expect(t.outreach).toEqual({ assignedCount: 0, urgentCount: 0, poolCount: 1, totalCount: 1, hasUrgentPool: false });
  });
});

describe('PS-309 DP tile count per branch tab', () => {
  // Two DP surgical cases (one with slides, one with an AI result), plus
  // non-DP cases in every branch.
  const cases = [
    mk({ id: 'dp1', status: 'in-progress' }),
    mk({ id: 'dp2', status: 'draft' }),
    mk({ id: 'sp', status: 'in-progress' }),
    mk({ id: 'cy', status: 'in-progress', branch: 'gyn' }),
    mk({ id: 'cy2', status: 'draft', branch: 'nongyn' }),
    mk({ id: 'au', status: 'in-progress', branch: 'autopsy' }),
  ];
  const expected: Record<WorklistBranchFilter, number> = { all: 2, surgpath: 2, cytology: 0, autopsy: 0 };
  for (const branch of ['all', 'surgpath', 'cytology', 'autopsy'] as const) {
    it(`branch ${branch}: DP tile reads ${expected[branch]} and matches the DP list`, () => {
      expect(counts(cases, 'lis', branch).stats.dpRelevant).toBe(expected[branch]);
      expect(rows(cases, 'lis', branch, 'dp').length).toBe(expected[branch]);
    });
  }
});

describe('WorklistPage uses the shared tile-count module', () => {
  const page = readFileSync(resolve(__dirname, '../../pages/WorklistPage/WorklistPage.tsx'), 'utf8');
  it('counts and list come from computeWorklistTileCounts and filterWorklistCases, not inline logic', () => {
    expect(page).toContain("from '@/services/worklist/worklistTileCounts'");
    expect(page).toMatch(/computeWorklistTileCounts\(/);
    expect(page).toMatch(/filterWorklistCases\(/);
    expect(page).not.toContain('branchFilteredSourceCases');
    expect(page).not.toMatch(/lisNonPoolCount\s*\+\s*lisPoolCount/);
    expect(page).not.toContain('resolveCaseDisciplineBranch(');
  });
});

// Batch 452 (Pete, Oct 4 2026): restricted cases (pediatric / Orchestration
// access) appear in the list as redacted rows, so the tiles count them too.
// Neither the counts nor the list take an access check any more, so the
// row-count parity tests above hold for restricted cases as well.
describe('restricted cases are counted like the rows that show them', () => {
  const source = readFileSync(resolve(__dirname, './worklistTileCounts.ts'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  it('the counting code has no access filter that the list lacks', () => {
    expect(source).not.toContain('canViewCase');
  });
  it('a restricted pool case and a restricted Outreach case are counted in All Cases and the mode tiles alike', () => {
    const cases = [mk({ id: 'r-pool', status: 'pool' }), mk({ id: 'r-assigned', status: 'in-progress' }), mk({ id: 'r-o', status: 'in-progress', outreach: true })];
    const lis = computeWorklistTileCounts({ cases, contextFilter: 'lis', branchFilter: 'all', cytologyReviewCount: 0 }, deps());
    expect(lis.lis.totalCount).toBe(lis.stats.allBranches);
    expect(lis.stats.allBranches).toBe(filterWorklistCases({ cases, contextFilter: 'lis', branchFilter: 'all', activeFilter: 'all', physicianFilter: '', cytologyReviewCases: [] }, deps()).length);
    const out = computeWorklistTileCounts({ cases, contextFilter: 'outreach', branchFilter: 'all', cytologyReviewCount: 0 }, deps());
    expect(out.outreach.totalCount).toBe(out.stats.allBranches);
  });
});
