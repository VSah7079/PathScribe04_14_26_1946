import { describe, it, expect } from 'vitest';
import { DEFAULT_SCREENING_INTERVALS as RULES, intervalMonthsFor, resolveScreeningIntervalAdherence } from './screeningIntervals';

describe('screening intervals (Batch 608, #52)', () => {
  it('finds the interval for a country and age, or nothing', () => {
    expect(intervalMonthsFor(RULES, 'GB_EW', 30)).toBe(36);
    expect(intervalMonthsFor(RULES, 'GB_EW', 55)).toBe(60);
    expect(intervalMonthsFor(RULES, 'GB_EW', 20)).toBeUndefined();
    expect(intervalMonthsFor(RULES, 'XX', 30)).toBeUndefined();
  });
  it('judges a screen on schedule or late, with a 3-month grace', () => {
    const base = { countryCode: 'GB_EW', dateOfBirth: '1990-01-01' };
    const r = resolveScreeningIntervalAdherence([
      { ...base, previousScreenAt: '2023-01-01', screenedAt: '2026-02-01' },   // 37 months: within 36 + 3
      { ...base, previousScreenAt: '2021-01-01', screenedAt: '2026-02-01' },   // 61 months: late
      { ...base, screenedAt: '2026-02-01' },                                   // no previous: not judged
    ], RULES);
    expect(r.GB_EW).toMatchObject({ evaluated: 2, onSchedule: 1, adherencePercent: 50 });
  });
  it('a country with nothing to judge has no percentage, not 0%', () => {
    const r = resolveScreeningIntervalAdherence([{ countryCode: 'FR', screenedAt: '2026-01-01' }], RULES);
    expect(r.FR.adherencePercent).toBeUndefined();
  });
  it('ignores a previous screen outside any rule band', () => {
    const r = resolveScreeningIntervalAdherence([{ countryCode: 'NL', dateOfBirth: '2000-01-01', previousScreenAt: '2024-01-01', screenedAt: '2026-01-01' }], RULES);
    expect(r.NL.evaluated).toBe(0);
  });
});
