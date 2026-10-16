import { describe, it, expect, afterEach } from 'vitest';
import { ageFromDateOfBirth, calendarDateOf } from './ageFromDateOfBirth';

const originalTz = process.env.TZ;
afterEach(() => { if (originalTz === undefined) delete process.env.TZ; else process.env.TZ = originalTz; });

describe('ageFromDateOfBirth (Batch 504)', () => {
  it('whole years, the birthday counting on the day', () => {
    expect(ageFromDateOfBirth('1990-09-04', '2026-09-04')).toBe(36);
    expect(ageFromDateOfBirth('1990-09-05', '2026-09-04')).toBe(35);
    expect(ageFromDateOfBirth('1990-01-01', '2026-09-04')).toBe(36);
  });

  it('a viewer in the Americas: the age does not go up the day before the birthday (the old bug)', () => {
    process.env.TZ = 'America/Phoenix';
    // 31 Dec 2026, 18:00 in Phoenix; born 1 Jan 2001 → still 25.
    expect(ageFromDateOfBirth('2001-01-01', new Date(2026, 11, 31, 18, 0))).toBe(25);
    expect(ageFromDateOfBirth('2001-01-01', new Date(2027, 0, 1, 9, 0))).toBe(26);
  });

  it('a timestamped date of birth uses the date written in it', () => {
    expect(calendarDateOf('1988-04-02T00:00:00.000Z')).toEqual({ year: 1988, month: 4, day: 2 });
    expect(ageFromDateOfBirth('1988-04-02T00:00:00.000Z', '2026-04-01')).toBe(37);
  });

  it('nothing readable: undefined, never a guessed age', () => {
    expect(ageFromDateOfBirth(undefined)).toBeUndefined();
    expect(ageFromDateOfBirth('not-a-date')).toBeUndefined();
    expect(ageFromDateOfBirth('1990-13-40')).toBeUndefined();
  });
});
