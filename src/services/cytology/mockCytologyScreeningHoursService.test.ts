// @vitest-environment happy-dom
// src/services/cytology/mockCytologyScreeningHoursService.test.ts — Batch 572 (F7, option C).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const allowed = { value: true };
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: vi.fn(async () => ({ allowed: allowed.value })) },
}));
const ledger = vi.hoisted(() => ({ entries: [] as any[] }));
vi.mock('./mockCytologyWorkloadLedgerService', () => ({
  mockCytologyWorkloadLedgerService: { getAll: async () => ({ ok: true, data: ledger.entries }) },
}));

import { mockCytologyScreeningHoursService as svc, createMockCytologyScreeningHoursService } from './mockCytologyScreeningHoursService';
import { previousDay, screeningDay } from './screeningHoursRules';
import { mockCytologyWorkloadCapSettingsService } from './mockCytologyWorkloadCapSettingsService';

const TZ = 'America/Phoenix';
const today = screeningDay(new Date(), TZ);
const user = { id: 'ct-1', name: 'Cy Tech' };

beforeEach(() => {
  localStorage.clear();
  allowed.value = true;
  ledger.entries = [{ userId: 'ct-1', completedAt: new Date().toISOString(), activeDurationSeconds: 6 * 3600 }];
});

describe('mockCytologyScreeningHoursService', () => {
  it('the day: recorded hours from the ledger, no sign-off yet', async () => {
    const r = await svc.forDay('ct-1', today, TZ);
    expect(r.ok && r.data).toEqual({ date: today, recordedHours: 6, signOff: null });
  });
  it('confirming keeps the recorded figure; a correction keeps its reason, is flagged past half an hour, and the latest counts', async () => {
    const c = await svc.signOff(user, { date: today, signedHours: 6 }, TZ);
    expect(c.ok && c.data).toMatchObject({ recordedHours: 6, signedHours: 6, flagged: false });
    expect(c.ok && c.data.reasonId).toBeUndefined();
    const fix = await svc.signOff(user, { date: today, signedHours: 7, reasonId: 'microscopeOffScreen' }, TZ);
    expect(fix.ok && fix.data).toMatchObject({ signedHours: 7, reasonId: 'microscopeOffScreen', flagged: true });
    const day = await svc.forDay('ct-1', today, TZ);
    expect(day.ok && day.data.signOff?.signedHours).toBe(7);
    const all = await svc.getAll();
    expect(all.ok && all.data.length).toBe(2);
  });
  it('confirming the figure as shown (6.0 for 6.04 h) stores the recorded figure itself, with no reason needed', async () => {
    ledger.entries = [{ userId: 'ct-1', completedAt: new Date().toISOString(), activeDurationSeconds: Math.round(6.04 * 3600) }];
    const c = await svc.signOff(user, { date: today, signedHours: 6.0 }, TZ);
    expect(c.ok && c.data).toMatchObject({ recordedHours: 6.04, signedHours: 6.04, flagged: false });
  });
  it('refused without the capability, or without a reason for a correction', async () => {
    expect(await svc.signOff(user, { date: today, signedHours: 7 }, TZ)).toEqual({ ok: false, error: 'reasonRequired' });
    allowed.value = false;
    expect(await svc.signOff(user, { date: today, signedHours: 6 }, TZ)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });

  it('Batch 574: yesterday is offered while it still needs signing off, and can be signed off; older days cannot', async () => {
    const yesterday = previousDay(today);
    const yesterdayNoon = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    ledger.entries = [
      { userId: 'ct-1', completedAt: new Date().toISOString(), activeDurationSeconds: 3600 },
      { userId: 'ct-1', completedAt: yesterdayNoon, activeDurationSeconds: 2 * 3600 },
    ];
    const days = await svc.currentDays('ct-1', TZ);
    expect(days.ok && days.data.today).toMatchObject({ date: today, recordedHours: 1 });
    expect(days.ok && days.data.yesterday?.date).toBe(yesterday);
    expect(await svc.signOff(user, { date: yesterday, signedHours: days.ok ? days.data.yesterday!.recordedHours : 0 }, TZ)).toMatchObject({ ok: true });
    const after = await svc.currentDays('ct-1', TZ);
    expect(after.ok && after.data.yesterday).toBeNull();
    expect(await svc.signOff(user, { date: previousDay(yesterday), signedHours: 0 }, TZ)).toEqual({ ok: false, error: 'dateNotAllowed' });
  });
  it('Batch 574: the lab\'s start-of-day hour comes from the workload settings', async () => {
    await mockCytologyWorkloadCapSettingsService.update({ screeningDayStartHour: 6 });
    try {
      const days = await svc.currentDays('ct-1', TZ);
      expect(days.ok && days.data.dayStartHour).toBe(6);
      expect(days.ok && days.data.today.date).toBe(screeningDay(new Date(), TZ, 6));
    } finally {
      await mockCytologyWorkloadCapSettingsService.update({ screeningDayStartHour: 0 });
    }
  });

  it('Batch 576: on a fixed clock, around midnight in the lab: 23:30 belongs to that day; just after, yesterday is offered', async () => {
    ledger.entries = [{ userId: 'ct-1', completedAt: '2026-10-15T06:30:00.000Z', activeDurationSeconds: 2 * 3600 }]; // 23:30 on the 14th, Phoenix
    const before = createMockCytologyScreeningHoursService(() => new Date('2026-10-15T06:45:00Z'));
    const d1 = await before.currentDays('ct-1', TZ);
    expect(d1.ok && d1.data.today).toMatchObject({ date: '2026-10-14', recordedHours: 2 });
    expect(d1.ok && d1.data.yesterday).toBeNull();
    const after = createMockCytologyScreeningHoursService(() => new Date('2026-10-15T07:15:00Z')); // 00:15 on the 15th
    const d2 = await after.currentDays('ct-1', TZ);
    expect(d2.ok && d2.data.today.date).toBe('2026-10-15');
    expect(d2.ok && d2.data.yesterday).toMatchObject({ date: '2026-10-14', recordedHours: 2 });
    const signed = await after.signOff(user, { date: '2026-10-14', signedHours: 2 }, TZ);
    expect(signed.ok && signed.data.signedAt).toBe('2026-10-15T07:15:00.000Z');
  });
});
