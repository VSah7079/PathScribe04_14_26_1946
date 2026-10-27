// src/services/worklist/worklistTileCounts.ts
// ─────────────────────────────────────────────────────────────────────────────
// The Worklist's tile counts and the list each tile opens, in one pure place
// (Batch 450; moved out of WorklistPage.tsx under CLAUDE.md rule 2). Keeping
// the count and the list side by side is the point: a tile's number is only
// right if it counts the same cases its click shows.
//
// Rules carried over unchanged from the page:
//   • PS-307: the status tiles (Urgent, In Progress, Draft, DP, ...) count the
//     branch-filtered population, because the list applies the selected branch
//     (Surg Path / Cytology / Autopsy) before any status filter. The branch
//     TABS (All Cases, Surg Path, Cytology, Autopsy) count every branch, or
//     all four would collapse to the selected branch's number.
//   • PS-305: the LIS Cases and Outreach tiles count assigned AND pool cases,
//     so they answer the same question "All Cases" does.
//   • PS-309: closed by the PS-307 fix (the DP tile is a status tile).
//
// Pure: everything that varies (access check, specimen dictionary, the
// viewer, the clock, the asynchronously loaded id sets) is passed in.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { SpecimenEntry } from '@/services/specimenDictionary/specimenTypes';
import { resolveCaseDisciplineBranch, type CaseDisciplineBranch } from '@/services/specimenDictionary/resolveCaseDisciplineBranch';
import { resolveCaseHasSpecimenCategory } from '@/services/specimenDictionary/resolveCaseHasSpecimenCategory';
import { getFacilityDateParts } from '@/utils/facilityTime';
import { isUrgentCase } from '@/utils/caseUrgency';

export type WorklistContextFilter = 'lis' | 'outreach';
export type WorklistBranchFilter = 'all' | CaseDisciplineBranch;
export type WorklistActiveFilter =
  | 'all' | 'completed' | 'urgent' | 'physician' | 'pool' | 'delegated' | 'inprogress' | 'amended'
  | 'draft' | 'finalizing' | 'accessioned' | 'grosscomplete' | 'countersign' | 'pendingrelease'
  | 'needsrevision' | 'informalreview' | 'peerreview' | 'cytologyreview' | 'onhold' | 'dp'
  | 'gyncyto' | 'nongyncyto' | 'autopsy' | 'newcases' | 'followup' | 'collaborating';

export type SpecimenDictionaryLite = Pick<SpecimenEntry, 'id' | 'specimenCategory'>[];

/** Any Set or Map keyed by case id. */
export interface CaseIdLookup { has(caseId: string): boolean }

/** Everything the counts and the list depend on besides the cases themselves. */
export interface WorklistCountDeps {
  specimenDictionary: SpecimenDictionaryLite;
  userId: string | undefined;
  viewedCaseIds: CaseIdLookup;
  amendmentAddendaCaseIds: CaseIdLookup;
  informalReviewCaseIds: CaseIdLookup;
  peerReviewCaseIds: CaseIdLookup;
  /** Batch 454: cases with a follow-up due soon or overdue (services/followUp). */
  followUpCaseIds?: CaseIdLookup;
  delegatedCaseIds: readonly string[];
  wsiSlidesByCaseId: CaseIdLookup;
  dpResultByCaseId: CaseIdLookup;
  facilityTimezone: string;
  now: Date;
}

// Fields some cases carry that the Case type reaches through nested shapes.
type LooseCase = Case & {
  participants?: { status?: string; staffId?: string; participationTypeIds?: string[] }[];
  order?: { assignedTo?: string; requestingProvider?: string };
};

export function resolveWorklistCaseBranch(c: Case, specimenDictionary: SpecimenDictionaryLite): CaseDisciplineBranch {
  return resolveCaseDisciplineBranch(c.specimens, specimenDictionary, !!c.autopsy);
}

/** LIS = everything not reported through Orchestration (Outreach). */
export function splitByReportingMode(cases: readonly Case[]): { lisCases: Case[]; orchCases: Case[] } {
  return {
    lisCases: cases.filter(c => c.reportingMode !== 'orchestrator'),
    orchCases: cases.filter(c => c.reportingMode === 'orchestrator'),
  };
}

export function filterCasesToBranch(cases: readonly Case[], branch: WorklistBranchFilter, specimenDictionary: SpecimenDictionaryLite): Case[] {
  return branch === 'all' ? [...cases] : cases.filter(c => resolveWorklistCaseBranch(c, specimenDictionary) === branch);
}

/** Finalized today in the facility's own timezone ("Completed Today"). */
export function isFinalizedToday(c: Case, facilityTimezone: string, now: Date): boolean {
  if (c.status !== 'finalized' || !c.updatedAt) return false;
  const u = getFacilityDateParts(c.updatedAt, facilityTimezone);
  const d = getFacilityDateParts(now, facilityTimezone);
  return u.year === d.year && u.month === d.month && u.day === d.day;
}

/** DP-relevant: has digital slide data, an AI screening result, or both. */
export function isDpRelevantCase(c: Case, deps: Pick<WorklistCountDeps, 'wsiSlidesByCaseId' | 'dpResultByCaseId'>): boolean {
  return deps.wsiSlidesByCaseId.has(c.id) || deps.dpResultByCaseId.has(c.id);
}

function awaitsMyCountersign(c: LooseCase, userId: string | undefined): boolean {
  return c.status === 'pending-countersign'
    && !!c.participants?.some(p => p.status === 'active' && p.staffId === userId && p.participationTypeIds?.includes('attending'));
}
/** Batch 660 (Pete): "Collaborating Cases" = an active member of the case's team roster, finalized and closed cases left out. */
export function isCollaboratingCase(c: LooseCase, userId: string | undefined): boolean {
  return !!userId && c.status !== 'finalized' && c.status !== 'closed'
    && !!c.participants?.some(p => p.status === 'active' && p.staffId === userId);
}
function awaitsMyRelease(c: Case, userId: string | undefined): boolean {
  return c.status === 'pending-release' && c.finalizedBy === userId;
}
function needsRevisionForMe(c: LooseCase, userId: string | undefined): boolean {
  return c.status === 'returned' && (c.order?.assignedTo === userId || c.returnedBy === userId);
}

/**
 * Does one case belong in the list for a status filter (branch already
 * applied)? Restricted cases are not excluded here; the table shows them
 * redacted so the viewer can request access.
 */
export function matchesWorklistFilter(
  c: Case,
  activeFilter: Exclude<WorklistActiveFilter, 'cytologyreview'>,
  physicianFilter: string,
  deps: WorklistCountDeps,
): boolean {
  const lc = c as LooseCase;
  if (activeFilter === 'pool')       return c.status === 'pool';
  if (activeFilter === 'all')        return true;
  // Specialty and "new" filters come before the pool catch-all: pool cases qualify.
  if (activeFilter === 'gyncyto')    return resolveCaseHasSpecimenCategory(c.specimens, deps.specimenDictionary, 'GYN_CYTOLOGY');
  if (activeFilter === 'nongyncyto') return resolveCaseHasSpecimenCategory(c.specimens, deps.specimenDictionary, 'NON_GYN_CYTOLOGY');
  if (activeFilter === 'autopsy')    return !!c.autopsy;
  if (activeFilter === 'newcases')   return !deps.viewedCaseIds.has(c.id);
  if (c.status === 'pool')           return activeFilter === 'urgent' && isUrgentCase(c);
  if (activeFilter === 'urgent')     return isUrgentCase(c);
  if (activeFilter === 'draft')      return c.status === 'draft';
  if (activeFilter === 'inprogress') return c.status === 'in-progress';
  if (activeFilter === 'finalizing') return c.status === 'finalizing';
  if (activeFilter === 'amended')    return deps.amendmentAddendaCaseIds.has(c.id);
  if (activeFilter === 'informalreview') return deps.informalReviewCaseIds.has(c.id);
  if (activeFilter === 'peerreview') return deps.peerReviewCaseIds.has(c.id);
  if (activeFilter === 'followup')   return !!deps.followUpCaseIds?.has(c.id);
  if (activeFilter === 'accessioned')   return c.status === 'accessioned';
  if (activeFilter === 'grosscomplete') return c.status === 'gross-complete';
  if (activeFilter === 'onhold')        return (c.caseHolds ?? []).some(h => h.active);
  if (activeFilter === 'dp')            return isDpRelevantCase(c, deps);
  if (activeFilter === 'physician')  return (lc.order?.requestingProvider ?? '').toLowerCase().includes(physicianFilter.toLowerCase());
  if (activeFilter === 'completed')  return isFinalizedToday(c, deps.facilityTimezone, deps.now);
  if (activeFilter === 'delegated')  return deps.delegatedCaseIds.includes(c.id);
  if (activeFilter === 'countersign')    return awaitsMyCountersign(lc, deps.userId);
  if (activeFilter === 'collaborating')  return isCollaboratingCase(lc, deps.userId);
  if (activeFilter === 'pendingrelease') return awaitsMyRelease(c, deps.userId);
  if (activeFilter === 'needsrevision')  return needsRevisionForMe(lc, deps.userId);
  return true;
}

export interface WorklistListInput {
  /** Every loaded case, both reporting modes. */
  cases: readonly Case[];
  contextFilter: WorklistContextFilter;
  branchFilter: WorklistBranchFilter;
  activeFilter: WorklistActiveFilter;
  physicianFilter: string;
  cytologyReviewCases: readonly Case[];
}

/** The list a tile opens: context, then branch, then status filter. */
export function filterWorklistCases(input: WorklistListInput, deps: WorklistCountDeps): Case[] {
  if (input.activeFilter === 'cytologyreview') return [...input.cytologyReviewCases];
  const { lisCases, orchCases } = splitByReportingMode(input.cases);
  const source = input.contextFilter === 'outreach' ? orchCases : lisCases;
  const filter = input.activeFilter;
  return filterCasesToBranch(source, input.branchFilter, deps.specimenDictionary)
    .filter(c => matchesWorklistFilter(c, filter, input.physicianFilter, deps));
}

export interface ModeTileCounts {
  /** Assigned (non-pool) cases. */
  assignedCount: number;
  /** Urgent assigned cases (the tile's Urgent badge). */
  urgentCount: number;
  poolCount: number;
  /** What the tile shows: assigned + pool (PS-305). */
  totalCount: number;
  hasUrgentPool: boolean;
}

export interface WorklistStatusStats {
  total: number;
  pool: number;
  outreach: number;
  urgent: number;
  inProgress: number;
  amended: number;
  informalReview: number;
  peerReview: number;
  /** Batch 454: follow-ups due soon or overdue. */
  followUp: number;
  cytologyReview: number;
  draft: number;
  finalizing: number;
  accessioned: number;
  grossComplete: number;
  onHold: number;
  dpRelevant: number;
  gynCytology: number;
  nonGynCytology: number;
  /** Doubles as the Autopsy branch tab count: branch-unfiltered. */
  autopsy: number;
  newCases: number;
  /** Branch tab counts: branch-unfiltered. */
  cytologyBranch: number;
  surgpathBranch: number;
  allBranches: number;
  completedToday: number;
}

export interface WorklistTileCounts {
  lis: ModeTileCounts;
  outreach: ModeTileCounts;
  stats: WorklistStatusStats;
  /** Urgent cases waiting in the pool (the Urgent tile's "in pool" sublabel). */
  urgentPoolCount: number;
  hasUrgentNewCase: boolean;
  countersignPendingCount: number;
  collaboratingCount: number;
  pendingReleaseCount: number;
  needsRevisionCount: number;
}

export interface WorklistCountInput {
  cases: readonly Case[];
  contextFilter: WorklistContextFilter;
  branchFilter: WorklistBranchFilter;
  cytologyReviewCount: number;
}

export function computeWorklistTileCounts(input: WorklistCountInput, deps: WorklistCountDeps): WorklistTileCounts {
  // Batch 452 (Pete, Oct 4 2026): every count matches the rows its list
  // shows. A restricted case (pediatric / Orchestration access) appears in
  // the list as a redacted row, so it is counted too. Before, most tiles left
  // restricted cases out (reading lower than their list) while the LIS pool
  // and Outreach counts kept them (so those could exceed All Cases).
  const { specimenDictionary, userId, viewedCaseIds } = deps;
  const { lisCases, orchCases } = splitByReportingMode(input.cases);

  // LIS tile: assigned cases plus pool cases, as the list shows them.
  const lisAssigned = lisCases.filter(c => c.status !== 'pool');
  const lisPool = lisCases.filter(c => c.status === 'pool');
  const lis: ModeTileCounts = {
    assignedCount: lisAssigned.length,
    urgentCount: lisAssigned.filter(isUrgentCase).length,
    poolCount: lisPool.length,
    totalCount: lisAssigned.length + lisPool.length,
    hasUrgentPool: lisPool.some(isUrgentCase),
  };
  // Outreach tile: assigned plus pool.
  const orchAssigned = orchCases.filter(c => c.status !== 'pool');
  const orchPool = orchCases.filter(c => c.status === 'pool');
  const outreach: ModeTileCounts = {
    assignedCount: orchAssigned.length,
    urgentCount: orchAssigned.filter(isUrgentCase).length,
    poolCount: orchPool.length,
    totalCount: orchAssigned.length + orchPool.length,
    hasUrgentPool: orchPool.some(isUrgentCase),
  };

  const allBranchCases = input.contextFilter === 'outreach' ? orchCases : lisCases;
  const statsCases = filterCasesToBranch(allBranchCases, input.branchFilter, specimenDictionary);
  const nonPoolStats = statsCases.filter(c => c.status !== 'pool');
  const branchOf = (c: Case) => resolveWorklistCaseBranch(c, specimenDictionary);

  const stats: WorklistStatusStats = {
    total:          nonPoolStats.length,
    pool:           statsCases.filter(c => c.status === 'pool').length,
    outreach:       orchCases.length,
    urgent:         nonPoolStats.filter(isUrgentCase).length,
    inProgress:     nonPoolStats.filter(c => c.status === 'in-progress').length,
    amended:        nonPoolStats.filter(c => deps.amendmentAddendaCaseIds.has(c.id)).length,
    informalReview: nonPoolStats.filter(c => deps.informalReviewCaseIds.has(c.id)).length,
    peerReview:     nonPoolStats.filter(c => deps.peerReviewCaseIds.has(c.id)).length,
    followUp:       nonPoolStats.filter(c => !!deps.followUpCaseIds?.has(c.id)).length,
    cytologyReview: input.cytologyReviewCount,
    draft:          nonPoolStats.filter(c => c.status === 'draft').length,
    finalizing:     nonPoolStats.filter(c => c.status === 'finalizing').length,
    accessioned:    nonPoolStats.filter(c => c.status === 'accessioned').length,
    grossComplete:  nonPoolStats.filter(c => c.status === 'gross-complete').length,
    onHold:         nonPoolStats.filter(c => (c.caseHolds ?? []).some(h => h.active)).length,
    dpRelevant:     nonPoolStats.filter(c => isDpRelevantCase(c, deps)).length,
    // Specialty and "new" tiles include pool cases, like their lists.
    gynCytology:    statsCases.filter(c => resolveCaseHasSpecimenCategory(c.specimens, specimenDictionary, 'GYN_CYTOLOGY')).length,
    nonGynCytology: statsCases.filter(c => resolveCaseHasSpecimenCategory(c.specimens, specimenDictionary, 'NON_GYN_CYTOLOGY')).length,
    autopsy:        allBranchCases.filter(c => !!c.autopsy).length,
    newCases:       statsCases.filter(c => !viewedCaseIds.has(c.id)).length,
    cytologyBranch: allBranchCases.filter(c => branchOf(c) === 'cytology').length,
    surgpathBranch: allBranchCases.filter(c => branchOf(c) === 'surgpath').length,
    allBranches:    allBranchCases.length,
    completedToday: nonPoolStats.filter(c => isFinalizedToday(c, deps.facilityTimezone, deps.now)).length,
  };

  return {
    lis,
    outreach,
    stats,
    urgentPoolCount: statsCases.filter(c => c.status === 'pool' && isUrgentCase(c)).length,
    hasUrgentNewCase: statsCases.some(c => !viewedCaseIds.has(c.id) && isUrgentCase(c)),
    countersignPendingCount: statsCases.filter(c => awaitsMyCountersign(c as LooseCase, userId)).length,
    collaboratingCount: statsCases.filter(c => isCollaboratingCase(c as LooseCase, userId)).length,
    pendingReleaseCount: statsCases.filter(c => awaitsMyRelease(c, userId)).length,
    needsRevisionCount: statsCases.filter(c => needsRevisionForMe(c as LooseCase, userId)).length,
  };
}
