// src/services/autopsy/dashboard/autopsyDashboardCalculations.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#61, #89): the numbers behind the three autopsy dashboard tiers.
// Pure, so every figure on screen is testable. See autopsyDashboardTypes.ts.
// ─────────────────────────────────────────────────────────────────────────────
import type { TATEntry } from '@/types/quality/TatConfigEntry';
import { resolveAutopsyTatSummary, type AutopsyTatResult } from '../resolveAutopsyTatStatus';
import {
  CAUSE_OF_DEATH_CATEGORIES,
  type AutopsyDashboardRecord, type CauseOfDeathCategory, type ConsentKind, type EvaluatedAutopsyRecord,
  type RetentionKind, type TatKpis, type TierSummary,
} from './autopsyDashboardTypes';

export const RETENTION_KINDS: readonly RetentionKind[] = [
  'none', 'tier_0_no_retention', 'tier_1_diagnostic_tissue_only', 'tier_2_full_organ_retention', 'tier_3_education_research_genomic',
];
export const CONSENT_KINDS: readonly ConsentKind[] = ['not_applicable', 'active', 'narrowed', 'revoked'];

export function consentKindOf(rec: AutopsyDashboardRecord): ConsentKind {
  if (rec.autopsy.caseAuthority === 'statutory_judicial') return 'not_applicable';
  return rec.autopsy.hospitalConsent?.status ?? 'active';
}

export function evaluateRecord(rec: AutopsyDashboardRecord, tatEntries: ReadonlyArray<TATEntry>, now: Date): EvaluatedAutopsyRecord {
  return {
    ...rec,
    tat: resolveAutopsyTatSummary({ autopsy: rec.autopsy, startedAt: rec.startedAt, facilityId: rec.facilityId, tatEntries, now }),
    consent: consentKindOf(rec),
    retention: rec.autopsy.organRetentionTier ?? 'none',
  };
}

export function evaluateRecords(records: ReadonlyArray<AutopsyDashboardRecord>, tatEntries: ReadonlyArray<TATEntry>, now: Date): EvaluatedAutopsyRecord[] {
  return records.map(r => evaluateRecord(r, tatEntries, now));
}

/** Records whose body arrived within the last `days` days, or all of them when `days` is null. */
export function withinPeriod<T extends { startedAt: string }>(records: ReadonlyArray<T>, days: number | null, now: Date): T[] {
  if (days === null) return [...records];
  const from = now.getTime() - days * 86_400_000;
  return records.filter(r => Date.parse(r.startedAt) >= from);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function kpisFor(results: AutopsyTatResult[]): TatKpis {
  const within = results.filter(r => r.state === 'met').length;
  const late = results.filter(r => r.state === 'met_late' || r.state === 'overdue').length;
  const decided = within + late;
  return {
    decided,
    within,
    withinPct: decided === 0 ? null : Math.round((within / decided) * 100),
    open: results.filter(r => r.state === 'on_track' || r.state === 'due_soon').length,
    overdue: results.filter(r => r.state === 'overdue').length,
    // Median time to signature, for the reports that were signed.
    medianHours: median(results.filter(r => r.state === 'met' || r.state === 'met_late').map(r => r.elapsedHours)),
  };
}

export function summarizeTier(records: ReadonlyArray<EvaluatedAutopsyRecord>): TierSummary {
  const consent = Object.fromEntries(CONSENT_KINDS.map(k => [k, 0])) as Record<ConsentKind, number>;
  const retention = Object.fromEntries(RETENTION_KINDS.map(k => [k, 0])) as Record<RetentionKind, number>;
  const causeCounts = new Map<CauseOfDeathCategory, number>();
  for (const r of records) {
    consent[r.consent] += 1;
    retention[r.retention] += 1;
    causeCounts.set(r.cause, (causeCounts.get(r.cause) ?? 0) + 1);
  }
  const order: CauseOfDeathCategory[] = [...CAUSE_OF_DEATH_CATEGORIES, 'not_recorded'];
  const causes = order
    .filter(c => (causeCounts.get(c) ?? 0) > 0)
    .map(cause => ({ cause, count: causeCounts.get(cause) ?? 0 }))
    .sort((a, b) => b.count - a.count || order.indexOf(a.cause) - order.indexOf(b.cause));
  return {
    count: records.length,
    pad: kpisFor(records.map(r => r.tat.pad)),
    fad: kpisFor(records.map(r => r.tat.fad)),
    consent,
    retention,
    causes,
    overdueNow: records.filter(r => r.tat.pad.state === 'overdue' || r.tat.fad.state === 'overdue').length,
  };
}

export interface GroupSummary { key: string; label: string; summary: TierSummary }

/** One summary per value of `keyOf` (a facility, a jurisdiction), largest first. */
export function groupSummaries(
  records: ReadonlyArray<EvaluatedAutopsyRecord>,
  keyOf: (r: EvaluatedAutopsyRecord) => { key: string; label: string },
): GroupSummary[] {
  const groups = new Map<string, { label: string; rows: EvaluatedAutopsyRecord[] }>();
  for (const r of records) {
    const { key, label } = keyOf(r);
    const g = groups.get(key) ?? { label, rows: [] };
    g.rows.push(r);
    groups.set(key, g);
  }
  return [...groups.entries()]
    .map(([key, g]) => ({ key, label: g.label, summary: summarizeTier(g.rows) }))
    .sort((a, b) => b.summary.count - a.summary.count || a.label.localeCompare(b.label));
}

/** The department tier: one facility's records. */
export function forFacility(records: ReadonlyArray<EvaluatedAutopsyRecord>, facilityId: string): EvaluatedAutopsyRecord[] {
  return records.filter(r => r.facilityId === facilityId);
}

/** Facilities present in the data, for the department picker. */
export function facilitiesIn(records: ReadonlyArray<AutopsyDashboardRecord>): Array<{ id: string; name: string }> {
  const seen = new Map<string, string>();
  for (const r of records) if (!seen.has(r.facilityId)) seen.set(r.facilityId, r.facilityName);
  return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Cases with a report overdue right now, longest overdue first (for the department tier's action list). */
export function overdueCases(records: ReadonlyArray<EvaluatedAutopsyRecord>, now: Date): Array<{ record: EvaluatedAutopsyRecord; result: AutopsyTatResult; overdueHours: number }> {
  const rows: Array<{ record: EvaluatedAutopsyRecord; result: AutopsyTatResult; overdueHours: number }> = [];
  for (const record of records) {
    for (const result of [record.tat.pad, record.tat.fad]) {
      // Only the report the case is working towards counts as an action; a FAD
      // that is "overdue" before the PAD is signed is not yet anyone's task.
      if (result.state !== 'overdue' || result.tier !== record.tat.current.tier) continue;
      rows.push({ record, result, overdueHours: Math.max(0, Math.floor((now.getTime() - Date.parse(result.deadline)) / 3_600_000)) });
    }
  }
  return rows.sort((a, b) => b.overdueHours - a.overdueHours);
}
