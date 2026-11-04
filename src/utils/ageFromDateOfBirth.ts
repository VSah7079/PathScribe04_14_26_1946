// src/utils/ageFromDateOfBirth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 504 (found by the PS-470 lint clean-up): a patient's age in whole
// years. A date of birth is a calendar date, not an instant. The two copies
// of this calculation (the report preview, and the cytology screening
// strategy's age bands) parsed "1990-04-02" as UTC midnight and then read it
// back in the VIEWING DEVICE's time zone, which in the Americas is 1 April:
// the age went up a day early, every year. The birth date is now taken from
// the string's own year-month-day.
//
// "Today" is the viewer's own date (age as the person reading it sees it).
// ─────────────────────────────────────────────────────────────────────────────

export interface CalendarDate { year: number; month: number; day: number } // month 1–12

/** The calendar date written in a date string ("1990-04-02" or "1990-04-02T…"), or its UTC date for any other parseable form. */
export function calendarDateOf(value: string): CalendarDate | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (m) {
    const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return month >= 1 && month <= 12 && day >= 1 && day <= 31 ? { year, month, day } : undefined;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** The viewer's own calendar date for an instant. */
function viewerCalendarDate(d: Date): CalendarDate {
  // eslint-disable-next-line no-restricted-properties -- "today" for an age is the viewer's own date, not a stored event
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

/** Whole years from a date of birth to `asOf` (a Date, or a calendar date string); undefined when the birth date can't be read. */
export function ageFromDateOfBirth(dateOfBirth: string | undefined | null, asOf: Date | string = new Date()): number | undefined {
  if (!dateOfBirth) return undefined;
  const birth = calendarDateOf(dateOfBirth);
  const today = typeof asOf === 'string' ? calendarDateOf(asOf) : Number.isNaN(asOf.getTime()) ? undefined : viewerCalendarDate(asOf);
  if (!birth || !today) return undefined;
  const hadBirthday = today.month > birth.month || (today.month === birth.month && today.day >= birth.day);
  return today.year - birth.year - (hadBirthday ? 0 : 1);
}
