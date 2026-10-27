// src/services/cosd/workingDays.ts
// Batch 620 (part C, PS-800): adding working days, for the UK correction window. Pure.
// A working day is Monday to Friday that is not in the list of non-working dates the administrator keeps for the
// destination (bank holidays are entered by the lab, never assumed). Days are counted in UTC and the time of day is kept.

const DAY_MS = 86_400_000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const isIsoDate = (value: string): boolean => DATE_ONLY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export function isWorkingDay(day: Date, nonWorkingDates: readonly string[]): boolean {
  const weekday = day.getUTCDay();
  return weekday !== 0 && weekday !== 6 && !nonWorkingDates.includes(day.toISOString().slice(0, 10));
}

/** The moment `days` working days after `from` (the first counted day is the next working day). Zero days returns `from`. */
export function addWorkingDays(from: Date, days: number, nonWorkingDates: readonly string[] = []): Date {
  let cursor = new Date(from.getTime());
  let left = Math.max(0, Math.floor(days));
  while (left > 0) {
    cursor = new Date(cursor.getTime() + DAY_MS);
    if (isWorkingDay(cursor, nonWorkingDates)) left -= 1;
  }
  return cursor;
}

/** Whole calendar days between two instants (the span of a working-day window), used to read it as a delivery-schedule deadline. */
export const calendarDaysBetween = (from: Date, to: Date): number => Math.round((to.getTime() - from.getTime()) / DAY_MS);
