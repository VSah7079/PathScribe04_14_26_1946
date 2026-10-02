// src/services/quality/riskWeightInput.test.ts
import { describe, it, expect } from 'vitest';
import { parseRiskWeightInput } from './riskWeightInput';

describe('parseRiskWeightInput (Batch 432)', () => {
  it('blank is no weight; a number above 0 up to 10 is the multiplier; anything else is refused', () => {
    expect(parseRiskWeightInput('')).toBeNull();
    expect(parseRiskWeightInput(' 1.5 ')).toBe(1.5);
    expect(parseRiskWeightInput('2.345')).toBe(2.35);
    expect(parseRiskWeightInput('0')).toBe('invalid');
    expect(parseRiskWeightInput('-1')).toBe('invalid');
    expect(parseRiskWeightInput('11')).toBe('invalid');
    expect(parseRiskWeightInput('abc')).toBe('invalid');
  });
});
