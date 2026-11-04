// src/services/deliverySchedules/deliverySchedule.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 619 (PS-800): delivery schedules. PathScribe owns WHEN something goes out
// (this file); the interface engine owns HOW (translation, transport, transport
// retry, acknowledgements). A schedule is held at the ENTERPRISE level and a
// PERFORMING FACILITY may override it, per feed. Everything here is pure: no
// storage, no clock (callers pass `now`), no patient data.
// Registries (Pete, Oct 19): a registry is another outbound feed with its OWN schedule per registry,
// either dynamic (sent at sign-out after a short review hold) or batch (daily, weekly or monthly with a
// cutoff time), plus a reporting deadline and whether an amendment re-queues. Destinations, required
// fields and transport stay in each registry's go-live configuration, not here.
// Contract: docs/architecture/DELIVERY_SCHEDULES_API.md
// ─────────────────────────────────────────────────────────────────────────────
import type { ID } from '../types';

export const DELIVERY_FEEDS = ['report_delivery', 'billing_delivery', 'results', 'adt', 'accession', 'lis_sync', 'registry'] as const;
export type DeliveryFeed = typeof DELIVERY_FEEDS[number];

export const SCHEDULE_KINDS = ['immediate', 'windows', 'batch', 'hold_until_sign_out', 'review_hold'] as const;
export type ScheduleKind = typeof SCHEDULE_KINDS[number];

/** A send window on some weekdays (0 = Sunday ... 6 = Saturday), local "HH:MM" to "HH:MM", same day. */
export interface TimeWindow { days: number[]; start: string; end: string }

export interface DeliverySchedule {
  kind: ScheduleKind;
  /** kind 'windows': items go out only inside these windows. */
  windows: TimeWindow[];
  /** kind 'batch': items are collected and sent together at these local times on these weekdays. */
  batchDays: number[];
  batchTimes: string[];
  /** Local dates (YYYY-MM-DD) on which a windows/batch schedule sends nothing. */
  blackoutDates: string[];
  /** kind 'batch': how often. daily = every day, weekly = batchDays, monthly = batchMonthDays (1 to 28). */
  batchFrequency: BatchFrequency;
  batchMonthDays: number[];
  /** kind 'batch': items signed out up to this local time on the run day go in that run; later ones wait for the next. Absent = the run time. */
  cutoffTime: string | null;
  /** kind 'review_hold': minutes after sign-out before an item goes out (the review/amend window). */
  reviewHoldMinutes: number;
  /** Days from sign-out by which the item must have been reported; the queue flags cases close to it. Absent = no deadline. */
  reportingDeadlineDays: number | null;
  /** An amendment after sending puts the item back in the queue under this schedule. */
  amendmentRequeues: boolean;
  /** IANA time zone the times above are read in. */
  timeZone: string;
}

export const BATCH_FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;
export type BatchFrequency = typeof BATCH_FREQUENCIES[number];

/** One stored schedule: for a feed, at the enterprise (facilityId null) or as one performing facility's override. */
export interface DeliveryScheduleEntry {
  id: ID;
  feed: DeliveryFeed;
  facilityId: ID | null;
  /** Feed 'registry' only: which registry ("cancer:<id>" or "screening:<id>", as the registry go-live configuration keys them). Every registry has its own. */
  registryKey: string | null;
  schedule: DeliverySchedule;
  updatedAt: string;
}

export interface DeliveryScheduleInput { feed: DeliveryFeed; facilityId: ID | null; registryKey?: string | null; schedule: DeliverySchedule }

export const IMMEDIATE_SCHEDULE: DeliverySchedule = {
  kind: 'immediate', windows: [], batchDays: [], batchTimes: [], blackoutDates: [], timeZone: 'UTC',
  batchFrequency: 'weekly', batchMonthDays: [], cutoffTime: null, reviewHoldMinutes: 0, reportingDeadlineDays: null, amendmentRequeues: false,
};

/** Hold before a registry submission goes out when none is set: a few hours, matching the QA/amend window. */
export const DEFAULT_REGISTRY_REVIEW_HOLD_MINUTES = 240;

/** What a feed does when nothing is set: send immediately; a registry waits the short review hold and re-queues on amendment. */
export const defaultScheduleFor = (feed: DeliveryFeed): DeliverySchedule =>
  feed === 'registry' ? { ...IMMEDIATE_SCHEDULE, kind: 'review_hold', reviewHoldMinutes: DEFAULT_REGISTRY_REVIEW_HOLD_MINUTES, amendmentRequeues: true } : IMMEDIATE_SCHEDULE;

export type ScheduleProblem =
  | 'timeZoneInvalid' | 'daysRequired' | 'windowsRequired' | 'timeInvalid' | 'windowEndBeforeStart'
  | 'batchTimesRequired' | 'blackoutInvalid' | 'kindInvalid' | 'holdInvalid' | 'monthDaysRequired' | 'deadlineInvalid' | 'frequencyInvalid';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const toMinutes = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const daysOk = (d: number[]) => Array.isArray(d) && d.length > 0 && d.every(x => Number.isInteger(x) && x >= 0 && x <= 6);

export const isValidTimeZone = (tz: string): boolean => {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
};

/** Every reason a schedule can't be saved (empty when it can). */
export function validateSchedule(s: DeliverySchedule): ScheduleProblem[] {
  const out = new Set<ScheduleProblem>();
  if (!SCHEDULE_KINDS.includes(s.kind)) out.add('kindInvalid');
  if (!isValidTimeZone(s.timeZone)) out.add('timeZoneInvalid');
  if (s.blackoutDates.some(d => !DATE.test(d) || Number.isNaN(Date.parse(`${d}T00:00:00Z`)))) out.add('blackoutInvalid');
  if (s.kind === 'windows') {
    if (s.windows.length === 0) out.add('windowsRequired');
    for (const w of s.windows) {
      if (!daysOk(w.days)) out.add('daysRequired');
      if (!HHMM.test(w.start) || !HHMM.test(w.end)) out.add('timeInvalid');
      else if (toMinutes(w.end) <= toMinutes(w.start)) out.add('windowEndBeforeStart');
    }
  }
  if (s.kind === 'batch') {
    if (s.batchTimes.length === 0) out.add('batchTimesRequired');
    if (s.batchTimes.some(t => !HHMM.test(t))) out.add('timeInvalid');
    if (!BATCH_FREQUENCIES.includes(s.batchFrequency)) out.add('frequencyInvalid');
    if (s.batchFrequency === 'weekly' && !daysOk(s.batchDays)) out.add('daysRequired');
    if (s.batchFrequency === 'monthly' && !(s.batchMonthDays.length > 0 && s.batchMonthDays.every(d => Number.isInteger(d) && d >= 1 && d <= 28))) out.add('monthDaysRequired');
    if (s.cutoffTime !== null && !HHMM.test(s.cutoffTime)) out.add('timeInvalid');
  }
  if (s.kind === 'review_hold' && !(Number.isInteger(s.reviewHoldMinutes) && s.reviewHoldMinutes >= 1 && s.reviewHoldMinutes <= 7 * 24 * 60)) out.add('holdInvalid');
  if (s.reportingDeadlineDays !== null && !(Number.isInteger(s.reportingDeadlineDays) && s.reportingDeadlineDays >= 1 && s.reportingDeadlineDays <= 3650)) out.add('deadlineInvalid');
  return [...out];
}

// ── Time zone helpers ────────────────────────────────────────────────────────

const formatters = new Map<string, Intl.DateTimeFormat>();
const fmt = (tz: string) => {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' });
    formatters.set(tz, f);
  }
  return f;
};
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface LocalParts { date: string; weekday: number; minutes: number }
/** The local date, weekday and minute-of-day at an instant in a time zone. */
export function localParts(at: Date, tz: string): LocalParts {
  const p: Record<string, string> = {};
  for (const part of fmt(tz).formatToParts(at)) p[part.type] = part.value;
  return { date: `${p.year}-${p.month}-${p.day}`, weekday: WEEKDAYS.indexOf(p.weekday), minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/** Milliseconds the zone is ahead of UTC at an instant. */
function offsetMs(ts: number, tz: string): number {
  const lp = localParts(new Date(ts), tz);
  const [y, m, d] = lp.date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, 0, lp.minutes) - Math.floor(ts / 60000) * 60000;
}

/** The instant of a local date and "HH:MM" in a zone (a time skipped by daylight saving moves forward). */
export function zonedInstant(date: string, hhmm: string, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, Number(hhmm.slice(0, 2)), Number(hhmm.slice(3, 5)));
  let ts = guess - offsetMs(guess, tz);
  ts = guess - offsetMs(ts, tz);
  return new Date(ts);
}

const addDays = (date: string, n: number): string => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const weekdayOf = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay();

// ── Evaluation ───────────────────────────────────────────────────────────────

export type ScheduleReason = 'review_hold' | 'immediate' | 'in_window' | 'outside_window' | 'batch_due' | 'batch_waiting' | 'blackout' | 'awaiting_sign_out' | 'signed_out';

export interface ScheduleContext {
  /** hold_until_sign_out: whether the case is finally signed out. */
  signedOut?: boolean;
  /** review_hold and batch cutoffs: when the item was signed out (ISO). For an amendment that re-queues, the time of the amendment. */
  signedOutAt?: string | null;
  /** batch: when the last batch ran (ISO). Anything not sent since the latest batch time is due. */
  lastRunAt?: string | null;
}
export interface ScheduleDecision { canSendNow: boolean; reason: ScheduleReason; nextDueAt: string | null }

const SEARCH_DAYS = 35;

const batchDayMatches = (s: DeliverySchedule, date: string, wd: number): boolean =>
  s.batchFrequency === 'daily' || (s.batchFrequency === 'weekly' && s.batchDays.includes(wd)) || (s.batchFrequency === 'monthly' && s.batchMonthDays.includes(Number(date.slice(8, 10))));

/** The first batch run an item signed out at `signedOutAt` goes in: the first run whose cutoff has not passed. */
export function batchRunForItem(s: DeliverySchedule, signedOutAt: Date): Date | null {
  const first = localParts(signedOutAt, s.timeZone).date;
  for (let i = 0; i <= 62; i++) {
    const date = addDays(first, i);
    if (s.blackoutDates.includes(date) || !batchDayMatches(s, date, weekdayOf(date))) continue;
    const runs = [...s.batchTimes].sort().map(t => ({ at: zonedInstant(date, t, s.timeZone), cutoff: zonedInstant(date, s.cutoffTime ?? t, s.timeZone) }));
    const hit = runs.find(r => r.cutoff.getTime() >= signedOutAt.getTime());
    if (hit) return hit.at;
  }
  return null;
}

/** Start instants (ms) of every send opportunity from yesterday through SEARCH_DAYS ahead, in order. */
function opportunities(s: DeliverySchedule, now: Date): { start: number; end: number }[] {
  const today = localParts(now, s.timeZone).date;
  const out: { start: number; end: number }[] = [];
  for (let i = -1; i <= SEARCH_DAYS; i++) {
    const date = addDays(today, i);
    if (s.blackoutDates.includes(date)) continue;
    const wd = weekdayOf(date);
    if (s.kind === 'windows') {
      for (const w of s.windows) if (w.days.includes(wd)) out.push({ start: zonedInstant(date, w.start, s.timeZone).getTime(), end: zonedInstant(date, w.end, s.timeZone).getTime() });
    } else if (s.kind === 'batch' && batchDayMatches(s, date, wd)) {
      for (const t of s.batchTimes) { const at = zonedInstant(date, t, s.timeZone).getTime(); out.push({ start: at, end: at }); }
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Whether something waiting may go out at `now` under the schedule, and when it next may. */
export function evaluateSchedule(s: DeliverySchedule, now: Date, ctx: ScheduleContext = {}): ScheduleDecision {
  const t = now.getTime();
  const iso = (ms: number) => new Date(ms).toISOString();
  if (s.kind === 'immediate') return { canSendNow: true, reason: 'immediate', nextDueAt: iso(t) };
  if (s.kind === 'hold_until_sign_out') {
    return ctx.signedOut ? { canSendNow: true, reason: 'signed_out', nextDueAt: iso(t) } : { canSendNow: false, reason: 'awaiting_sign_out', nextDueAt: null };
  }
  if (s.kind === 'review_hold') {
    if (!ctx.signedOutAt) return { canSendNow: false, reason: 'awaiting_sign_out', nextDueAt: null };
    const due = Date.parse(ctx.signedOutAt) + s.reviewHoldMinutes * 60000;
    return t >= due ? { canSendNow: true, reason: 'signed_out', nextDueAt: iso(due) } : { canSendNow: false, reason: 'review_hold', nextDueAt: iso(due) };
  }
  if (s.kind === 'batch' && ctx.signedOutAt) {
    const run = batchRunForItem(s, new Date(ctx.signedOutAt));
    if (!run) return { canSendNow: false, reason: 'batch_waiting', nextDueAt: null };
    const lastAt = ctx.lastRunAt ? Date.parse(ctx.lastRunAt) : null;
    if (run.getTime() <= t) return lastAt !== null && lastAt >= run.getTime() ? { canSendNow: false, reason: 'batch_waiting', nextDueAt: null } : { canSendNow: true, reason: 'batch_due', nextDueAt: run.toISOString() };
    return { canSendNow: false, reason: 'batch_waiting', nextDueAt: run.toISOString() };
  }
  const ops = opportunities(s, now);
  const blackoutToday = s.blackoutDates.includes(localParts(now, s.timeZone).date);
  if (s.kind === 'windows') {
    if (ops.some(o => o.start <= t && t < o.end)) return { canSendNow: true, reason: 'in_window', nextDueAt: iso(t) };
    const next = ops.find(o => o.start > t);
    return { canSendNow: false, reason: blackoutToday ? 'blackout' : 'outside_window', nextDueAt: next ? iso(next.start) : null };
  }
  const past = ops.filter(o => o.start <= t).pop();
  const next = ops.find(o => o.start > t);
  const last = ctx.lastRunAt ? Date.parse(ctx.lastRunAt) : null;
  if (past && (last === null || last < past.start)) return { canSendNow: true, reason: 'batch_due', nextDueAt: iso(past.start) };
  return { canSendNow: false, reason: blackoutToday ? 'blackout' : 'batch_waiting', nextDueAt: next ? iso(next.start) : null };
}

// ── Reporting deadline ───────────────────────────────────────────────────────

export type DeadlineState = 'none' | 'ok' | 'near' | 'overdue';
export interface DeadlineStatus { state: DeadlineState; dueAt: string | null }
/** Days before the deadline from which the queue flags an item as near it. */
export const DEADLINE_NEAR_DAYS = 3;

/** Where an item stands against the feed's reporting deadline (days from sign-out). */
export function deadlineStatus(s: DeliverySchedule, signedOutAt: Date, now: Date, nearDays = DEADLINE_NEAR_DAYS): DeadlineStatus {
  if (s.reportingDeadlineDays === null) return { state: 'none', dueAt: null };
  const due = signedOutAt.getTime() + s.reportingDeadlineDays * 86400000;
  const state: DeadlineState = now.getTime() > due ? 'overdue' : due - now.getTime() <= nearDays * 86400000 ? 'near' : 'ok';
  return { state, dueAt: new Date(due).toISOString() };
}

// ── Enterprise default with performing-facility override ─────────────────────

export type ScheduleSource = 'facility' | 'enterprise' | 'default';
export interface ResolvedSchedule { schedule: DeliverySchedule; source: ScheduleSource; entry: DeliveryScheduleEntry | null }

/** A facility's own schedule for the feed (and registry) wins; else the enterprise's; else the feed's default. A registry never borrows another registry's. */
export function resolveDeliverySchedule(entries: DeliveryScheduleEntry[], feed: DeliveryFeed, performingFacilityId?: ID | null, registryKey: string | null = null): ResolvedSchedule {
  const forFeed = entries.filter(e => e.feed === feed && (e.registryKey ?? null) === (feed === 'registry' ? registryKey : null));
  const own = performingFacilityId ? forFeed.find(e => e.facilityId === performingFacilityId) : undefined;
  if (own) return { schedule: own.schedule, source: 'facility', entry: own };
  const ent = forFeed.find(e => e.facilityId === null);
  if (ent) return { schedule: ent.schedule, source: 'enterprise', entry: ent };
  return { schedule: defaultScheduleFor(feed), source: 'default', entry: null };
}
