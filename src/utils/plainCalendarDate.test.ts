import { describe, it, expect } from 'vitest';
import { plainCalendarDate } from './plainCalendarDate';
import { formatDate } from './formatDate';

describe('plainCalendarDate (Batch 707)', () => {
  it('keeps the entered date exactly', () => { expect(plainCalendarDate('1980-05-14')).toBe('1980-05-14'); });
  it('refuses a timestamp or a blank', () => {
    expect(() => plainCalendarDate('1980-05-14T00:00:00.000Z')).toThrow();
    expect(() => plainCalendarDate('')).toThrow();
  });
  it('shows the same day in a US time zone (the old stored timestamp did not)', () => {
    const prev = process.env.TZ;
    try {
      process.env.TZ = 'America/Phoenix';
      expect(new Date('1980-05-14').toISOString()).toBe('1980-05-14T00:00:00.000Z');
      expect(formatDate(plainCalendarDate('1980-05-14'))).toContain('14');
    } finally { process.env.TZ = prev; }
  });
});
