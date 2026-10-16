// src/services/tumorBoard/tumorBoardBatchLock.test.ts
import { describe, it, expect } from 'vitest';
import { isTumorBoardBatchLocked } from './tumorBoardBatchLock';

describe('isTumorBoardBatchLocked', () => {
  it('is false for a listing with no meetingDate yet — nothing to freeze', () => {
    expect(isTumorBoardBatchLocked(undefined, undefined, new Date('2026-10-08T12:00:00.000Z'), 'UTC', 48)).toBe(false);
  });

  it('is false comfortably ahead of the cut-off', () => {
    // Meeting Dec 1 09:00 UTC; "now" Oct 8 — weeks away, well outside a 48h cutoff.
    expect(isTumorBoardBatchLocked('2026-12-01', '09:00', new Date('2026-10-08T12:00:00.000Z'), 'UTC', 48)).toBe(false);
  });

  it('is true once inside the cut-off window', () => {
    // Meeting Dec 1 09:00 UTC; "now" Nov 30 10:00 UTC — 23h before the meeting, inside a 48h cutoff.
    expect(isTumorBoardBatchLocked('2026-12-01', '09:00', new Date('2026-11-30T10:00:00.000Z'), 'UTC', 48)).toBe(true);
  });

  it('is false just outside the cut-off window, true just inside it', () => {
    const meetingInstant = new Date('2026-12-01T09:00:00.000Z').getTime();
    const justOutside = new Date(meetingInstant - 48 * 60 * 60 * 1000 - 60_000); // 49h before
    const justInside = new Date(meetingInstant - 48 * 60 * 60 * 1000 + 60_000); // 47h before
    expect(isTumorBoardBatchLocked('2026-12-01', '09:00', justOutside, 'UTC', 48)).toBe(false);
    expect(isTumorBoardBatchLocked('2026-12-01', '09:00', justInside, 'UTC', 48)).toBe(true);
  });

  it('is true once the meeting itself has already passed', () => {
    expect(isTumorBoardBatchLocked('2020-01-01', '09:00', new Date('2026-10-08T12:00:00.000Z'), 'UTC', 48)).toBe(true);
  });

  it('a date-only (no time) session locks relative to end-of-day, not midnight', () => {
    // Meeting Dec 1, no time — treated as 23:59. 10h before 23:59 is well
    // inside a 48h cutoff; 10h before 00:00 (if midnight were used instead) would not be.
    const tenHoursBeforeEndOfDay = new Date('2026-11-30T13:59:00.000Z');
    expect(isTumorBoardBatchLocked('2026-12-01', undefined, tenHoursBeforeEndOfDay, 'UTC', 48)).toBe(true);
  });

  it('a cutoffHours of 0 locks only once the meeting instant itself has arrived', () => {
    expect(isTumorBoardBatchLocked('2026-12-01', '09:00', new Date('2026-12-01T08:59:00.000Z'), 'UTC', 0)).toBe(false);
    expect(isTumorBoardBatchLocked('2026-12-01', '09:00', new Date('2026-12-01T09:00:00.000Z'), 'UTC', 0)).toBe(true);
  });

  it('respects a non-UTC facility timezone', () => {
    // 09:00 America/Phoenix (UTC-7, no DST) is 16:00 UTC. 1h before that
    // local time is inside a 2h cutoff; 3h before is not.
    const oneHourBefore = new Date('2026-12-01T15:00:00.000Z');
    const threeHoursBefore = new Date('2026-12-01T13:00:00.000Z');
    expect(isTumorBoardBatchLocked('2026-12-01', '09:00', oneHourBefore, 'America/Phoenix', 2)).toBe(true);
    expect(isTumorBoardBatchLocked('2026-12-01', '09:00', threeHoursBefore, 'America/Phoenix', 2)).toBe(false);
  });
});
