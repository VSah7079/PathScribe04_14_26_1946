// src/services/labWorkflowReports/reportDates.ts
// Batch 730: the report's date range. The screen shows calendar days in the lab's time zone; the range runs from the
// start of the first day to the end of the last (exclusive end). Pure apart from the clock default.
import { localDate } from './operationsReports';
import type { ReportRange } from './labWorkflowReportTypes';

const DAY = 86_400_000;

/** The instant a local calendar day starts in a time zone. */
export function startOfLocalDay(ymd: string, timeZone: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  if (Number.isNaN(guess)) return null;
  // The zone's offset at that moment: format the UTC guess in the zone and compare.
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const asLocal = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return new Date(guess - (asLocal - guess));
}

/** The range for the days from..to (inclusive), or null when either is not a date or to is before from. */
export function reportRangeOf(fromDate: string, toDate: string, timeZone: string): ReportRange | null {
  const from = startOfLocalDay(fromDate, timeZone);
  const toStart = startOfLocalDay(toDate, timeZone);
  if (!from || !toStart || toStart < from) return null;
  const nextDay = localDate(new Date(toStart.getTime() + DAY + 3 * 3_600_000).toISOString(), timeZone);
  const end = startOfLocalDay(nextDay, timeZone)!;
  return { from: from.toISOString(), to: end.toISOString() };
}

/** The last 30 days, ending today, in the lab's time zone. */
export function defaultReportDates(timeZone: string, now: Date = new Date()): { fromDate: string; toDate: string } {
  return { fromDate: localDate(new Date(now.getTime() - 29 * DAY).toISOString(), timeZone), toDate: localDate(now.toISOString(), timeZone) };
}
