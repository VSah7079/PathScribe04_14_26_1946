// @vitest-environment happy-dom
// src/services/cytology/cytologyWorkloadCapRules.test.ts — Batch 576: a cap is 1–100 whole slides, everywhere.
import { describe, it, expect, vi } from 'vitest';

vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: vi.fn(async () => ({ allowed: true })) },
}));

import { cytologyWorkloadCapProblem, cytologyWorkloadCapError, withoutCapOverride } from './cytologyWorkloadCapRules';
import { resolveEffectiveCytologyWorkloadCap } from './resolveEffectiveCytologyWorkloadCap';
import { mockCytologyWorkloadCapSettingsService, createMockCytologyWorkloadCapSettingsService } from './mockCytologyWorkloadCapSettingsService';
import { mockFacilityCytologyWorkloadCapOverrideService } from './mockFacilityCytologyWorkloadCapOverrideService';
import { mockStaffCytologyWorkloadCapOverrideService } from './mockStaffCytologyWorkloadCapOverrideService';

describe('cytology workload cap: 1 to 100 whole slides', () => {
  it('the rule', () => {
    for (const ok of [1, 80, 100]) expect(cytologyWorkloadCapProblem(ok)).toBeNull();
    for (const bad of [0, 101, 1000, 80.5, NaN, undefined, '80']) expect(cytologyWorkloadCapProblem(bad)).toBe('capOutOfRange');
  });
  it('the enterprise, facility and staff settings refuse a cap outside it, and keep what was there', async () => {
    expect(await mockCytologyWorkloadCapSettingsService.update({ dailySlideCap: 1000 })).toEqual({ ok: false, error: 'capOutOfRange' });
    const after = await mockCytologyWorkloadCapSettingsService.get();
    expect(after.ok && after.data.dailySlideCap).toBe(100);
    expect(await mockFacilityCytologyWorkloadCapOverrideService.create('F-cap-test', { dailySlideCap: 0 })).toMatchObject({ ok: false, error: 'capOutOfRange' });
    expect(await mockStaffCytologyWorkloadCapOverrideService.create('U-cap-test', { dailySlideCap: 150 })).toMatchObject({ ok: false, error: 'capOutOfRange' });
    expect(await mockStaffCytologyWorkloadCapOverrideService.create('U-cap-test', { dailySlideCap: 80 })).toMatchObject({ ok: true });
    expect(await mockStaffCytologyWorkloadCapOverrideService.update('U-cap-test', { dailySlideCap: 80.5 })).toMatchObject({ ok: false, error: 'capOutOfRange' });
    await mockStaffCytologyWorkloadCapOverrideService.remove('U-cap-test');
  });

  it('a cap saved before the check (over 100, or broken) never loosens the limit', () => {
    const f = (cap: unknown) => ({ id: 'x', facilityId: 'F', overrides: { dailySlideCap: cap as number }, createdAt: '', updatedAt: '' });
    expect(resolveEffectiveCytologyWorkloadCap({ dailySlideCap: 100 }, f(1000), null).dailySlideCap).toBe(100);
    expect(resolveEffectiveCytologyWorkloadCap({ dailySlideCap: 100 }, f(NaN), null).dailySlideCap).toBe(100);
    expect(resolveEffectiveCytologyWorkloadCap({ dailySlideCap: 100 }, f(80), null).dailySlideCap).toBe(80);
  });
});

describe('Batch 578: the error beside its field, and who can still get an override', () => {
  it('names the tier and the reason; nothing when saved', () => {
    expect(cytologyWorkloadCapError('facility', { ok: true })).toBeNull();
    expect(cytologyWorkloadCapError('facility', { ok: false, error: 'capOutOfRange' })).toEqual({ tier: 'facility', code: 'capOutOfRange' });
    expect(cytologyWorkloadCapError('staff', { ok: false, error: 'Not permitted' })).toEqual({ tier: 'staff', code: 'failed' });
    expect(cytologyWorkloadCapError('enterprise', { ok: false })).toEqual({ tier: 'enterprise', code: 'failed' });
  });
  it('the add pickers offer only those without an override, in order', () => {
    const all = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(withoutCapOverride(all, ['b'])).toEqual([{ id: 'a' }, { id: 'c' }]);
    expect(withoutCapOverride(all, new Set(['a', 'b', 'c']))).toEqual([]);
    expect(withoutCapOverride(all, [])).toEqual(all);
  });
});

describe('Batch 578: the start-of-day history takes its time from the service clock', () => {
  it('a change is recorded as taking effect at the clock\'s moment, and an unchanged hour adds nothing', async () => {
    const at = new Date('2026-10-15T05:30:00Z');
    const svc = createMockCytologyWorkloadCapSettingsService(() => at);
    const before = await svc.get();
    if (!before.ok) throw new Error('setup failed');
    const from = before.data.screeningDayStartHour ?? 0;
    const to = (from + 22) % 24;
    const r = await svc.update({ screeningDayStartHour: to });
    if (!r.ok) throw new Error('not saved');
    const history = r.data.screeningDayStartHistory ?? [];
    expect(history[history.length - 1]).toEqual({ hour: to, effectiveFrom: '2026-10-15T05:30:00.000Z' });
    const n = r.data.screeningDayStartHistory?.length ?? 0;
    const again = await svc.update({ screeningDayStartHour: to });
    if (!again.ok) throw new Error('not saved');
    expect(again.data.screeningDayStartHistory?.length).toBe(n);
    await svc.reset(); // leave the shared demo storage as it was found
  });
});
