// src/services/quality/facilityMonthlyTrend.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 504 (PS-470 lint clean-up, a real bug it surfaced): the QA trend
// charts' "last 6 months". Six copies of the same loop (Quality Assurance
// page, Reconciliation, Countersign turnaround, Intra-op linkage, Access
// requests, QA dashboard) put each stored event into a month by the VIEWING
// DEVICE's time zone (new Date().setMonth / getFullYear / getMonth). Someone
// reviewing from another time zone saw an event near midnight on the 1st
// counted in the wrong month. utils/facilityTime.ts already had the
// facility-time helpers for exactly these files (getTrailingFacilityMonths,
// isInFacilityMonth); they had never been wired in. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { getTrailingFacilityMonths, isInFacilityMonth } from '@/utils/facilityTime';

export type MonthlyTrendPoint<P> = { month: string } & P;

/**
 * One point per facility-calendar month, oldest first, for the last `count` months.
 * `dateOf` gives the event's stored timestamp (items without one are left out);
 * `summarise` turns the month's items into the chart values.
 */
export function facilityMonthlyTrend<T, P extends object>(
  items: readonly T[],
  dateOf: (item: T) => string | null | undefined,
  summarise: (inMonth: T[]) => P,
  timezone: string,
  now: Date = new Date(),
  count = 6,
): MonthlyTrendPoint<P>[] {
  return getTrailingFacilityMonths(count, timezone, now).map(range => ({
    month: range.label,
    ...summarise(items.filter(item => isInFacilityMonth(dateOf(item), range, timezone))),
  }));
}

/** Average hours between two stored timestamps over the month's items, to one decimal; null for an empty month. */
export function averageHours<T>(inMonth: T[], from: (item: T) => string, to: (item: T) => string): number | null {
  if (inMonth.length === 0) return null;
  const total = inMonth.reduce((s, item) => s + (new Date(to(item)).getTime() - new Date(from(item)).getTime()) / 3_600_000, 0);
  return +(total / inMonth.length).toFixed(1);
}
