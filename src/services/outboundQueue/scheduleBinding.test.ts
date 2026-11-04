import { describe, expect, it } from 'vitest';
import { createScheduleBinding, registryKeyOf } from './scheduleBinding';
import { IMMEDIATE_SCHEDULE, type DeliveryScheduleEntry } from '../deliverySchedules/deliverySchedule';

const entry = (o: Partial<DeliveryScheduleEntry> & { days?: number | null }): DeliveryScheduleEntry => ({
  id: 'e', feed: 'registry', facilityId: null, registryKey: registryKeyOf('seer'), updatedAt: 'x',
  schedule: { ...IMMEDIATE_SCHEDULE, reportingDeadlineDays: o.days ?? null }, ...o,
}) as DeliveryScheduleEntry;
const NOW = '2026-10-10T12:00:00Z';

describe('schedule binding', () => {
  it('reads the deadline status from the facility override, else the enterprise schedule (deadlineStatus)', async () => {
    const b = createScheduleBinding(async () => [entry({ days: 30 }), entry({ id: 'f', facilityId: 'f1', days: 5 })], () => NOW);
    expect((await b.deadline('registry', undefined, 'seer', '2026-10-01T00:00:00Z'))?.state).toBe('ok');
    expect((await b.deadline('registry', 'f1', 'seer', '2026-10-01T00:00:00Z'))?.state).toBe('overdue');
    expect((await b.deadline('registry', 'f2', 'seer', '2026-10-01T00:00:00Z'))?.dueAt).toBe('2026-10-31T00:00:00.000Z');
  });
  it('each registry has its own, a feed with no schedule or no deadline has none, and a bad date gives none', async () => {
    const b = createScheduleBinding(async () => [entry({ days: 30 })], () => NOW);
    expect((await b.deadline('registry', undefined, 'other', '2026-10-01T00:00:00Z'))?.state).toBe('none');
    expect(await b.deadline('referral', undefined, 'x', '2026-10-01T00:00:00Z')).toBeUndefined();
    expect(await b.deadline('registry', undefined, 'seer', 'nope')).toBeUndefined();
    expect(await b.scheduledFor('referral', undefined, 'x', NOW)).toBeUndefined();
  });
  it('an immediate schedule gives no scheduled time (it goes when queued)', async () => {
    const b = createScheduleBinding(async () => [entry({ days: 5 })], () => NOW);
    expect(await b.scheduledFor('registry', undefined, 'seer', NOW)).toBeUndefined();
  });
  it('a batch schedule gives the next run', async () => {
    const batch = entry({ days: 5, schedule: { ...IMMEDIATE_SCHEDULE, kind: 'batch', batchFrequency: 'daily', batchTimes: ['23:00'], timeZone: 'UTC', reportingDeadlineDays: 5 } as never });
    const b = createScheduleBinding(async () => [batch], () => NOW);
    expect(await b.scheduledFor('registry', undefined, 'seer', '2026-10-10T10:00:00Z')).toMatch(/^2026-10-10T23:00/);
  });
});
