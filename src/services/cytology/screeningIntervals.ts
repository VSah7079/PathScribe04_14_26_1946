// src/services/cytology/screeningIntervals.ts
// Batch 608 (#52): the per-country, per-age screening interval table and the
// interval adherence it gives EU-QA-01. A woman is "on schedule" when her
// current screen follows her previous one within the interval for her country
// and age, plus a grace period. The seed values are starting points for a lab
// to check against its own programme; they are edited in Configuration →
// Cytology → Country and laboratory rules.

export interface ScreeningIntervalRule {
  countryCode: string;
  /** Inclusive age band the interval applies to. */
  minAge: number;
  maxAge: number;
  intervalMonths: number;
}

export const DEFAULT_SCREENING_INTERVALS: ScreeningIntervalRule[] = [
  { countryCode: 'GB_EW', minAge: 25, maxAge: 49, intervalMonths: 36 },
  { countryCode: 'GB_EW', minAge: 50, maxAge: 64, intervalMonths: 60 },
  { countryCode: 'FR', minAge: 25, maxAge: 29, intervalMonths: 36 },
  { countryCode: 'FR', minAge: 30, maxAge: 65, intervalMonths: 60 },
  { countryCode: 'DE', minAge: 20, maxAge: 34, intervalMonths: 12 },
  { countryCode: 'DE', minAge: 35, maxAge: 120, intervalMonths: 36 },
  { countryCode: 'NL', minAge: 30, maxAge: 60, intervalMonths: 60 },
  { countryCode: 'BE', minAge: 25, maxAge: 64, intervalMonths: 36 },
  { countryCode: 'IE', minAge: 25, maxAge: 29, intervalMonths: 36 },
  { countryCode: 'IE', minAge: 30, maxAge: 65, intervalMonths: 60 },
];

/** Months of slack allowed beyond the interval before a screen counts as late. */
export const SCREENING_INTERVAL_GRACE_MONTHS = 3;

export function intervalMonthsFor(rules: ScreeningIntervalRule[], countryCode: string, ageYears: number): number | undefined {
  return rules.find(r => r.countryCode === countryCode && ageYears >= r.minAge && ageYears <= r.maxAge)?.intervalMonths;
}

function wholeYearsBetween(from: Date, to: Date): number {
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  const beforeBirthday = to.getUTCMonth() < from.getUTCMonth() || (to.getUTCMonth() === from.getUTCMonth() && to.getUTCDate() < from.getUTCDate());
  if (beforeBirthday) years -= 1;
  return years;
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (30.4375 * 86_400_000);
}

export interface ScreeningAdherenceInput {
  countryCode: string;
  /** Date of birth, YYYY-MM-DD. */
  dateOfBirth?: string;
  /** This screen's collection date. */
  screenedAt?: string;
  /** The patient's previous screen before this one, if any. */
  previousScreenAt?: string;
}

export interface ScreeningAdherence {
  /** Screens with a previous screen, an age and a rule: the ones that can be judged. */
  evaluated: number;
  onSchedule: number;
  /** undefined when nothing could be judged: a dash, not 0%. */
  adherencePercent: number | undefined;
}

export function resolveScreeningIntervalAdherence(
  inputs: ScreeningAdherenceInput[], rules: ScreeningIntervalRule[], graceMonths: number = SCREENING_INTERVAL_GRACE_MONTHS,
): Record<string, ScreeningAdherence> {
  const byCountry: Record<string, { evaluated: number; onSchedule: number }> = {};
  for (const i of inputs) {
    byCountry[i.countryCode] ??= { evaluated: 0, onSchedule: 0 };
    if (!i.dateOfBirth || !i.screenedAt || !i.previousScreenAt) continue;
    const dob = new Date(i.dateOfBirth), now = new Date(i.screenedAt), prev = new Date(i.previousScreenAt);
    if ([dob, now, prev].some(d => Number.isNaN(d.getTime()))) continue;
    // The interval that applied when the previous screen was taken.
    const interval = intervalMonthsFor(rules, i.countryCode, wholeYearsBetween(dob, prev));
    if (interval === undefined) continue;
    byCountry[i.countryCode].evaluated += 1;
    if (monthsBetween(prev, now) <= interval + graceMonths) byCountry[i.countryCode].onSchedule += 1;
  }
  return Object.fromEntries(Object.entries(byCountry).map(([code, v]) => [code, {
    ...v, adherencePercent: v.evaluated === 0 ? undefined : (v.onSchedule / v.evaluated) * 100,
  }]));
}
