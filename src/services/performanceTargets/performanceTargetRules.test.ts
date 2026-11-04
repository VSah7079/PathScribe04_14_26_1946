import { describe, expect, it } from 'vitest';
import {
  buildTargetProgress, evaluateCountTarget, periodBounds, performanceTargetAudit, previousPeriodBounds,
  targetKeyFromLabel, totalInPeriod, validatePerformanceTarget,
} from './performanceTargetRules';
import type { PerformanceTarget } from './IPerformanceTargetService';

const T = (over: Partial<PerformanceTarget> = {}): PerformanceTarget => ({
  id: 't1', key: 'cases_monthly', label: 'Cases per Month', description: '', value: 120, unit: 'cases', period: 'monthly', system: true, ...over,
});

describe('validatePerformanceTarget', () => {
  it('accepts a good target', () => {
    expect(validatePerformanceTarget({ label: 'Slides per week', value: 40, unit: 'cases', period: 'weekly' }, [T()])).toBeNull();
  });
  it('needs a label and a positive number', () => {
    expect(validatePerformanceTarget({ label: ' ', value: 5, unit: 'cases', period: 'daily' }, [])).toBe('labelRequired');
    expect(validatePerformanceTarget({ label: 'x', value: 0, unit: 'cases', period: 'daily' }, [])).toBe('valueInvalid');
    expect(validatePerformanceTarget({ label: 'x', value: Number.NaN, unit: 'cases', period: 'daily' }, [])).toBe('valueInvalid');
  });
  it('keeps a percentage within 100 and keys unique', () => {
    expect(validatePerformanceTarget({ label: 'QC', value: 101, unit: '%', period: 'monthly' }, [])).toBe('percentOutOfRange');
    expect(validatePerformanceTarget({ label: 'Cases per Month', value: 5, unit: 'cases', period: 'monthly' }, [T({ key: 'cases_per_month' })])).toBe('duplicateKey');
    expect(validatePerformanceTarget({ id: 't1', label: 'Cases per Month', value: 5, unit: 'cases', period: 'monthly' }, [T({ key: 'cases_per_month' })])).toBeNull();
  });
  it('makes a key from the label', () => {
    expect(targetKeyFromLabel(' Slides / Week! ')).toBe('slides_week');
  });
});

describe('periodBounds', () => {
  const now = new Date(2026, 9, 14, 10); // Wed 14 Oct 2026
  it('finds the month, quarter, year, week and day', () => {
    expect(periodBounds('monthly', now)).toEqual({ start: new Date(2026, 9, 1), end: new Date(2026, 10, 1) });
    expect(periodBounds('quarterly', now)).toEqual({ start: new Date(2026, 9, 1), end: new Date(2027, 0, 1) });
    expect(periodBounds('annually', now)).toEqual({ start: new Date(2026, 0, 1), end: new Date(2027, 0, 1) });
    expect(periodBounds('weekly', now)).toEqual({ start: new Date(2026, 9, 12), end: new Date(2026, 9, 19) });
    expect(periodBounds('daily', now)).toEqual({ start: new Date(2026, 9, 14), end: new Date(2026, 9, 15) });
  });
  it('finds the period before', () => {
    expect(previousPeriodBounds('monthly', now)).toEqual({ start: new Date(2026, 8, 1), end: new Date(2026, 9, 1) });
    expect(previousPeriodBounds('weekly', new Date(2026, 9, 12, 8)).start).toEqual(new Date(2026, 9, 5));
  });
});

describe('evaluateCountTarget', () => {
  const bounds = { start: new Date(2026, 9, 1), end: new Date(2026, 10, 1) };
  it('is met once the total reaches the target', () => {
    expect(evaluateCountTarget(120, 120, bounds, new Date(2026, 9, 10), false).state).toBe('met');
    expect(evaluateCountTarget(130, 120, bounds, new Date(2026, 10, 2), true).pct).toBe(108);
  });
  it('is on track or behind part-way through', () => {
    const mid = new Date(2026, 9, 16, 12); // about half way
    expect(evaluateCountTarget(70, 120, bounds, mid, false).state).toBe('onTrack');
    expect(evaluateCountTarget(30, 120, bounds, mid, false).state).toBe('behind');
  });
  it('is missed after the period ends', () => {
    expect(evaluateCountTarget(119, 120, bounds, new Date(2026, 10, 3), true).state).toBe('missed');
  });
});

describe('totalInPeriod and buildTargetProgress', () => {
  const now = new Date(2026, 9, 20, 9);
  const items = [
    { at: new Date(2026, 9, 3).toISOString(), amount: 1 },
    { at: new Date(2026, 9, 19).toISOString(), amount: 1 },
    { at: new Date(2026, 8, 15).toISOString(), amount: 1 },
    { at: undefined, amount: 1 },
  ];
  it('adds up what falls inside', () => {
    expect(totalInPeriod(items, periodBounds('monthly', now))).toBe(2);
  });
  it('builds a row per measured count target, current and previous', () => {
    const rows = buildTargetProgress([T({ value: 2 }), T({ id: 't2', key: 'tat_stat', unit: 'hours' })], { cases_monthly: items }, now);
    expect(rows).toHaveLength(1);
    expect(rows[0].current.state).toBe('met');
    expect(rows[0].previous.state).toBe('missed');
  });
});

describe('performanceTargetAudit', () => {
  it('records numbers only', () => {
    const e = performanceTargetAudit('changed', { label: 'Cases per Month', value: 130, unit: 'cases', period: 'monthly' }, 'Dr A', { value: 120, unit: 'cases', period: 'monthly' });
    expect(e.event).toBe('PERFORMANCE_TARGET_CHANGED');
    expect(e.detail).toContain('from 120 cases per monthly to 130 cases per monthly');
    expect(e.caseId).toBeNull();
  });
});
