import { describe, it, expect } from 'vitest';
import { resolveCytologyCaseSeverities } from './resolveCytologyCaseSeverities';
import type { CytologyCategoryEntry } from './ICytologyCategoryService';

const cats = [
  { id: 'lsil', suggestedAbnormalSeverity: 'Abnormal' },
  { id: 'hsil', suggestedAbnormalSeverity: 'Critical' },
  { id: 'nilm' },
] as unknown as CytologyCategoryEntry[];

describe('resolveCytologyCaseSeverities', () => {
  it('uses the latest review per case', () => {
    const out = resolveCytologyCaseSeverities([
      { caseId: 'c1', primaryInterpretationId: 'hsil', recordedAt: '2026-01-01' },
      { caseId: 'c1', primaryInterpretationId: 'lsil', recordedAt: '2026-02-01' },
    ] as never, cats);
    expect(out).toEqual({ c1: 'Abnormal' });
  });
  it('omits cases with no severity', () => {
    expect(resolveCytologyCaseSeverities([{ caseId: 'c2', primaryInterpretationId: 'nilm', recordedAt: 'x' }] as never, cats)).toEqual({});
  });
  it('takes the highest of several interpretations', () => {
    const out = resolveCytologyCaseSeverities([{ caseId: 'c3', primaryInterpretationId: 'lsil', additionalInterpretations: [{ categoryId: 'hsil' }], recordedAt: 'x' }] as never, cats);
    expect(out.c3).toBe('Critical');
  });
});
