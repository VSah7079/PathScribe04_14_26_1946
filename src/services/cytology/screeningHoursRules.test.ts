// src/services/cytology/screeningHoursRules.test.ts — Batch 572 (F7, option C).
import { describe, it, expect } from 'vitest';
import { hoursThatCount, isCorrection, isFlagged, isSignOffStale, latestSignOff, showScreeningHoursPanel, normaliseDayStartHour, previousDay, signOffDays, yesterdayNeedsSignOff, recordedHoursForDay, screeningDay, signOffProblem } from './screeningHoursRules';

// Phoenix is UTC-7 all year: 9:00 local is 16:00Z.
const TZ = 'America/Phoenix';
const at = (y: number, m: number, d: number, h: number) => new Date(Date.UTC(y, m - 1, d, h + 7)).toISOString();

describe('screening hours rules', () => {
  it("recorded hours: the person's entries on the lab's day (its time zone)", () => {
    const entries = [
      { userId: 'u1', completedAt: at(2026, 10, 14, 9), activeDurationSeconds: 3600 },
      { userId: 'u1', completedAt: at(2026, 10, 14, 15), activeDurationSeconds: 1800 },
      { userId: 'u1', completedAt: at(2026, 10, 13, 15), activeDurationSeconds: 7200 },
      { userId: 'u2', completedAt: at(2026, 10, 14, 10), activeDurationSeconds: 3600 },
    ];
    expect(recordedHoursForDay(entries, 'u1', '2026-10-14', TZ)).toBe(1.5);
    // 23:00 in Phoenix is the next day in UTC; it still counts for the lab's day.
    expect(screeningDay(at(2026, 10, 14, 23), TZ)).toBe('2026-10-14');
  });
  it('a confirmation needs nothing; a correction needs a reason, and a note for "other"', () => {
    expect(signOffProblem(6, 6.02, undefined, undefined)).toBeNull();
    expect(signOffProblem(6, 7, undefined, undefined)).toBe('reasonRequired');
    expect(signOffProblem(6, 7, 'microscopeOffScreen', undefined)).toBeNull();
    expect(signOffProblem(6, 7, 'other', '  ')).toBe('noteRequired');
    expect(signOffProblem(6, 7, 'other', 'Covered for a colleague')).toBeNull();
    expect(signOffProblem(6, -1, undefined, undefined)).toBe('hoursInvalid');
    expect(signOffProblem(6, 25, 'other', 'x')).toBe('hoursInvalid');
    expect(signOffProblem(6, Number.NaN, undefined, undefined)).toBe('hoursInvalid');
  });
  it('a correction beyond half an hour is flagged', () => {
    expect(isCorrection(6, 6.3)).toBe(true);
    expect(isFlagged(6, 6.5)).toBe(false);
    expect(isFlagged(6, 6.6)).toBe(true);
    expect(isFlagged(6, 5.4)).toBe(true);
  });
  it('the latest sign-off counts; with none, the recorded hours', () => {
    const a = { id: 'a', userId: 'u1', date: '2026-10-14', recordedHours: 6, signedHours: 6, flagged: false, signedAt: '2026-10-14T17:00:00Z' };
    const b = { ...a, id: 'b', signedHours: 7, reasonId: 'microscopeOffScreen' as const, signedAt: '2026-10-14T17:05:00Z' };
    expect(latestSignOff([a, b], 'u1', '2026-10-14')?.id).toBe('b');
    expect(latestSignOff([a, b], 'u1', '2026-10-15')).toBeNull();
    expect(hoursThatCount(6, b)).toBe(7);
    expect(hoursThatCount(6, null)).toBe(6);
  });

  it('compares to one decimal, as shown: 6.04 confirmed as 6.0 is no correction; 6.05 vs 6.0 is', () => {
    expect(isCorrection(6.04, 6.0)).toBe(false);
    expect(isCorrection(6.05, 6.0)).toBe(true);
    expect(signOffProblem(6.04, 6.0, undefined, undefined)).toBeNull();
  });
  it('a sign-off made before more screening was recorded is out of date and stops counting', () => {
    const s = { id: 's', userId: 'u1', date: '2026-10-14', recordedHours: 3, signedHours: 3, flagged: false, signedAt: '2026-10-14T21:00:00Z' };
    expect(isSignOffStale(s, 3)).toBe(false);
    expect(isSignOffStale(s, 5)).toBe(true);
    expect(hoursThatCount(5, s)).toBe(5);
    expect(isSignOffStale(null, 5)).toBe(false);
  });

  it('the panel shows once something is recorded, or a sign-off exists; not at 0.0 h', () => {
    expect(showScreeningHoursPanel(null)).toBe(false);
    expect(showScreeningHoursPanel({ recordedHours: 0, signOff: null })).toBe(false);
    expect(showScreeningHoursPanel({ recordedHours: 0.2, signOff: null })).toBe(true);
    expect(showScreeningHoursPanel({ recordedHours: 0, signOff: { id: 's', userId: 'u', date: 'd', recordedHours: 0, signedHours: 1, flagged: true, signedAt: 'x' } })).toBe(true);
  });

  it('Batch 574: the lab\'s day can start at a set hour; a night shift falls on one date', () => {
    // Phoenix is UTC-7 all year. 23:30 on the 14th and 05:30 on the 15th, local.
    const late = '2026-10-15T06:30:00Z'; const early = '2026-10-15T12:30:00Z';
    expect([screeningDay(late, 'America/Phoenix'), screeningDay(early, 'America/Phoenix')]).toEqual(['2026-10-14', '2026-10-15']);
    expect([screeningDay(late, 'America/Phoenix', 6), screeningDay(early, 'America/Phoenix', 6)]).toEqual(['2026-10-14', '2026-10-14']);
    // 06:00 exactly starts the new day.
    expect(screeningDay('2026-10-15T13:00:00Z', 'America/Phoenix', 6)).toBe('2026-10-15');
    expect(normaliseDayStartHour(25)).toBe(0);
    expect(normaliseDayStartHour(6.5)).toBe(0);
    expect(normaliseDayStartHour(undefined)).toBe(0);
  });
  it('Batch 574: the day before, across months and years; today and yesterday to sign off', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
    expect(signOffDays('2026-10-15T12:30:00Z', 'America/Phoenix')).toEqual({ today: '2026-10-15', yesterday: '2026-10-14' });
  });
  it('Batch 574: yesterday is offered while it has hours and no current sign-off', () => {
    const s = (recordedHours: number) => ({ id: 's', userId: 'u1', date: '2026-10-14', recordedHours, signedHours: recordedHours, flagged: false, signedAt: '2026-10-15T07:00:00Z' });
    expect(yesterdayNeedsSignOff({ recordedHours: 2, signOff: null })).toBe(true);
    expect(yesterdayNeedsSignOff({ recordedHours: 0, signOff: null })).toBe(false);
    expect(yesterdayNeedsSignOff({ recordedHours: 2, signOff: s(2) })).toBe(false);
    expect(yesterdayNeedsSignOff({ recordedHours: 3, signOff: s(2) })).toBe(true);
    expect(yesterdayNeedsSignOff(null)).toBe(false);
  });
});
