import { describe, it, expect } from 'vitest';
import { hpvTriageRowStatus } from './hpvTriageRowStatus';
import { resolveCytologyTriageState, isCytologyScreeningEligible } from './resolveCytologyTriageState';

describe('hpvTriageRowStatus (PS-174)', () => {
  it('says awaiting when no result, pending or not performed', () => {
    expect(hpvTriageRowStatus(undefined)).toBe('awaitingHpv');
    expect(hpvTriageRowStatus([{ cytologyScreening: { hpvResult: 'Pending' } }, {}])).toBe('awaitingHpv');
  });
  it('says the result was invalid when the platform reported Invalid', () => {
    expect(hpvTriageRowStatus([{ cytologyScreening: { hpvResult: 'Invalid' } }])).toBe('hpvInvalid');
  });
  it('an Invalid result never makes the case eligible for cytology screening', () => {
    const state = resolveCytologyTriageState('primary_hpv_reflex', 'Invalid', false);
    expect(state).toBe('awaiting_hpv_result');
    expect(isCytologyScreeningEligible(state)).toBe(false);
  });
});
