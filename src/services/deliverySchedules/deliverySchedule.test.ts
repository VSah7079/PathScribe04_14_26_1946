// Batch 619 (PS-800): delivery schedule rules: validation, time zones, windows, batches, hold until sign-out, and the facility-over-enterprise resolver.
import { describe, expect, it } from 'vitest';
import {
  IMMEDIATE_SCHEDULE, batchRunForItem, deadlineStatus, defaultScheduleFor, evaluateSchedule, localParts, resolveDeliverySchedule, validateSchedule, zonedInstant,
  type DeliverySchedule, type DeliveryScheduleEntry,
} from './deliverySchedule';

const windows = (over: Partial<DeliverySchedule> = {}): DeliverySchedule => ({
  ...IMMEDIATE_SCHEDULE, kind: 'windows', timeZone: 'America/New_York', windows: [{ days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00' }], ...over,
});
const batch = (over: Partial<DeliverySchedule> = {}): DeliverySchedule => ({
  ...IMMEDIATE_SCHEDULE, kind: 'batch', timeZone: 'America/New_York', batchDays: [1, 2, 3, 4, 5], batchTimes: ['22:00'], ...over,
});
// 2026-10-19 is a Monday. New York is on daylight time (UTC-4) until Nov 1.
const ny = (date: string, time: string) => zonedInstant(date, time, 'America/New_York');

describe('time zones', () => {
  it('reads the local date, weekday and minute in a zone', () => {
    expect(localParts(new Date('2026-10-19T03:30:00Z'), 'America/New_York')).toEqual({ date: '2026-10-18', weekday: 0, minutes: 23 * 60 + 30 });
  });
  it('turns a local time into the right instant, across daylight saving', () => {
    expect(ny('2026-10-19', '08:00').toISOString()).toBe('2026-10-19T12:00:00.000Z');
    expect(ny('2026-11-02', '08:00').toISOString()).toBe('2026-11-02T13:00:00.000Z');
  });
});

describe('validateSchedule', () => {
  it('accepts immediate, hold, windows and batch', () => {
    for (const s of [IMMEDIATE_SCHEDULE, { ...IMMEDIATE_SCHEDULE, kind: 'hold_until_sign_out' as const }, windows(), batch()]) expect(validateSchedule(s)).toEqual([]);
  });
  it('names every problem', () => {
    expect(validateSchedule(windows({ timeZone: 'Mars/Base' }))).toContain('timeZoneInvalid');
    expect(validateSchedule(windows({ windows: [] }))).toContain('windowsRequired');
    expect(validateSchedule(windows({ windows: [{ days: [], start: '08:00', end: '17:00' }] }))).toContain('daysRequired');
    expect(validateSchedule(windows({ windows: [{ days: [1], start: '8am', end: '17:00' }] }))).toContain('timeInvalid');
    expect(validateSchedule(windows({ windows: [{ days: [1], start: '17:00', end: '08:00' }] }))).toContain('windowEndBeforeStart');
    expect(validateSchedule(batch({ batchTimes: [] }))).toContain('batchTimesRequired');
    expect(validateSchedule(batch({ batchTimes: ['25:00'] }))).toContain('timeInvalid');
    expect(validateSchedule(windows({ blackoutDates: ['12/25/2026'] }))).toContain('blackoutInvalid');
    expect(validateSchedule({ ...IMMEDIATE_SCHEDULE, kind: 'nope' as never })).toContain('kindInvalid');
  });
});

describe('evaluateSchedule', () => {
  it('immediate goes out now', () => {
    expect(evaluateSchedule(IMMEDIATE_SCHEDULE, new Date('2026-10-19T10:00:00Z'))).toMatchObject({ canSendNow: true, reason: 'immediate' });
  });
  it('hold until sign-out waits, then goes', () => {
    const s = { ...IMMEDIATE_SCHEDULE, kind: 'hold_until_sign_out' as const };
    expect(evaluateSchedule(s, new Date())).toEqual({ canSendNow: false, reason: 'awaiting_sign_out', nextDueAt: null });
    expect(evaluateSchedule(s, new Date(), { signedOut: true })).toMatchObject({ canSendNow: true, reason: 'signed_out' });
  });
  it('windows: inside goes, outside waits for the next window start', () => {
    expect(evaluateSchedule(windows(), ny('2026-10-19', '10:00'))).toMatchObject({ canSendNow: true, reason: 'in_window' });
    const late = evaluateSchedule(windows(), ny('2026-10-19', '18:00'));
    expect(late).toMatchObject({ canSendNow: false, reason: 'outside_window' });
    expect(late.nextDueAt).toBe(ny('2026-10-20', '08:00').toISOString());
  });
  it('windows: Friday evening waits for Monday; the end of a window is outside it', () => {
    expect(evaluateSchedule(windows(), ny('2026-10-23', '17:00')).nextDueAt).toBe(ny('2026-10-26', '08:00').toISOString());
  });
  it('windows: a blackout date sends nothing and the next opportunity skips it', () => {
    const s = windows({ blackoutDates: ['2026-10-19'] });
    const d = evaluateSchedule(s, ny('2026-10-19', '10:00'));
    expect(d).toMatchObject({ canSendNow: false, reason: 'blackout' });
    expect(d.nextDueAt).toBe(ny('2026-10-20', '08:00').toISOString());
  });
  it('windows with no usable day have no next time', () => {
    expect(evaluateSchedule(windows({ windows: [{ days: [1], start: '08:00', end: '09:00' }], blackoutDates: Array.from({ length: 40 }, (_, i) => new Date(Date.UTC(2026, 9, 19 + i)).toISOString().slice(0, 10)) }), ny('2026-10-19', '12:00')).nextDueAt).toBeNull();
  });
  it('batch: waits before the batch time, is due after it until it runs, then waits again', () => {
    const s = batch();
    expect(evaluateSchedule(s, ny('2026-10-19', '12:00'), { lastRunAt: ny('2026-10-16', '22:00').toISOString() })).toMatchObject({ canSendNow: false, reason: 'batch_waiting', nextDueAt: ny('2026-10-19', '22:00').toISOString() });
    expect(evaluateSchedule(s, ny('2026-10-19', '22:30'), { lastRunAt: ny('2026-10-16', '22:00').toISOString() })).toMatchObject({ canSendNow: true, reason: 'batch_due' });
    expect(evaluateSchedule(s, ny('2026-10-19', '22:30'), { lastRunAt: ny('2026-10-19', '22:05').toISOString() })).toMatchObject({ canSendNow: false, reason: 'batch_waiting', nextDueAt: ny('2026-10-20', '22:00').toISOString() });
  });
  it('batch: a batch that never ran is due; the weekend batch is Monday', () => {
    expect(evaluateSchedule(batch(), ny('2026-10-19', '23:00'))).toMatchObject({ canSendNow: true });
    expect(evaluateSchedule(batch(), ny('2026-10-24', '12:00'), { lastRunAt: ny('2026-10-23', '22:00').toISOString() }).nextDueAt).toBe(ny('2026-10-26', '22:00').toISOString());
  });
});

describe('resolveDeliverySchedule', () => {
  const entry = (id: string, feed: DeliveryScheduleEntry['feed'], facilityId: string | null, schedule: DeliverySchedule, registryKey: string | null = null): DeliveryScheduleEntry => ({ id, feed, facilityId, registryKey, schedule, updatedAt: '' });
  const entries = [entry('e1', 'billing_delivery', null, batch()), entry('f1', 'billing_delivery', 'fac-a', windows()), entry('e2', 'results', null, windows())];
  it('a performing facility\'s own schedule wins', () => {
    expect(resolveDeliverySchedule(entries, 'billing_delivery', 'fac-a')).toMatchObject({ source: 'facility', entry: { id: 'f1' } });
  });
  it('another facility, or none, follows the enterprise', () => {
    expect(resolveDeliverySchedule(entries, 'billing_delivery', 'fac-b')).toMatchObject({ source: 'enterprise', entry: { id: 'e1' } });
    expect(resolveDeliverySchedule(entries, 'billing_delivery')).toMatchObject({ source: 'enterprise' });
  });
  it('an override is per feed: another feed still follows the enterprise', () => {
    expect(resolveDeliverySchedule(entries, 'results', 'fac-a')).toMatchObject({ source: 'enterprise', entry: { id: 'e2' } });
  });
  it('a feed with nothing set sends immediately', () => {
    expect(resolveDeliverySchedule(entries, 'adt', 'fac-a')).toEqual({ schedule: IMMEDIATE_SCHEDULE, source: 'default', entry: null });
  });
});

// ── Registries (Pete, Oct 19) ────────────────────────────────────────────────

const hold = (minutes = 240, over: Partial<DeliverySchedule> = {}): DeliverySchedule => ({ ...IMMEDIATE_SCHEDULE, kind: 'review_hold', reviewHoldMinutes: minutes, amendmentRequeues: true, ...over });
const SIGNED = '2026-10-19T14:00:00.000Z';

describe('registry: dynamic (review hold)', () => {
  it('waits the hold after sign-out, then goes', () => {
    const waiting = evaluateSchedule(hold(), new Date('2026-10-19T16:00:00Z'), { signedOutAt: SIGNED });
    expect(waiting).toEqual({ canSendNow: false, reason: 'review_hold', nextDueAt: '2026-10-19T18:00:00.000Z' });
    expect(evaluateSchedule(hold(), new Date('2026-10-19T18:00:00Z'), { signedOutAt: SIGNED })).toMatchObject({ canSendNow: true });
  });
  it('without a sign-out time it waits for sign-out', () => {
    expect(evaluateSchedule(hold(), new Date(), {})).toEqual({ canSendNow: false, reason: 'awaiting_sign_out', nextDueAt: null });
  });
  it('an amendment re-queues by restarting the hold from the amendment time', () => {
    expect(evaluateSchedule(hold(), new Date('2026-10-19T19:00:00Z'), { signedOutAt: '2026-10-19T18:30:00.000Z' })).toMatchObject({ canSendNow: false, reason: 'review_hold' });
  });
  it('the hold must be a whole number of minutes from 1 to 10,080', () => {
    expect(validateSchedule(hold(0))).toContain('holdInvalid');
    expect(validateSchedule(hold(10081))).toContain('holdInvalid');
    expect(validateSchedule(hold(1.5))).toContain('holdInvalid');
    expect(validateSchedule(hold(240))).toEqual([]);
  });
  it('a registry with nothing set holds a few hours and re-queues on amendment; other feeds send immediately', () => {
    expect(defaultScheduleFor('registry')).toMatchObject({ kind: 'review_hold', reviewHoldMinutes: 240, amendmentRequeues: true });
    expect(defaultScheduleFor('results')).toBe(IMMEDIATE_SCHEDULE);
  });
});

describe('registry: batch (daily, weekly, monthly, cutoff)', () => {
  it('daily runs every day, including weekends', () => {
    const s = batch({ batchFrequency: 'daily', batchDays: [] });
    expect(validateSchedule(s)).toEqual([]);
    expect(evaluateSchedule(s, ny('2026-10-24', '12:00'), { lastRunAt: ny('2026-10-23', '22:00').toISOString() }).nextDueAt).toBe(ny('2026-10-24', '22:00').toISOString());
  });
  it('monthly runs on the chosen days of the month and needs at least one (1 to 28)', () => {
    const s = batch({ batchFrequency: 'monthly', batchMonthDays: [1, 15], batchDays: [] });
    expect(validateSchedule(s)).toEqual([]);
    expect(evaluateSchedule(s, ny('2026-10-19', '12:00'), { lastRunAt: ny('2026-10-15', '22:00').toISOString() }).nextDueAt).toBe(ny('2026-11-01', '22:00').toISOString());
    expect(validateSchedule(batch({ batchFrequency: 'monthly', batchMonthDays: [] }))).toContain('monthDaysRequired');
    expect(validateSchedule(batch({ batchFrequency: 'monthly', batchMonthDays: [31] }))).toContain('monthDaysRequired');
    expect(validateSchedule(batch({ batchFrequency: 'weekly', batchDays: [] }))).toContain('daysRequired');
    expect(validateSchedule(batch({ batchFrequency: 'yearly' as never }))).toContain('frequencyInvalid');
  });
  it('the cutoff decides which run an item goes in', () => {
    const s = batch({ batchFrequency: 'daily', batchTimes: ['22:00'], cutoffTime: '18:00' });
    expect(batchRunForItem(s, ny('2026-10-19', '17:59'))?.toISOString()).toBe(ny('2026-10-19', '22:00').toISOString());
    expect(batchRunForItem(s, ny('2026-10-19', '18:01'))?.toISOString()).toBe(ny('2026-10-20', '22:00').toISOString());
  });
  it('with no cutoff the run time is the cutoff', () => {
    const s = batch({ batchFrequency: 'daily', batchTimes: ['22:00'] });
    expect(batchRunForItem(s, ny('2026-10-19', '22:30'))?.toISOString()).toBe(ny('2026-10-20', '22:00').toISOString());
  });
  it('an item signed out after the cutoff waits for the next run; before it, it goes at the run', () => {
    const s = batch({ batchFrequency: 'daily', batchTimes: ['22:00'], cutoffTime: '18:00' });
    const late = ny('2026-10-19', '19:00').toISOString();
    expect(evaluateSchedule(s, ny('2026-10-19', '23:00'), { signedOutAt: late })).toMatchObject({ canSendNow: false, reason: 'batch_waiting', nextDueAt: ny('2026-10-20', '22:00').toISOString() });
    const early = ny('2026-10-19', '09:00').toISOString();
    expect(evaluateSchedule(s, ny('2026-10-19', '23:00'), { signedOutAt: early })).toMatchObject({ canSendNow: true, reason: 'batch_due' });
    expect(evaluateSchedule(s, ny('2026-10-19', '23:00'), { signedOutAt: early, lastRunAt: ny('2026-10-19', '22:01').toISOString() })).toMatchObject({ canSendNow: false });
  });
  it('a cutoff must be a real time', () => {
    expect(validateSchedule(batch({ cutoffTime: '6pm' }))).toContain('timeInvalid');
  });
});

describe('reporting deadline', () => {
  const s = hold(240, { reportingDeadlineDays: 10 });
  const signed = new Date(SIGNED);
  it('none without a deadline', () => { expect(deadlineStatus(hold(), signed, new Date())).toEqual({ state: 'none', dueAt: null }); });
  it('ok, near (within 3 days) and overdue', () => {
    expect(deadlineStatus(s, signed, new Date('2026-10-22T14:00:00Z')).state).toBe('ok');
    expect(deadlineStatus(s, signed, new Date('2026-10-27T14:00:00Z')).state).toBe('near');
    expect(deadlineStatus(s, signed, new Date('2026-10-29T14:00:01Z')).state).toBe('overdue');
    expect(deadlineStatus(s, signed, new Date('2026-10-22T14:00:00Z')).dueAt).toBe('2026-10-29T14:00:00.000Z');
  });
  it('must be a whole number of days from 1 to 3,650', () => {
    expect(validateSchedule(hold(240, { reportingDeadlineDays: 0 }))).toContain('deadlineInvalid');
    expect(validateSchedule(hold(240, { reportingDeadlineDays: 3651 }))).toContain('deadlineInvalid');
    expect(validateSchedule(hold(240, { reportingDeadlineDays: 30 }))).toEqual([]);
  });
});

describe('registry schedules are per registry', () => {
  const e = (id: string, key: string, fac: string | null, sched: DeliverySchedule): DeliveryScheduleEntry => ({ id, feed: 'registry', facilityId: fac, registryKey: key, schedule: sched, updatedAt: '' });
  const entries = [e('a', 'cancer:adtGekidGermany', null, hold(60)), e('b', 'cancer:aihwAustralia', null, batch()), e('c', 'cancer:adtGekidGermany', 'fac-a', hold(480))];
  it('each registry has its own; a facility overrides per registry', () => {
    expect(resolveDeliverySchedule(entries, 'registry', null, 'cancer:adtGekidGermany').schedule.reviewHoldMinutes).toBe(60);
    expect(resolveDeliverySchedule(entries, 'registry', null, 'cancer:aihwAustralia').schedule.kind).toBe('batch');
    expect(resolveDeliverySchedule(entries, 'registry', 'fac-a', 'cancer:adtGekidGermany')).toMatchObject({ source: 'facility' });
    expect(resolveDeliverySchedule(entries, 'registry', 'fac-a', 'cancer:aihwAustralia')).toMatchObject({ source: 'enterprise' });
  });
  it('a registry with none set does not borrow another\'s: it gets the registry default', () => {
    expect(resolveDeliverySchedule(entries, 'registry', null, 'screening:belgiumChr')).toMatchObject({ source: 'default', schedule: { kind: 'review_hold', reviewHoldMinutes: 240 } });
  });
  it('a registry entry is never taken for another feed', () => {
    expect(resolveDeliverySchedule(entries, 'results', null).source).toBe('default');
  });
});
