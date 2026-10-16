// Batch 512: override rows show each rate as the override's own value or as inherited.
import { describe, it, expect } from 'vitest';
import { describeQcOverrideRates } from './describeQcOverrideRates';

const enterprise = { negativeRandomSelectionRatePercent: 10, nonNegativeRandomSelectionRatePercent: 25 } as never;

describe('describeQcOverrideRates', () => {
  it('both rates set: both are the override\'s own', () => {
    expect(describeQcOverrideRates({ negativeRandomSelectionRatePercent: 20, nonNegativeRandomSelectionRatePercent: 30 }, enterprise))
      .toEqual({ negative: { kind: 'own', value: 20 }, nonNegative: { kind: 'own', value: 30 } });
  });
  it('a facility row missing a rate shows the enterprise value as inherited (no more "undefined%")', () => {
    expect(describeQcOverrideRates({ negativeRandomSelectionRatePercent: 20 }, enterprise))
      .toEqual({ negative: { kind: 'own', value: 20 }, nonNegative: { kind: 'inherited', value: 25 } });
  });
  it('a staff row missing a rate shows "inherited" without a number (it depends on the facility)', () => {
    expect(describeQcOverrideRates({ nonNegativeRandomSelectionRatePercent: 5 }, null))
      .toEqual({ negative: { kind: 'inherited', value: null }, nonNegative: { kind: 'own', value: 5 } });
  });
  it('0 is a real rate, not "missing"', () => {
    expect(describeQcOverrideRates({ negativeRandomSelectionRatePercent: 0, nonNegativeRandomSelectionRatePercent: 0 }, enterprise).negative)
      .toEqual({ kind: 'own', value: 0 });
  });
});
