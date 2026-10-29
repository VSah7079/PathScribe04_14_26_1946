// src/utils/plainCalendarDate.ts
// Batch 707: a date of birth (or last menstrual period) is a calendar date, not a moment.
// `new Date('1980-05-14').toISOString()` is midnight UTC, which a US time zone shows as 13 May.
// The date input already gives 'YYYY-MM-DD', so that is stored as it is; anything else is refused.
const PLAIN = /^\d{4}-\d{2}-\d{2}$/;

/** The 'YYYY-MM-DD' date to store. Throws on anything else, so a bad value is never saved as a shifted date. */
export function plainCalendarDate(value: string): string {
  if (!PLAIN.test(value)) throw new Error('Expected a calendar date in YYYY-MM-DD form');
  return value;
}
