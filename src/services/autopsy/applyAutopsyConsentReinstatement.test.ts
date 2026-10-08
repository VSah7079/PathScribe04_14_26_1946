import { describe, it, expect } from 'vitest';
import { applyAutopsyConsentReinstatement } from './applyAutopsyConsentReinstatement';
import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';

function baseDetails(overrides: Partial<AutopsyCaseDetails> = {}): AutopsyCaseDetails {
  return {
    jurisdiction: 'US', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false },
    hospitalConsent: {
      consentingRelativeName: 'Jane Doe', consentingRelativeRelationship: 'spouse',
      consentGivenAt: '2026-10-01T00:00:00Z', status: 'narrowed', consentScope: ['Complete autopsy'],
      excludedOrgans: ['brain'], retentionPermitted: false, statusChangedAt: '2026-10-02T00:00:00Z',
    },
    ...overrides,
  } as AutopsyCaseDetails;
}

describe('applyAutopsyConsentReinstatement', () => {
  it('reinstates status back to active, unlike the narrowing function', () => {
    const result = applyAutopsyConsentReinstatement(baseDetails(), {
      status: 'active', excludedOrgans: [], retentionPermitted: true, reinstatementNote: 'Family confirmed full consent restored', changedAt: '2026-10-06T00:00:00Z',
    });
    expect(result.hospitalConsent).toEqual(expect.objectContaining({
      status: 'active', excludedOrgans: [], retentionPermitted: true, statusChangedAt: '2026-10-06T00:00:00Z', revocationNote: 'Family confirmed full consent restored',
    }));
  });

  it('reinstates from revoked back to narrowed, lifting one exclusion but keeping another', () => {
    const revoked = baseDetails({ hospitalConsent: { ...baseDetails().hospitalConsent!, status: 'revoked', excludedOrgans: ['brain', 'heart'], retentionPermitted: false } });
    const result = applyAutopsyConsentReinstatement(revoked, {
      status: 'narrowed', excludedOrgans: ['heart'], retentionPermitted: true, reinstatementNote: 'Family reinstated narrowed consent, keeping cardiac exclusion',
    });
    expect(result.hospitalConsent?.status).toBe('narrowed');
    expect(result.hospitalConsent?.excludedOrgans).toEqual(['heart']);
    expect(result.hospitalConsent?.retentionPermitted).toBe(true);
  });

  it('a forensic case is returned unchanged (no hospitalConsent to reinstate)', () => {
    const details = baseDetails({ caseAuthority: 'statutory_judicial', hospitalConsent: undefined });
    const result = applyAutopsyConsentReinstatement(details, { status: 'active', excludedOrgans: [], retentionPermitted: true, reinstatementNote: 'n/a' });
    expect(result).toBe(details);
  });

  it('a hospital-consented case with no hospitalConsent record yet is returned unchanged', () => {
    const details = baseDetails({ hospitalConsent: undefined });
    const result = applyAutopsyConsentReinstatement(details, { status: 'active', excludedOrgans: [], retentionPermitted: true, reinstatementNote: 'n/a' });
    expect(result).toBe(details);
  });

  it('defaults changedAt to now when not given', () => {
    const before = Date.now();
    const result = applyAutopsyConsentReinstatement(baseDetails(), { status: 'active', excludedOrgans: [], retentionPermitted: true, reinstatementNote: 'n/a' });
    expect(new Date(result.hospitalConsent!.statusChangedAt!).getTime()).toBeGreaterThanOrEqual(before);
  });
});
