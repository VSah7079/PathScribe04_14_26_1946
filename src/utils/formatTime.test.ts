import { describe, it, expect } from 'vitest';
import { formatTime } from './formatDate';

describe('formatTime (Batch 402)', () => {
  it('shows hours and minutes in the given locale, with a dash for nothing', () => {
    expect(formatTime(undefined)).toBe('—');
    expect(formatTime('not a date')).toBe('not a date');
    expect(formatTime('2026-09-30T13:05:00Z', 'en-US')).toMatch(/\d{1,2}:05/);
    expect(formatTime('2026-09-30T13:05:00Z', 'de')).toMatch(/\d{2}:05/);
  });
});
