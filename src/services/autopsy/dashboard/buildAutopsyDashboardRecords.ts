// src/services/autopsy/dashboard/buildAutopsyDashboardRecords.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#61, #89): the real autopsy cases, plus (optionally) the Simulated
// ones, as dashboard records. A live case has no structured cause of death
// today, so it counts as "not recorded".
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import { resolveAutopsyClockStart } from '../resolveAutopsyTatStatus';
import { buildSimulatedAutopsyRecords } from './autopsyDashboardSeed';
import type { AutopsyDashboardRecord } from './autopsyDashboardTypes';

export function liveAutopsyRecords(cases: ReadonlyArray<Case>): AutopsyDashboardRecord[] {
  const out: AutopsyDashboardRecord[] = [];
  for (const c of cases) {
    if (!c.autopsy) continue;
    const startedAt = resolveAutopsyClockStart(c);
    if (!startedAt) continue;
    out.push({
      id: c.accession?.fullAccession ?? c.id,
      simulated: false,
      facilityId: c.order?.facilityId ?? 'unknown',
      facilityName: c.order?.facilityName ?? c.order?.facilityId ?? '—',
      jurisdiction: c.autopsy.jurisdiction,
      startedAt,
      autopsy: c.autopsy,
      cause: 'not_recorded',
    });
  }
  return out;
}

export function buildAutopsyDashboardRecords(input: { cases: ReadonlyArray<Case>; includeSimulated: boolean; now: Date }): AutopsyDashboardRecord[] {
  const live = liveAutopsyRecords(input.cases);
  return input.includeSimulated ? [...live, ...buildSimulatedAutopsyRecords(input.now)] : live;
}
