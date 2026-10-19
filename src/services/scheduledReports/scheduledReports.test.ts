import { describe, it, expect, vi } from 'vitest';
import { createScheduledReportService, type ScheduledReportDeps } from './createScheduledReportService';
import { isDue, lookbackRange, nextRunAfter, validateScheduleDraft, zonedToInstant } from './scheduledReportRules';
import { scheduleCreatedAudit, scheduleRanAudit } from './scheduledReportAudit';
import { MAX_SCHEDULES_PER_USER, type ScheduledReport, type ScheduledReportDraft } from './scheduledReportTypes';

const draft = (over: Partial<ScheduledReportDraft> = {}): ScheduledReportDraft => ({
  savedReportId: 'r1', frequency: 'weekly', dayOfWeek: 1, dayOfMonth: 1, timeOfDay: '07:00', timeZone: 'America/New_York',
  lookbackDays: 7, recipientUserIds: ['u2', 'u3'], ...over,
});

describe('schedule rules (Batch 613)', () => {
  it('finds the first problem with a schedule', () => {
    expect(validateScheduleDraft(draft())).toBeNull();
    expect(validateScheduleDraft(draft({ savedReportId: '' }))).toBe('REPORT_REQUIRED');
    expect(validateScheduleDraft(draft({ timeOfDay: '7am' }))).toBe('BAD_TIME');
    expect(validateScheduleDraft(draft({ timeOfDay: '24:00' }))).toBe('BAD_TIME');
    expect(validateScheduleDraft(draft({ timeZone: 'Mars/Base' }))).toBe('BAD_TIME_ZONE');
    expect(validateScheduleDraft(draft({ dayOfWeek: 7 }))).toBe('BAD_DAY');
    expect(validateScheduleDraft(draft({ frequency: 'monthly', dayOfMonth: 29 }))).toBe('BAD_DAY');
    expect(validateScheduleDraft(draft({ lookbackDays: 0 }))).toBe('BAD_LOOKBACK');
    expect(validateScheduleDraft(draft({ lookbackDays: null }))).toBeNull();
    expect(validateScheduleDraft(draft({ recipientUserIds: [] }))).toBe('NO_RECIPIENTS');
    expect(validateScheduleDraft(draft({ recipientUserIds: Array.from({ length: 21 }, (_, i) => `u${i}`) }))).toBe('TOO_MANY_RECIPIENTS');
  });

  it('works out the next run in the schedule\'s own time zone', () => {
    // Sunday 2026-09-27 12:00 UTC. Monday 07:00 in New York (EDT, UTC-4) is 11:00 UTC.
    expect(nextRunAfter(draft(), new Date('2026-09-27T12:00:00Z'))).toBe('2026-09-28T11:00:00.000Z');
    expect(nextRunAfter(draft({ frequency: 'daily' }), new Date('2026-09-27T12:00:00Z'))).toBe('2026-09-28T11:00:00.000Z');
    expect(nextRunAfter(draft({ frequency: 'daily' }), new Date('2026-09-27T10:00:00Z'))).toBe('2026-09-27T11:00:00.000Z');
    expect(nextRunAfter(draft({ frequency: 'monthly', dayOfMonth: 1 }), new Date('2026-09-27T12:00:00Z'))).toBe('2026-10-01T11:00:00.000Z');
    expect(nextRunAfter(draft({ recipientUserIds: [] }), new Date())).toBeNull();
  });

  it('is strictly after the moment given, and follows the clock change', () => {
    expect(nextRunAfter(draft({ frequency: 'daily' }), new Date('2026-09-27T11:00:00Z'))).toBe('2026-09-28T11:00:00.000Z');
    // New York leaves daylight time on 2026-11-01: 07:00 is then UTC-5, 12:00 UTC.
    expect(nextRunAfter(draft({ frequency: 'daily' }), new Date('2026-11-01T12:30:00Z'))).toBe('2026-11-02T12:00:00.000Z');
    expect(zonedToInstant(2026, 7, 1, 9, 30, 'Asia/Seoul').toISOString()).toBe('2026-07-01T00:30:00.000Z');
  });

  it('covers the last N complete days, ending yesterday in the zone', () => {
    expect(lookbackRange(7, new Date('2026-09-27T03:00:00Z'), 'America/New_York')).toEqual({ dateFrom: '2026-09-19', dateTo: '2026-09-25' });
    expect(lookbackRange(1, new Date('2026-09-27T12:00:00Z'), 'UTC')).toEqual({ dateFrom: '2026-09-26', dateTo: '2026-09-26' });
  });

  it('is due only when active and past its next run', () => {
    const now = new Date('2026-09-27T12:00:00Z');
    expect(isDue({ active: true, nextRunAt: '2026-09-27T11:00:00Z' }, now)).toBe(true);
    expect(isDue({ active: false, nextRunAt: '2026-09-27T11:00:00Z' }, now)).toBe(false);
    expect(isDue({ active: true, nextRunAt: '2026-09-27T13:00:00Z' }, now)).toBe(false);
    expect(isDue({ active: true, nextRunAt: null }, now)).toBe(false);
  });

  it('audit text is literal English with the report name and counts, never recipients', () => {
    const a = scheduleCreatedAudit('Grade 3 by month', 'weekly', 2, 'Dr Lee');
    expect(a.detail).toContain('Simulated');
    expect(a.detail).toContain('2 recipients');
    expect(scheduleRanAudit('R', { groupCount: 3, rowCount: 0, total: 1, recipientCount: 1 }, 'x').detail).toBe('Simulated: report "R" run for 1 recipient (1 case matched, 3 groups, 0 rows). Nothing was sent.');
  });
});

function setup(over: Partial<ScheduledReportDeps> = {}) {
  let stored: ScheduledReport[] = [];
  let clock = new Date('2026-09-27T12:00:00Z');
  const audit = vi.fn();
  let n = 0;
  const deps: ScheduledReportDeps = {
    load: (_k, fb) => (stored.length ? stored : fb), save: (_k, v) => { stored = v; }, audit,
    actor: () => ({ id: 'u1', name: 'Dr Lee' }), now: () => clock, newId: () => `s${++n}`,
    savedReportName: async id => (id === 'r1' ? 'Grade 3 by month' : null),
    runReport: vi.fn(async () => ({ ok: true as const, data: { groupCount: 4, rowCount: 0, total: 27 } })),
    existingUserIds: async ids => ids.filter(i => i !== 'ghost'),
    ...over,
  };
  return { svc: createScheduledReportService(deps), deps, audit, get stored() { return stored; }, setClock: (d: Date) => { clock = d; } };
}

describe('schedule service (Batch 613)', () => {
  it('creates a schedule for a saved report, with its next run, and records it', async () => {
    const t = setup();
    const res = await t.svc.create(draft({ recipientUserIds: ['u2', 'u2', 'ghost', 'u3'] }));
    expect(res.ok && res.data).toMatchObject({ savedReportName: 'Grade 3 by month', recipientUserIds: ['u2', 'u3'], active: true, nextRunAt: '2026-09-28T11:00:00.000Z', ownerId: 'u1' });
    expect(t.audit.mock.calls[0][0].event).toBe('Report Schedule Created');
    expect(JSON.stringify(t.audit.mock.calls)).not.toMatch(/u2|u3/);
  });

  it('refuses a schedule for a missing report, unknown recipients, or too many schedules', async () => {
    const t = setup();
    expect(await t.svc.create(draft({ savedReportId: 'nope' }))).toEqual({ ok: false, error: 'REPORT_NOT_FOUND' });
    expect(await t.svc.create(draft({ recipientUserIds: ['ghost'] }))).toEqual({ ok: false, error: 'NO_RECIPIENTS' });
    expect(await t.svc.create(draft({ timeOfDay: 'x' }))).toEqual({ ok: false, error: 'BAD_TIME' });
    for (let i = 0; i < MAX_SCHEDULES_PER_USER; i++) await t.svc.create(draft());
    expect(await t.svc.create(draft())).toEqual({ ok: false, error: 'TOO_MANY_SCHEDULES' });
    expect(t.stored).toHaveLength(MAX_SCHEDULES_PER_USER);
  });

  it('keeps each user\'s schedules to themselves', async () => {
    let actor = { id: 'u1', name: 'A' };
    const t = setup({ actor: () => actor });
    const made = await t.svc.create(draft());
    actor = { id: 'u9', name: 'B' };
    expect(await t.svc.list()).toEqual({ ok: true, data: [] });
    const id = made.ok ? made.data.id : '';
    expect(await t.svc.remove(id)).toEqual({ ok: false, error: 'SCHEDULE_NOT_FOUND' });
    expect(await t.svc.setActive(id, false)).toEqual({ ok: false, error: 'SCHEDULE_NOT_FOUND' });
    expect(await t.svc.runNow(id)).toEqual({ ok: false, error: 'SCHEDULE_NOT_FOUND' });
  });

  it('a Simulated run keeps the counts as the last run, moves the next run on, and sends nothing', async () => {
    const t = setup();
    const made = await t.svc.create(draft());
    const id = made.ok ? made.data.id : '';
    t.setClock(new Date('2026-09-28T12:00:00Z'));
    const ran = await t.svc.runNow(id);
    expect(ran.ok && ran.data.lastRun).toMatchObject({ status: 'simulated', simulated: true, total: 27, groupCount: 4, recipientCount: 2 });
    expect(ran.ok && ran.data.nextRunAt).toBe('2026-10-05T11:00:00.000Z');
    expect(t.deps.runReport).toHaveBeenCalledWith('r1', { dateFrom: '2026-09-21', dateTo: '2026-09-27' });
    expect(t.audit.mock.calls[t.audit.mock.calls.length - 1][0].event).toBe('Report Schedule Run');
  });

  it('records a failed run without losing the schedule', async () => {
    const t = setup({ runReport: async () => ({ ok: false as const, error: 'REPORT_NOT_FOUND' }) });
    const made = await t.svc.create(draft());
    const ran = await t.svc.runNow(made.ok ? made.data.id : '');
    expect(ran.ok && ran.data.lastRun).toMatchObject({ status: 'failed', message: 'REPORT_NOT_FOUND' });
    expect(t.audit.mock.calls[t.audit.mock.calls.length - 1][0].event).toBe('Report Schedule Failed');
    expect(t.stored).toHaveLength(1);
  });

  it('runs schedules that came due while the app was closed, and only those', async () => {
    const t = setup();
    await t.svc.create(draft());
    await t.svc.create(draft({ frequency: 'monthly', dayOfMonth: 20 }));
    expect(await t.svc.runDue()).toEqual({ ok: true, data: [] });
    t.setClock(new Date('2026-09-29T00:00:00Z'));
    const ran = await t.svc.runDue();
    expect(ran.ok && ran.data).toHaveLength(1);
    expect(t.deps.runReport).toHaveBeenCalledTimes(1);
  });

  it('pausing stops runs, resuming works out the next run again; deleting removes it', async () => {
    const t = setup();
    const made = await t.svc.create(draft());
    const id = made.ok ? made.data.id : '';
    const paused = await t.svc.setActive(id, false);
    expect(paused.ok && paused.data).toMatchObject({ active: false, nextRunAt: null });
    t.setClock(new Date('2026-12-01T00:00:00Z'));
    expect(await t.svc.runDue()).toEqual({ ok: true, data: [] });
    const resumed = await t.svc.setActive(id, true);
    expect(resumed.ok && resumed.data.nextRunAt).toBe('2026-12-07T12:00:00.000Z');
    await t.svc.remove(id);
    expect(t.stored).toHaveLength(0);
    expect(t.audit.mock.calls.map(c => c[0].event)).toEqual(['Report Schedule Created', 'Report Schedule Paused', 'Report Schedule Resumed', 'Report Schedule Deleted']);
  });

  it('changes a schedule and records it', async () => {
    const t = setup();
    const made = await t.svc.create(draft());
    const res = await t.svc.update(made.ok ? made.data.id : '', draft({ frequency: 'daily', recipientUserIds: ['u2'] }));
    expect(res.ok && res.data).toMatchObject({ frequency: 'daily', recipientUserIds: ['u2'] });
    expect(t.audit.mock.calls[t.audit.mock.calls.length - 1][0].event).toBe('Report Schedule Changed');
  });
});

// Batch 613 (Pete, Oct 18, 2026): PathScribe never quietly decides what a recipient sees. The person who sets the
// schedule up chooses, for each recipient who cannot see everything, to narrow the report or skip them.
describe('recipient access choices (Batch 613)', () => {
  // u2 sees all 27, u3 sees 10, u4 sees none.
  const totals = (visible: Record<string, number>) => vi.fn(async () => ({ ok: true as const, data: { ownerTotal: 27, visibleTotals: visible } }));

  it('flags only the people who cannot see every case, with counts and nothing else', async () => {
    const t = setup({ recipientTotals: totals({ u2: 27, u3: 10, u4: 0 }) });
    const res = await t.svc.assessRecipients('r1', ['u2', 'u3', 'u4', 'u3']);
    expect(res).toEqual({ ok: true, data: [
      { userId: 'u2', seesAll: true, visibleCount: 27, totalCount: 27 },
      { userId: 'u3', seesAll: false, visibleCount: 10, totalCount: 27 },
      { userId: 'u4', seesAll: false, visibleCount: 0, totalCount: 27 },
    ] });
  });

  it('never reports more than the owner sees', async () => {
    const t = setup({ recipientTotals: totals({ u2: 99 }) });
    const res = await t.svc.assessRecipients('r1', ['u2']);
    expect(res.ok && res.data[0]).toMatchObject({ seesAll: true, visibleCount: 27 });
  });

  it('refuses a missing report and does nothing when nobody is chosen', async () => {
    const t = setup({ recipientTotals: totals({}) });
    expect(await t.svc.assessRecipients('nope', ['u2'])).toEqual({ ok: false, error: 'REPORT_NOT_FOUND' });
    expect(await t.svc.assessRecipients('r1', [])).toEqual({ ok: true, data: [] });
  });

  it('stores the skip choice, drops choices for people who are not recipients, and treats no choice as narrow', async () => {
    const t = setup({ recipientTotals: totals({ u2: 27, u3: 10 }) });
    const made = await t.svc.create(draft({ recipientChoices: { u3: 'skip', u2: 'narrow', u9: 'skip' } }));
    expect(made.ok && made.data.recipientChoices).toEqual({ u3: 'skip' });
    expect(validateScheduleDraft(draft({ recipientChoices: { u3: 'send-anyway' as never } }))).toBe('BAD_RECIPIENT_CHOICE');
  });

  it('a run narrows, skips or sends in full exactly as the owner chose, and records who got what', async () => {
    const t = setup({ recipientTotals: totals({ u2: 27, u3: 10, u4: 0 }) });
    const made = await t.svc.create(draft({ recipientUserIds: ['u2', 'u3', 'u4'], recipientChoices: { u4: 'skip' } }));
    const ran = await t.svc.runNow(made.ok ? made.data.id : '');
    const last = ran.ok ? ran.data.lastRun : undefined;
    expect(last?.status).toBe('simulated');
    expect(last?.recipients).toEqual([
      { userId: 'u2', outcome: 'full', caseCount: 27 },
      { userId: 'u3', outcome: 'narrowed', caseCount: 10 },
      { userId: 'u4', outcome: 'skipped', caseCount: 0 },
    ]);
    expect(last?.recipientCount).toBe(2);
  });

  it('checks access when the run happens, not when the schedule was saved', async () => {
    let visible: Record<string, number> = { u2: 27, u3: 27 };
    const t = setup({ recipientTotals: vi.fn(async () => ({ ok: true as const, data: { ownerTotal: 27, visibleTotals: visible } })) });
    const made = await t.svc.create(draft());
    const id = made.ok ? made.data.id : '';
    const first = await t.svc.runNow(id);
    expect(first.ok && first.data.lastRun?.recipients?.every(r => r.outcome === 'full')).toBe(true);
    visible = { u2: 27, u3: 5 };
    const second = await t.svc.runNow(id);
    expect(second.ok && second.data.lastRun?.recipients?.find(r => r.userId === 'u3')).toMatchObject({ outcome: 'narrowed', caseCount: 5 });
  });

  it('a run that cannot work out what a recipient may see builds nothing for anyone', async () => {
    const t = setup({ recipientTotals: vi.fn(async () => ({ ok: false as const, error: 'RECIPIENT_ACCESS_UNKNOWN' })) });
    const made = await t.svc.create(draft());
    const ran = await t.svc.runNow(made.ok ? made.data.id : '');
    expect(ran.ok && ran.data.lastRun).toMatchObject({ status: 'failed', recipientCount: 0, message: 'RECIPIENT_ACCESS_UNKNOWN' });
    expect(ran.ok && ran.data.lastRun?.recipients).toBeUndefined();
  });

  it('the run audit says how many were narrowed or skipped, never who', async () => {
    const t = setup({ recipientTotals: totals({ u2: 27, u3: 10, u4: 0 }) });
    const made = await t.svc.create(draft({ recipientUserIds: ['u2', 'u3', 'u4'], recipientChoices: { u4: 'skip' } }));
    await t.svc.runNow(made.ok ? made.data.id : '');
    const run = t.audit.mock.calls.map(c => c[0]).find(e => e.event === 'Report Schedule Run');
    expect(run.detail).toContain('Access: 1 narrowed to what the recipient may see, 1 skipped, as the schedule\'s owner chose.');
    expect(JSON.stringify(t.audit.mock.calls)).not.toMatch(/u2|u3|u4/);
  });

  it('without an access check every recipient gets the whole report', async () => {
    const t = setup();
    const made = await t.svc.create(draft());
    const ran = await t.svc.runNow(made.ok ? made.data.id : '');
    expect(ran.ok && ran.data.lastRun?.recipients?.every(r => r.outcome === 'full' && r.caseCount === 27)).toBe(true);
  });
});
