import { describe, it, expect } from 'vitest';
import { DEFAULT_RECALL_WINDOWS, parseWindowInput, recallWindowProblem, recallWindowsProblem, resolveRecallWindows } from './recallWindows';
import { selfCollectedRecallFor } from './selfCollectedRecall';

describe('recall windows', () => {
  it('defaults: 2–4 urgent, 6–12 routine, 6–12 Australian repeat, no fixed period for a New Zealand repeat', () => {
    expect(resolveRecallWindows(undefined)).toEqual(DEFAULT_RECALL_WINDOWS);
    expect(DEFAULT_RECALL_WINDOWS.repeatNZ).toBeNull();
  });
  it('a saved window wins, including an explicit null; unsaved ones keep the default', () => {
    const w = resolveRecallWindows({ urgent: { min: 1, max: 2 }, repeatAU: null });
    expect(w.urgent).toEqual({ min: 1, max: 2 });
    expect(w.repeatAU).toBeNull();
    expect(w.routine).toEqual(DEFAULT_RECALL_WINDOWS.routine);
  });
  it('validates whole weeks, range and order', () => {
    expect(recallWindowProblem({ min: 2.5, max: 4 })).toBe('not-whole-weeks');
    expect(recallWindowProblem({ min: 0, max: 4 })).toBe('out-of-range');
    expect(recallWindowProblem({ min: 1, max: 53 })).toBe('out-of-range');
    expect(recallWindowProblem({ min: 8, max: 4 })).toBe('min-after-max');
    expect(recallWindowProblem({ min: 4, max: 4 })).toBeNull();
    expect(recallWindowProblem(null)).toBeNull();
    expect(recallWindowsProblem({ ...DEFAULT_RECALL_WINDOWS, routine: { min: 9, max: 3 } })).toEqual({ key: 'routine', problem: 'min-after-max' });
    expect(recallWindowsProblem(DEFAULT_RECALL_WINDOWS)).toBeNull();
  });
  it('parses the From/To boxes', () => {
    expect(parseWindowInput('', '')).toEqual({ window: null, problem: null });
    expect(parseWindowInput('6', '')).toMatchObject({ problem: 'incomplete' });
    expect(parseWindowInput('6', '12')).toEqual({ window: { min: 6, max: 12 }, problem: null });
    expect(parseWindowInput('12', '6').problem).toBe('min-after-max');
  });
  it('the recall uses the lab windows', () => {
    const w = resolveRecallWindows({ urgent: { min: 1, max: 3 }, repeatNZ: { min: 4, max: 8 } });
    expect(selfCollectedRecallFor('AU', 'Positive', { hpv16: true, hpv18Or45: false, otherHighRisk: false }, w)?.targetWeeks).toEqual({ min: 1, max: 3 });
    expect(selfCollectedRecallFor('NZ', 'Invalid', undefined, w)?.targetWeeks).toEqual({ min: 4, max: 8 });
    expect(selfCollectedRecallFor('AU', 'Invalid', undefined, w)?.targetWeeks).toEqual({ min: 6, max: 12 });
  });
});
