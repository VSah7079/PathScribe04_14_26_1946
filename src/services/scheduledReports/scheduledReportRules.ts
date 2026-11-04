// src/services/scheduledReports/scheduledReportRules.ts
// ─────────────────────────────────────────────────
// Batch 613: the pure rules for report schedules: checking a draft, and working out when a
// schedule next runs in its own time zone. The API server applies the same rules.
// ─────────────────────────────────────────────────
import {
  DEFAULT_RECIPIENT_ACCESS_CHOICE, MAX_LOOKBACK_DAYS, MAX_SCHEDULE_RECIPIENTS, RECIPIENT_ACCESS_CHOICES, SCHEDULE_FREQUENCIES,
  type RecipientAccessChoice, type RecipientAccessOutcome, type ScheduledReportDraft, type ScheduledReportError,
} from './scheduledReportTypes';

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeZone(tz: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return !!tz; } catch { return false; }
}

/** The first problem with a draft, or null. Does not check that the report or users exist. */
export function validateScheduleDraft(d: ScheduledReportDraft): ScheduledReportError | null {
  if (!d.savedReportId) return 'REPORT_REQUIRED';
  if (!SCHEDULE_FREQUENCIES.includes(d.frequency)) return 'BAD_FREQUENCY';
  if (!TIME.test(d.timeOfDay)) return 'BAD_TIME';
  if (!isValidTimeZone(d.timeZone)) return 'BAD_TIME_ZONE';
  if (d.frequency === 'weekly' && !(Number.isInteger(d.dayOfWeek) && d.dayOfWeek >= 0 && d.dayOfWeek <= 6)) return 'BAD_DAY';
  if (d.frequency === 'monthly' && !(Number.isInteger(d.dayOfMonth) && d.dayOfMonth >= 1 && d.dayOfMonth <= 28)) return 'BAD_DAY';
  if (d.lookbackDays !== null && !(Number.isInteger(d.lookbackDays) && d.lookbackDays >= 1 && d.lookbackDays <= MAX_LOOKBACK_DAYS)) return 'BAD_LOOKBACK';
  const ids = new Set(d.recipientUserIds.filter(Boolean));
  if (ids.size === 0) return 'NO_RECIPIENTS';
  if (ids.size > MAX_SCHEDULE_RECIPIENTS) return 'TOO_MANY_RECIPIENTS';
  if (Object.values(d.recipientChoices ?? {}).some(c => !RECIPIENT_ACCESS_CHOICES.includes(c))) return 'BAD_RECIPIENT_CHOICE';
  return null;
}

/** A draft with duplicate and blank recipients removed, and choices kept only for people who are recipients. */
export function cleanScheduleDraft(d: ScheduledReportDraft): ScheduledReportDraft {
  const recipientUserIds = [...new Set(d.recipientUserIds.filter(Boolean))];
  const recipientChoices: Record<string, RecipientAccessChoice> = {};
  for (const id of recipientUserIds) {
    const c = d.recipientChoices?.[id];
    if (c === 'skip') recipientChoices[id] = 'skip';   // narrow is the default and is not stored
  }
  return { ...d, recipientUserIds, recipientChoices };
}

/** The person's choice for a recipient who cannot see everything (narrow when they made none). */
export function recipientChoiceOf(d: Pick<ScheduledReportDraft, 'recipientChoices'>, userId: string): RecipientAccessChoice {
  return d.recipientChoices?.[userId] ?? DEFAULT_RECIPIENT_ACCESS_CHOICE;
}

/**
 * What a run does for a recipient (pure): everyone who can see the whole report gets it; a recipient who
 * cannot gets the narrowed report or nothing, exactly as the schedule's owner chose.
 */
export function outcomeForRecipient(choice: RecipientAccessChoice, seesAll: boolean): RecipientAccessOutcome {
  if (seesAll) return 'full';
  return choice === 'skip' ? 'skipped' : 'narrowed';
}

interface Parts { year: number; month: number; day: number; weekday: number; hour: number; minute: number }

function partsIn(instant: Date, timeZone: string): Parts {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: 'numeric',
  });
  const get = Object.fromEntries(f.formatToParts(instant).map(p => [p.type, p.value]));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get.weekday);
  return { year: +get.year, month: +get.month, day: +get.day, weekday, hour: +get.hour % 24, minute: +get.minute };
}

/** The UTC instant at which the wall clock in `timeZone` reads this date and time. */
export function zonedToInstant(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  let guess = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 2; i++) {
    const p = partsIn(new Date(guess), timeZone);
    const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess -= asIfUtc - Date.UTC(year, month - 1, day, hour, minute);
  }
  return new Date(guess);
}

/** The first run strictly after `after`, as an ISO instant (pure). Null when the draft is invalid. */
export function nextRunAfter(d: ScheduledReportDraft, after: Date): string | null {
  if (validateScheduleDraft(d)) return null;
  const [h, m] = d.timeOfDay.split(':').map(Number);
  const start = partsIn(after, d.timeZone);
  // Walk calendar days from the day `after` falls on (in the zone); 62 days always reaches a monthly run.
  for (let offset = 0; offset <= 62; offset++) {
    const day = new Date(Date.UTC(start.year, start.month - 1, start.day + offset));
    const y = day.getUTCFullYear(); const mo = day.getUTCMonth() + 1; const dd = day.getUTCDate(); const wd = day.getUTCDay();
    if (d.frequency === 'weekly' && wd !== d.dayOfWeek) continue;
    if (d.frequency === 'monthly' && dd !== d.dayOfMonth) continue;
    const at = zonedToInstant(y, mo, dd, h, m, d.timeZone);
    if (at.getTime() > after.getTime()) return at.toISOString();
  }
  return null;
}

/** Whether a schedule is due: active, and its next run has passed. */
export function isDue(s: { active: boolean; nextRunAt: string | null }, now: Date): boolean {
  return s.active && !!s.nextRunAt && Date.parse(s.nextRunAt) <= now.getTime();
}

/** The calendar dates (YYYY-MM-DD) a run covers: the last `days` complete days, ending yesterday in `timeZone` (pure). */
export function lookbackRange(days: number, now: Date, timeZone: string): { dateFrom: string; dateTo: string } {
  const p = partsIn(now, timeZone);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const end = new Date(Date.UTC(p.year, p.month - 1, p.day - 1));
  const start = new Date(Date.UTC(p.year, p.month - 1, p.day - days));
  return { dateFrom: fmt(start), dateTo: fmt(end) };
}
