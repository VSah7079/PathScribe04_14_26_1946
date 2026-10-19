// src/services/autopsy/dashboard/autopsyDashboardView.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#61, #89): what the autopsy dashboard page shows for the chosen
// tier, period, department and case. All the choosing lives here so the page
// only renders.
// ─────────────────────────────────────────────────────────────────────────────
import type { TATEntry } from '@/types/quality/TatConfigEntry';
import {
  evaluateRecords, facilitiesIn, forFacility, groupSummaries, overdueCases, summarizeTier, withinPeriod,
  type GroupSummary,
} from './autopsyDashboardCalculations';
import type { AutopsyDashboardRecord, EvaluatedAutopsyRecord, TierSummary } from './autopsyDashboardTypes';

export type AutopsyDashboardTier = 'case' | 'department' | 'enterprise';
export type AutopsyDashboardPeriod = '30' | '90' | '365' | 'all';

export interface AutopsyDashboardQuery {
  records: ReadonlyArray<AutopsyDashboardRecord>;
  tatEntries: ReadonlyArray<TATEntry>;
  tier: AutopsyDashboardTier;
  period: AutopsyDashboardPeriod;
  /** Department tier: the facility chosen; defaults to the first one present. */
  facilityId?: string;
  /** Case tier: the case chosen; defaults to the most recent. */
  caseId?: string;
  now: Date;
}

export interface AutopsyDashboardView {
  tier: AutopsyDashboardTier;
  facilities: Array<{ id: string; name: string }>;
  /** Cases in the period, newest first, for the case picker. */
  cases: Array<{ id: string; simulated: boolean }>;
  /** The aggregate for the tier (case tier: the one case). */
  summary: TierSummary;
  /** Case tier. */
  selectedCase: EvaluatedAutopsyRecord | null;
  /** Department tier. */
  selectedFacilityId: string | null;
  overdue: ReturnType<typeof overdueCases>;
  /** Enterprise tier. */
  byFacility: GroupSummary[];
  byJurisdiction: GroupSummary[];
  simulatedCount: number;
}

export function periodDays(p: AutopsyDashboardPeriod): number | null {
  return p === 'all' ? null : Number(p);
}

export function buildAutopsyDashboardView(q: AutopsyDashboardQuery): AutopsyDashboardView {
  const inPeriod = withinPeriod(q.records, periodDays(q.period), q.now);
  const evaluated = evaluateRecords(inPeriod, q.tatEntries, q.now);
  const newestFirst = [...evaluated].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const facilities = facilitiesIn(inPeriod);
  const selectedFacilityId = q.tier === 'department' ? (q.facilityId && facilities.some(f => f.id === q.facilityId) ? q.facilityId : facilities[0]?.id ?? null) : null;
  const selectedCase = q.tier === 'case' ? (newestFirst.find(r => r.id === q.caseId) ?? newestFirst[0] ?? null) : null;

  const scope =
    q.tier === 'case' ? (selectedCase ? [selectedCase] : [])
    : q.tier === 'department' ? (selectedFacilityId ? forFacility(evaluated, selectedFacilityId) : [])
    : evaluated;

  return {
    tier: q.tier,
    facilities,
    cases: newestFirst.map(r => ({ id: r.id, simulated: r.simulated })),
    summary: summarizeTier(scope),
    selectedCase,
    selectedFacilityId,
    overdue: q.tier === 'department' ? overdueCases(scope, q.now) : [],
    byFacility: q.tier === 'enterprise' ? groupSummaries(evaluated, r => ({ key: r.facilityId, label: r.facilityName })) : [],
    byJurisdiction: q.tier === 'enterprise' ? groupSummaries(evaluated, r => ({ key: r.jurisdiction, label: r.jurisdiction })) : [],
    simulatedCount: inPeriod.filter(r => r.simulated).length,
  };
}
