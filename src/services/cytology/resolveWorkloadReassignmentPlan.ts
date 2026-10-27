// src/services/cytology/resolveWorkloadReassignmentPlan.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 635 (PS-189's open item, Pete, Oct 20, 2026). When a cytotechnologist reaches the CLIA daily limit, the rest of their
// queue used to go back to the shared pool. Now each case goes to a named colleague who still has room under their own daily
// cap, the colleague with the most room first, and only as many cases as their room allows; whatever is left goes to the pool.
// Room is the colleague's daily cap less what they have screened in the last 24 hours. Batch 638: a colleague with screening
// time already logged is held to the prorated limit for those hours; one who has not started gets the full cap. Their own save
// is still checked against the prorated limit, so this never lets anyone past it. Pure: no side effects here.
// ─────────────────────────────────────────────────────────────────────────────

import { CLIA_WORKLOAD_FULL_PERIOD_HOURS } from './resolveCytologyWorkloadCapacity';

export interface ReassignmentColleague { userId: string; name: string; remainingScu: number }

export interface ReassignmentPlan {
  /** Case -> colleague, in the order the cases were given. */
  assignments: { caseId: string; userId: string; name: string }[];
  /** Cases nobody had room for. */
  poolCaseIds: string[];
}

/** The weight of one more standard (full manual) review. */
export const REASSIGNED_CASE_SCU = 1;

export function resolveWorkloadReassignmentPlan(caseIds: readonly string[], colleagues: readonly ReassignmentColleague[]): ReassignmentPlan {
  const room = colleagues.map(c => ({ ...c, remainingScu: c.remainingScu }));
  const assignments: ReassignmentPlan['assignments'] = [];
  const poolCaseIds: string[] = [];
  for (const caseId of caseIds) {
    // Most room first; a tie goes to the lower id so the same input always gives the same plan.
    const best = room.filter(c => c.remainingScu >= REASSIGNED_CASE_SCU)
      .sort((a, b) => b.remainingScu - a.remainingScu || a.userId.localeCompare(b.userId))[0];
    if (!best) { poolCaseIds.push(caseId); continue; }
    best.remainingScu -= REASSIGNED_CASE_SCU;
    assignments.push({ caseId, userId: best.userId, name: best.name });
  }
  return { assignments, poolCaseIds };
}

/**
 * A colleague's room: the daily cap less the last 24 hours' screening, never below zero.
 * Batch 638: someone who has already logged screening time is held to the same prorated limit their own saves are checked
 * against (cap x hours logged / 8, never above the cap), so a case is not handed to a colleague who is already over the limit
 * for the hours they have worked. Someone with no time logged yet has not started, and gets the full cap (their own hours
 * count from their first save). The result errs on the side of fewer cases going to a colleague, never more.
 */
export function colleagueRemainingScu(dailySlideCap: number, scuInLast24Hours: number, activeSecondsInLast24Hours = 0): number {
  const limit = activeSecondsInLast24Hours > 0
    ? dailySlideCap * Math.min(activeSecondsInLast24Hours / 3600, CLIA_WORKLOAD_FULL_PERIOD_HOURS) / CLIA_WORKLOAD_FULL_PERIOD_HOURS
    : dailySlideCap;
  return Math.max(0, limit - scuInLast24Hours);
}
