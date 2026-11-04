// src/services/cytology/cytologyWorkloadSummary.test.ts — Batch 574: reviews done and left, before the limit.
import { describe, it, expect } from 'vitest';
import { loadCytologyWorkloadSummary, resolveCytologyWorkloadSummary } from './cytologyWorkloadSummary';

const e = (scuWeight: number, minutes: number) => ({ scuWeight, activeDurationSeconds: minutes * 60 });

describe('resolveCytologyWorkloadSummary', () => {
  it('38 slides in 4.5 h with a cap of 100: limit so far 56.2, 18 left now (down to the half slide), 62 left in a full day', () => {
    const entries = [...Array.from({ length: 30 }, () => e(1, 6)), ...Array.from({ length: 16 }, () => e(0.5, 5.625))];
    const s = resolveCytologyWorkloadSummary(entries, 100);
    expect(s).toMatchObject({ reviews: 46, slidesCounted: 38, hours: 4.5, cap: 100, limitNow: 56.2, leftNow: 18, leftFullDay: 62, status: 'ok', percentOfCap: 38, limitPercentOfCap: 56, fullPeriodReached: false });
  });
  it('never shows room the save-time check would refuse: exact hours, rounded down, the next review\'s weight', () => {
    // 1.96 h with a cap of 100: the check's limit is 24.5. 24.5 used: nothing fits, even a 0.5 review.
    const s = resolveCytologyWorkloadSummary([...Array.from({ length: 49 }, () => e(0.5, 0)), e(0, 1.96 * 60)], 100);
    expect(s).toMatchObject({ slidesCounted: 24.5, hours: 2, leftNow: 0, status: 'atLimit' });
    // 1 slide of room: a manual rescreen (1.5) wouldn't fit, a manual slide (1) would.
    const room = [...Array.from({ length: 24 }, () => e(1, 0)), e(0, 2 * 60)]; // limit 25, used 24
    expect(resolveCytologyWorkloadSummary(room, 100, 0, 1.5).status).toBe('atLimit');
    expect(resolveCytologyWorkloadSummary(room, 100, 0, 1).status).toBe('approaching');
  });
  it('a pathologist review (weight 0) is not a review that counts', () => {
    expect(resolveCytologyWorkloadSummary([e(0, 10), e(1, 10)], 100).reviews).toBe(1);
  });
  it('nothing yet: no "left now" (it would say 0), the full day left', () => {
    expect(resolveCytologyWorkloadSummary([], 80)).toMatchObject({ limitNow: null, leftNow: null, leftFullDay: 80, status: 'ok', percentOfCap: 0 });
  });
  it('the review open now counts toward the hours', () => {
    expect(resolveCytologyWorkloadSummary([], 100, 1800)).toMatchObject({ hours: 0.5, limitNow: 6.2, leftNow: 6 });
  });
  it('approaching (85% of the limit so far), over; never below 0 left; the bar stops at 100; after 8 h one "left" figure', () => {
    expect(resolveCytologyWorkloadSummary([e(1, 120), ...Array.from({ length: 17 }, () => e(1, 0))], 80).status).toBe('approaching'); // 18 of 20
    const over = resolveCytologyWorkloadSummary(Array.from({ length: 110 }, () => e(1, 5)), 100);
    expect(over).toMatchObject({ status: 'over', leftNow: 0, leftFullDay: 0, percentOfCap: 100, limitNow: 100, fullPeriodReached: true });
  });
});

describe('loadCytologyWorkloadSummary', () => {
  const deps = (over: Record<string, unknown> = {}) => ({
    now: () => new Date('2026-10-15T20:00:00Z'),
    getComplianceSettings: async () => ({ enterprise: null, facility: null }),
    getFacilityJurisdiction: async () => 'US',
    getWorkloadCaps: async () => ({ enterprise: { dailySlideCap: 100 }, facility: null, staff: { overrides: { dailySlideCap: 80 } } }),
    getLedgerInWindow: async (_u: string, start: string, end: string) => {
      expect([start, end]).toEqual(['2026-10-14T20:00:00.000Z', '2026-10-15T20:00:00.000Z']);
      return { ok: true as const, data: [e(1, 60)] };
    },
    ...over,
  }) as never;
  it('the last 24 hours against the person\'s own cap', async () => {
    expect(await loadCytologyWorkloadSummary('ct1', { facilityId: 'f1' }, deps())).toMatchObject({ cap: 80, slidesCounted: 1, hours: 1 });
  });
  it('none when the lab has the workload cap off, without a jurisdiction (never assumed US), or the ledger can\'t be read', async () => {
    expect(await loadCytologyWorkloadSummary('ct1', { facilityId: 'f1' }, deps({ getFacilityJurisdiction: async () => 'GB' }))).toBeNull();
    expect(await loadCytologyWorkloadSummary('ct1', { jurisdiction: 'GB' }, deps())).toBeNull();
    expect(await loadCytologyWorkloadSummary('ct1', {}, deps())).toBeNull();
    expect(await loadCytologyWorkloadSummary('ct1', { facilityId: 'f1' }, deps({ getLedgerInWindow: async () => ({ ok: false, error: 'x' }) }))).toBeNull();
  });
  it('no case open (the worklist): the person\'s own cap if set, else the strictest of the enterprise and the facilities', async () => {
    const noStaff = { getWorkloadCaps: async () => ({ enterprise: { dailySlideCap: 100 }, facility: null, staff: null }), getAllFacilityWorkloadCaps: async () => [{ dailySlideCap: 90 }, { dailySlideCap: 70 }] };
    expect(await loadCytologyWorkloadSummary('ct1', { jurisdiction: 'US' }, deps(noStaff))).toMatchObject({ cap: 70 });
    expect(await loadCytologyWorkloadSummary('ct1', { jurisdiction: 'US' }, deps({ getAllFacilityWorkloadCaps: async () => [{ dailySlideCap: 60 }] }))).toMatchObject({ cap: 80 });
  });
});

describe('showCytologyWorkloadCounter', () => {
  it('only once something counts (a pathologist never sees an empty counter)', async () => {
    const { showCytologyWorkloadCounter } = await import('./cytologyWorkloadSummary');
    expect(showCytologyWorkloadCounter(null)).toBe(false);
    expect(showCytologyWorkloadCounter(resolveCytologyWorkloadSummary([e(0, 30)], 100))).toBe(false);
    expect(showCytologyWorkloadCounter(resolveCytologyWorkloadSummary([e(0.5, 3)], 100))).toBe(true);
  });
});
