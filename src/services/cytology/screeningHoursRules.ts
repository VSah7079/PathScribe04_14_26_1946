// src/services/cytology/screeningHoursRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 572 (Pete, Oct 14, 2026; DEPLOYMENT_READINESS_REVIEW.md F7, option C):
// the rules for a cytotechnologist's end-of-day sign-off of screening hours.
//
//   - A day is the lab's day: the facility time zone, starting at the lab's
//     set hour (Batch 574, Pete: midnight by default; 6 am puts a night
//     shift on one date).
//   - Batch 574 (Pete, Oct 15): today and yesterday can be signed off, so a
//     night shift that crosses the start of the day signs off both parts.
//   - Recorded hours for a day: the server's figure from its own screening
//     events (CYTOLOGY_QC_API.md §5). In the demo, the workload ledger's
//     active seconds for that day stand in for it.
//   - A sign-off confirms the recorded figure, or corrects it with a reason.
//   - A correction more than SCREENING_HOURS_FLAG_TOLERANCE_HOURS from the
//     recorded figure is flagged for the supervisor (the server makes the
//     tolerance a lab setting).
//   - The hours that count for the day: the latest sign-off, else the
//     recorded figure.
// Pure: tested directly.
// ─────────────────────────────────────────────────────────────────────────────
import { SCREENING_HOURS_NOTE_MAX, type CytologyScreeningHoursSignOff, type ScreeningHoursReason } from '@/types/cytology/CytologyScreeningHoursSignOff';
import { getFacilityDateTimeParts } from '@/utils/facilityTime';

export const SCREENING_HOURS_FLAG_TOLERANCE_HOURS = 0.5;
export const MAX_SCREENING_HOURS_PER_DAY = 24;
/** Hours are shown and compared to one decimal (6.04 and 6.0 are the same figure on screen). */
export const roundHours = (h: number) => Math.round(h * 10) / 10;

/** Batch 574: when the lab's day starts: one hour for all time, or the history of changes (each from an instant). */
export type DayStart = number | readonly { hour: number; effectiveFrom: string }[];

/** Batch 574: the start hour in force at an instant (a change applies from the moment it was made). */
export function dayStartHourAt(dayStart: DayStart, iso: string | Date): number {
  if (typeof dayStart === 'number') return normaliseDayStartHour(dayStart);
  const at = typeof iso === 'string' ? iso : iso.toISOString();
  let hour = 0;
  for (const c of dayStart) if (c.effectiveFrom <= at) hour = normaliseDayStartHour(c.hour);
  return hour;
}

/** Batch 574: the hour (0–23, the lab's local time) a screening day starts; anything else means midnight. */
export function normaliseDayStartHour(hour: unknown): number {
  return typeof hour === 'number' && Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 0;
}

const isoDate = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);

/** The day before a YYYY-MM-DD day (calendar arithmetic only, no time zone involved). */
export function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return isoDate(y, m - 1, d - 1);
}

/**
 * The lab's day, YYYY-MM-DD, for an instant: the facility's time zone (never the viewing device's), and a day
 * that starts at `dayStartHour` (Batch 574). With 6, 05:59 on the 15th belongs to the 14th.
 */
export function screeningDay(iso: string | Date, timezone: string, dayStart: DayStart = 0): string {
  const p = getFacilityDateTimeParts(iso, timezone);
  const today = isoDate(p.year, p.month, p.day);
  return p.hour < dayStartHourAt(dayStart, iso) ? previousDay(today) : today;
}

/** Batch 574: the days a person may sign off: the lab's today, and yesterday (a night shift's first part). */
export function signOffDays(now: string | Date, timezone: string, dayStart: DayStart = 0): { today: string; yesterday: string } {
  const today = screeningDay(now, timezone, dayStart);
  return { today, yesterday: previousDay(today) };
}

/** Hours recorded for a person's day, from entries carrying seconds (demo: the workload ledger). */
export function recordedHoursForDay(entries: readonly { userId: string; completedAt: string; activeDurationSeconds: number }[], userId: string, day: string, timezone: string, dayStart: DayStart = 0): number {
  const seconds = entries.filter(e => e.userId === userId && screeningDay(e.completedAt, timezone, dayStart) === day).reduce((s, e) => s + (e.activeDurationSeconds || 0), 0);
  return hoursFromSeconds(seconds);
}

/** Recorded hours from seconds, kept to two decimals: the panel and the report use the same figure. */
export const hoursFromSeconds = (seconds: number) => Math.round((seconds / 3600) * 100) / 100;

/** Batch 574: the start-of-day schedule from the workload settings (history, else the one hour, else midnight). */
export function dayStartFromSettings(s: { screeningDayStartHour?: number; screeningDayStartHistory?: readonly { hour: number; effectiveFrom: string }[] } | null | undefined): DayStart {
  if (s?.screeningDayStartHistory?.length) return s.screeningDayStartHistory;
  return normaliseDayStartHour(s?.screeningDayStartHour);
}

/** A sign-off that changes the figure as shown (one decimal) is a correction. */
export const isCorrection = (recorded: number, signed: number) => roundHours(signed) !== roundHours(recorded);
export const isFlagged = (recorded: number, signed: number) => Math.abs(signed - recorded) > SCREENING_HOURS_FLAG_TOLERANCE_HOURS;

export type SignOffProblem = 'hoursInvalid' | 'reasonRequired' | 'noteRequired' | 'noteTooLong';

/** What's wrong with a sign-off before it is saved, or null. */
export function signOffProblem(recorded: number, signed: number, reasonId: ScreeningHoursReason | undefined, note: string | undefined): SignOffProblem | null {
  if (!Number.isFinite(signed) || signed < 0 || signed > MAX_SCREENING_HOURS_PER_DAY) return 'hoursInvalid';
  if (!isCorrection(recorded, signed)) return null;
  if (!reasonId) return 'reasonRequired';
  if (reasonId === 'other' && !note?.trim()) return 'noteRequired';
  if ((note?.trim().length ?? 0) > SCREENING_HOURS_NOTE_MAX) return 'noteTooLong';
  return null;
}

/** The latest sign-off for a person and day (records are append-only). */
export function latestSignOff(records: readonly CytologyScreeningHoursSignOff[], userId: string, day: string): CytologyScreeningHoursSignOff | null {
  return records.filter(r => r.userId === userId && r.date === day).sort((a, b) => b.signedAt.localeCompare(a.signedAt))[0] ?? null;
}

/**
 * A sign-off is out of date when more screening was recorded after it (someone confirmed at 2 pm and kept
 * working): the recorded figure no longer matches the one they signed against. It then doesn't count, and the
 * person is asked to sign off again.
 */
export function isSignOffStale(signOff: CytologyScreeningHoursSignOff | null, recordedNow: number): boolean {
  return !!signOff && isCorrection(signOff.recordedHours, recordedNow);
}

/** The hours that count for a person's day: the latest sign-off while it is current, else the recorded figure. */
export function hoursThatCount(recorded: number, signOff: CytologyScreeningHoursSignOff | null): number {
  return signOff && !isSignOffStale(signOff, recorded) ? signOff.signedHours : recorded;
}

/**
 * Whether the worklist shows the sign-off panel: once something was recorded today, or a sign-off exists. A
 * person who hasn't screened today isn't asked to confirm 0.0 h.
 */
export function showScreeningHoursPanel(day: { recordedHours: number; signOff: CytologyScreeningHoursSignOff | null } | null): boolean {
  return !!day && (day.recordedHours > 0 || !!day.signOff);
}

/**
 * Batch 574: yesterday is offered only while it still needs signing off: hours were recorded and there is no
 * current sign-off (none, or one made before more was recorded).
 */
export function yesterdayNeedsSignOff(day: { recordedHours: number; signOff: CytologyScreeningHoursSignOff | null } | null): boolean {
  return !!day && day.recordedHours > 0 && (!day.signOff || isSignOffStale(day.signOff, day.recordedHours));
}
