// Batch 436 (PS-356): a QA client scope matches the case's ordering facility.
import { describe, it, expect } from 'vitest';
import { caseMatchesScope } from './qaScope';

describe('caseMatchesScope', () => {
  it('client scope = the ordering facility', () => {
    expect(caseMatchesScope({ order: { facilityId: 'c-mft-01' } }, { level: 'client', clientId: 'c-mft-01' })).toBe(true);
    expect(caseMatchesScope({ order: { facilityId: 'c-mft-02' } }, { level: 'client', clientId: 'c-mft-01' })).toBe(false);
    expect(caseMatchesScope({}, { level: 'client', clientId: 'c-mft-01' })).toBe(false);
  });
  it('enterprise scope = everything', () => {
    expect(caseMatchesScope({}, { level: 'enterprise' })).toBe(true);
  });
});
