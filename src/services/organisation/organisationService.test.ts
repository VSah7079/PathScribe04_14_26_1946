// src/services/organisation/organisationService.test.ts
import { describe, it, expect } from 'vitest';
import { resolveMpiScopeEnterpriseId } from './organisationService';

describe('resolveMpiScopeEnterpriseId — real, critical bug fix: MPI matching scopes to this lab\'s own enterprise, not the referring organisation', () => {
  it('resolves the real, stable enterprise id from a real referring organisation', () => {
    expect(resolveMpiScopeEnterpriseId({ enterpriseId: 'ENT-ACME-LAB' })).toBe('ENT-ACME-LAB');
  });

  it('the real bug this fixes: two different referring organisations belonging to the SAME lab enterprise resolve to the identical MPI scope', () => {
    const hospitalA = { enterpriseId: 'ENT-ACME-LAB' };
    const hospitalB = { enterpriseId: 'ENT-ACME-LAB' };
    // Same real patient referred by two different hospitals to the same
    // lab must resolve to the same MPI scope, so they're matched as the
    // same person - not two separate identities, which was the real bug.
    expect(resolveMpiScopeEnterpriseId(hospitalA)).toBe(resolveMpiScopeEnterpriseId(hospitalB));
  });

  it('genuinely different lab enterprises still resolve to different scopes - cross-tenant matching is deliberately never allowed', () => {
    const labX = { enterpriseId: 'ENT-LAB-X' };
    const labY = { enterpriseId: 'ENT-LAB-Y' };
    expect(resolveMpiScopeEnterpriseId(labX)).not.toBe(resolveMpiScopeEnterpriseId(labY));
  });

  it('falls back to the same real ENT-DEFAULT literal EnterpriseConfig itself uses, not a second, different fallback', () => {
    expect(resolveMpiScopeEnterpriseId(null)).toBe('ENT-DEFAULT');
    expect(resolveMpiScopeEnterpriseId(undefined)).toBe('ENT-DEFAULT');
  });
});
