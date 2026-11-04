import { describe, it, expect } from 'vitest';
import { resolveAutopsyAccessionStatus } from './resolveAutopsyAccessionStatus';
import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';

function baseCase(overrides: Partial<AutopsyCaseDetails>): AutopsyCaseDetails {
  return {
    jurisdiction: 'US',
    caseAuthority: 'statutory_judicial',
    scope: 'full',
    addenda: [],
    ancillaryHold: { active: false },
    ...overrides,
  } as AutopsyCaseDetails;
}

describe('resolveAutopsyAccessionStatus', () => {
  it('a real forensic case with nothing logged at all is temporary', () => {
    expect(resolveAutopsyAccessionStatus(baseCase({}))).toBe('temporary');
  });

  it('a real forensic case with only a real, logged verbal order is still temporary \u2014 exactly the real "received and refrigerated, not yet authorized for gross exam" state', () => {
    const result = resolveAutopsyAccessionStatus(baseCase({
      forensicAuthorization: { authorityType: 'coroner', verbalOrderReceivedAt: '2026-09-01T02:15:00Z', verbalOrderReceivedFrom: 'On-call Deputy Coroner', orderReference: '', orderDate: '' },
    }));
    expect(result).toBe('temporary');
  });

  it('a real forensic case with a real, complete written order is fully_authorized', () => {
    const result = resolveAutopsyAccessionStatus(baseCase({
      forensicAuthorization: { authorityType: 'coroner', orderReference: 'CO-2026-4471', orderDate: '2026-09-01' },
    }));
    expect(result).toBe('fully_authorized');
  });

  it('a real hospital-consented case with no real consent record at all is temporary', () => {
    expect(resolveAutopsyAccessionStatus(baseCase({ caseAuthority: 'hospital_consented' }))).toBe('temporary');
  });

  it('a real hospital-consented case with real, active consent on file is fully_authorized', () => {
    const result = resolveAutopsyAccessionStatus(baseCase({
      caseAuthority: 'hospital_consented',
      hospitalConsent: { consentingRelativeName: 'Jane Doe', consentingRelativeRelationship: 'spouse_or_partner', consentGivenAt: '2026-09-01T10:00:00Z', status: 'active', consentScope: ['full'], excludedOrgans: [], retentionPermitted: true },
    }));
    expect(result).toBe('fully_authorized');
  });

  it('Batch 468: a real hospital-consented case with status \u2018narrowed\u2019 is still fully_authorized \u2014 narrowed consent only constrains what\u2019s examined/retained, never blocks gross exam', () => {
    const result = resolveAutopsyAccessionStatus(baseCase({
      caseAuthority: 'hospital_consented',
      hospitalConsent: { consentingRelativeName: 'Jane Doe', consentingRelativeRelationship: 'spouse_or_partner', consentGivenAt: '2026-09-01T10:00:00Z', status: 'narrowed', consentScope: ['full'], excludedOrgans: ['brain'], retentionPermitted: true },
    }));
    expect(result).toBe('fully_authorized');
  });

  it('a real hospital-consented case with status \u2018revoked\u2019 reverts to temporary \u2014 matching the gate\u2019s own criteria exactly', () => {
    const result = resolveAutopsyAccessionStatus(baseCase({
      caseAuthority: 'hospital_consented',
      hospitalConsent: {
        consentingRelativeName: 'Jane Doe', consentingRelativeRelationship: 'spouse_or_partner',
        consentGivenAt: '2026-09-01T10:00:00Z', status: 'revoked', consentScope: ['full'], excludedOrgans: [], retentionPermitted: true,
      },
    }));
    expect(result).toBe('temporary');
  });
});
