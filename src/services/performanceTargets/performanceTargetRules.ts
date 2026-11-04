// src/services/performanceTargets/performanceTargetRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#87): the rules for performance targets (cases and RVUs per
// period) and for judging a person's progress against one. Pure: today's
// date is passed in.
//
// A "count" target (cases, RVUs) is met when the period's total reaches it.
// Part-way through a period the person is "on track" while the total keeps
// pace with a straight line to the target, and "behind" when it does not; once
// the period has ended the answer is only "met" or "missed".
// ─────────────────────────────────────────────────────────────────────────────
import type { PerformanceTarget, TargetPeriod, TargetUnit } from './IPerformanceTargetService';

export type PerformanceTargetProblem = 'labelRequired' | 'valueInvalid' | 'percentOutOfRange' | 'duplicateKey';

export type TargetProgressState = 'met' | 'onTrack' | 'behind' | 'missed';

export const TARGET_UNITS: readonly TargetUnit[] = ['cases', 'RVUs', '%', 'hours'];
export const TARGET_PERIODS: readonly TargetPeriod[] = ['daily', 'weekly', 'monthly', 'quarterly', 'annually'];

/** The targets the Productivity dashboard measures a person against. */
export const DASHBOARD_TARGET_KEYS = ['cases_monthly', 'rvu_monthly'] as const;

/** Turns a label into the stable key a target is looked up by. */
export function targetKeyFromLabel(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
}

export function validatePerformanceTarget(
  draft: Pick<PerformanceTarget, 'label' | 'value' | 'unit' | 'period'> & { key?: string; id?: string },
  existing: readonly PerformanceTarget[],
): PerformanceTargetProblem | null {
  if (!draft.label.trim()) return 'labelRequired';
  if (!Number.isFinite(draft.value) || draft.value <= 0) return 'valueInvalid';
  if (draft.unit === '%' && draft.value > 100) return 'percentOutOfRange';
  const key = draft.key ?? targetKeyFromLabel(draft.label);
  if (existing.some(t => t.key === key && t.id !== draft.id)) return 'duplicateKey';
  return null;
}

/** Whether a bigger number is better (cases, RVUs, percentages) or a smaller one (hours). */
export function higherIsBetter(unit: TargetUnit): boolean {
  return unit !== 'hours';
}

export interface PeriodBounds { start: Date; end: Date }

/** The calendar period holding `now` (weeks start on Monday), in the computer's time. */
export function periodBounds(period: TargetPeriod, now: Date): PeriodBounds {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  switch (period) {
    case 'daily': return { start: new Date(y, m, d), end: new Date(y, m, d + 1) };
    case 'weekly': {
      const back = (now.getDay() + 6) % 7;
      return { start: new Date(y, m, d - back), end: new Date(y, m, d - back + 7) };
    }
    case 'monthly': return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
    case 'quarterly': {
      const q = Math.floor(m / 3) * 3;
      return { start: new Date(y, q, 1), end: new Date(y, q + 3, 1) };
    }
    case 'annually': return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
  }
}

/** The period just before the one holding `now`. */
export function previousPeriodBounds(period: TargetPeriod, now: Date): PeriodBounds {
  const current = periodBounds(period, now);
  return periodBounds(period, new Date(current.start.getTime() - 1));
}

export interface TargetProgress {
  state: TargetProgressState;
  actual: number;
  target: number;
  /** actual / target as a whole percentage (not capped). */
  pct: number;
}

/**
 * Judges a total against a count target.
 * `final` is true for a period that has already ended.
 */
export function evaluateCountTarget(actual: number, target: number, bounds: PeriodBounds, now: Date, final: boolean): TargetProgress {
  const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
  if (actual >= target) return { state: 'met', actual, target, pct };
  if (final) return { state: 'missed', actual, target, pct };
  const span = bounds.end.getTime() - bounds.start.getTime();
  const elapsed = Math.min(Math.max(now.getTime() - bounds.start.getTime(), 0), span);
  const expected = span > 0 ? target * (elapsed / span) : target;
  return { state: actual >= expected ? 'onTrack' : 'behind', actual, target, pct };
}

export interface DatedAmount { at: string | undefined; amount: number }

/** Adds up the amounts dated inside [start, end). */
export function totalInPeriod(items: readonly DatedAmount[], bounds: PeriodBounds): number {
  let sum = 0;
  for (const i of items) {
    if (!i.at) continue;
    const t = new Date(i.at).getTime();
    if (!isNaN(t) && t >= bounds.start.getTime() && t < bounds.end.getTime()) sum += i.amount;
  }
  return Math.round(sum * 10) / 10;
}

export interface TargetProgressRow {
  target: PerformanceTarget;
  current: TargetProgress;
  previous: TargetProgress;
}

/**
 * Progress for each dashboard target. `amountsByKey` holds the dated amounts for
 * a target key (one entry per signed-out case for 'cases_monthly', one per case
 * worth its RVUs for 'rvu_monthly'). A target with no amounts supplied is left out.
 */
export function buildTargetProgress(
  targets: readonly PerformanceTarget[],
  amountsByKey: Readonly<Record<string, readonly DatedAmount[]>>,
  now: Date,
): TargetProgressRow[] {
  const rows: TargetProgressRow[] = [];
  for (const target of targets) {
    const amounts = amountsByKey[target.key];
    if (!amounts) continue;
    if (target.unit !== 'cases' && target.unit !== 'RVUs') continue;
    const cur = periodBounds(target.period, now);
    const prev = previousPeriodBounds(target.period, now);
    rows.push({
      target,
      current: evaluateCountTarget(totalInPeriod(amounts, cur), target.value, cur, now, false),
      previous: evaluateCountTarget(totalInPeriod(amounts, prev), target.value, prev, now, true),
    });
  }
  return rows;
}

/** The audit entry for a change to a target (numbers only: no person or case). */
export function performanceTargetAudit(
  action: 'added' | 'changed' | 'removed',
  target: Pick<PerformanceTarget, 'label' | 'value' | 'unit' | 'period'>,
  actorName: string,
  previous?: Pick<PerformanceTarget, 'value' | 'unit' | 'period'>,
) {
  const now = `${target.value} ${target.unit} per ${target.period}`;
  const detail = action === 'changed' && previous
    ? `Performance target "${target.label}" changed from ${previous.value} ${previous.unit} per ${previous.period} to ${now}.`
    : `Performance target "${target.label}" ${action} (${now}).`;
  return { type: 'user' as const, event: 'PERFORMANCE_TARGET_CHANGED', caseId: null, user: actorName, confidence: null, detail };
}
