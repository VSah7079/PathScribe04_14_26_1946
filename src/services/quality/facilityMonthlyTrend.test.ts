import { describe, it, expect } from 'vitest';
import { facilityMonthlyTrend, averageHours } from './facilityMonthlyTrend';

describe('facilityMonthlyTrend (Batch 504)', () => {
  const now = new Date('2026-10-09T12:00:00Z');

  it('buckets an event by the FACILITY\'s calendar month, not the viewing device\'s', () => {
    // 2026-10-01 05:30 UTC is still 30 September in Phoenix (UTC-7).
    const events = [{ at: '2026-10-01T05:30:00Z' }, { at: '2026-10-01T08:00:00Z' }];
    const phoenix = facilityMonthlyTrend(events, e => e.at, m => ({ total: m.length }), 'America/Phoenix', now);
    expect(phoenix.map(p => p.total)).toEqual([0, 0, 0, 0, 1, 1]);
    const london = facilityMonthlyTrend(events, e => e.at, m => ({ total: m.length }), 'Europe/London', now);
    expect(london.map(p => p.total)).toEqual([0, 0, 0, 0, 0, 2]);
  });

  it('six months, oldest first, labelled; items without a date are left out', () => {
    const trend = facilityMonthlyTrend([{ at: null }, { at: '2026-05-15T12:00:00Z' }], e => e.at, m => ({ total: m.length }), 'UTC', now);
    expect(trend).toHaveLength(6);
    expect(trend[0].total).toBe(1); // May
    expect(trend[5].total).toBe(0); // October
    expect(typeof trend[0].month).toBe('string');
  });

  it('averageHours: one decimal, null for an empty month', () => {
    expect(averageHours([{ a: '2026-10-01T00:00:00Z', b: '2026-10-01T03:00:00Z' }, { a: '2026-10-01T00:00:00Z', b: '2026-10-01T02:00:00Z' }], x => x.a, x => x.b)).toBe(2.5);
    expect(averageHours([], () => '', () => '')).toBeNull();
  });
});
