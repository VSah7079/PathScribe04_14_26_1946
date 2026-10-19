// Batch 619 (PS-800): the schedule editor's helpers.
import { describe, expect, it } from 'vitest';
import { IMMEDIATE_SCHEDULE } from '@/services/deliverySchedules/deliverySchedule';
import { draftFrom, parseDates, toggleDay, withKind } from './deliveryScheduleForm';

describe('deliveryScheduleForm', () => {
  it('toggles a weekday in order', () => {
    expect(toggleDay([1, 3], 2)).toEqual([1, 2, 3]);
    expect(toggleDay([1, 2, 3], 2)).toEqual([1, 3]);
  });
  it('parses dates split by spaces, commas or semicolons, once each and sorted', () => {
    expect(parseDates('2027-01-01, 2026-12-25;2026-12-25  ')).toEqual(['2026-12-25', '2027-01-01']);
    expect(parseDates('')).toEqual([]);
  });
  it('a copy does not share arrays with the original', () => {
    const s = { ...IMMEDIATE_SCHEDULE, batchDays: [1] };
    const d = draftFrom(s);
    d.batchDays.push(2);
    expect(s.batchDays).toEqual([1]);
  });
  it('switching kind supplies starting values and a real time zone', () => {
    const w = withKind(IMMEDIATE_SCHEDULE, 'windows');
    expect(w.windows).toHaveLength(1);
    expect(w.timeZone).toBe('America/New_York');
    const b = withKind(IMMEDIATE_SCHEDULE, 'batch');
    expect(b.batchTimes).toEqual(['22:00']);
    expect(b.batchDays).toEqual([1, 2, 3, 4, 5]);
    expect(withKind(w, 'hold_until_sign_out').kind).toBe('hold_until_sign_out');
  });
});
