import { describe, it, expect } from 'vitest';
import { applyAutopsyConsentStatusChange } from './applyAutopsyConsentStatusChange';
import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';

function baseDetails(overrides: Partial<AutopsyCaseDetails> = {}): AutopsyCaseDetails {
  return {
    jurisdiction: 'US', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false },
    hospitalConsent: {
      consentingRelativeName: 'Jane Doe', consentingRelativeRelationship: 'spouse',
      consentGivenAt: '2026-10-01T00:00:00Z', status: 'active', consentScope: ['Complete autopsy'],
      excludedOrgans: [], retentionPermitted: true,
    },
    ...overrides,
  };
}

describe('applyAutopsyConsentStatusChange', () => {
  it('narrows: sets excludedOrgans, retentionPermitted and statusChangedAt, keeps everything else', () => {
    const result = applyAutopsyConsentStatusChange(baseDetails(), {
      status: 'narrowed', excludedOrgans: ['brain'], retentionPermitted: false, changedAt: '2026-10-06T00:00:00Z',
    });
    expect(result.hospitalConsent).toEqual({
      consentingRelativeName: 'Jane Doe', consentingRelativeRelationship: 'spouse',
      consentGivenAt: '2026-10-01T00:00:00Z', status: 'narrowed', consentScope: ['Complete autopsy'],
      excludedOrgans: ['brain'], retentionPermitted: false, statusChangedAt: '2026-10-06T00:00:00Z', revocationNote: undefined,
    });
  });

  it('revokes with a note', () => {
    const result = applyAutopsyConsentStatusChange(baseDetails(), {
      status: 'revoked', excludedOrgans: [], retentionPermitted: false, revocationNote: 'Family withdrew consent by phone', changedAt: '2026-10-06T00:00:00Z',
    });
    expect(result.hospitalConsent?.status).toBe('revoked');
    expect(result.hospitalConsent?.revocationNote).toBe('Family withdrew consent by phone');
  });

  it('defaults changedAt to now when not given', () => {
    const before = Date.now();
    const result = applyAutopsyConsentStatusChange(baseDetails(), { status: 'revoked', excludedOrgans: [], retentionPermitted: false });
    expect(new Date(result.hospitalConsent!.statusChangedAt!).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('a forensic case is returned unchanged (no hospitalConsent to change)', () => {
    const details = baseDetails({ caseAuthority: 'statutory_judicial', hospitalConsent: undefined });
    const result = applyAutopsyConsentStatusChange(details, { status: 'revoked', excludedOrgans: [], retentionPermitted: false });
    expect(result).toBe(details);
  });

  it('a hospital-consented case with no hospitalConsent record yet is returned unchanged', () => {
    const details = baseDetails({ hospitalConsent: undefined });
    const result = applyAutopsyConsentStatusChange(details, { status: 'revoked', excludedOrgans: [], retentionPermitted: false });
    expect(result).toBe(details);
  });

  it('never widens: a status request backward (narrowed -> active) is refused, kept at the current status', () => {
    const narrowed = baseDetails({ hospitalConsent: { ...baseDetails().hospitalConsent!, status: 'narrowed', excludedOrgans: ['brain'], retentionPermitted: false } });
    const result = applyAutopsyConsentStatusChange(narrowed, { status: 'active', excludedOrgans: [], retentionPermitted: true });
    expect(result.hospitalConsent?.status).toBe('narrowed');
  });

  it('never widens: excludedOrgans is a union, a request that omits an already-excluded organ still excludes it', () => {
    const narrowed = baseDetails({ hospitalConsent: { ...baseDetails().hospitalConsent!, status: 'narrowed', excludedOrgans: ['brain'], retentionPermitted: true } });
    const result = applyAutopsyConsentStatusChange(narrowed, { status: 'narrowed', excludedOrgans: ['heart'], retentionPermitted: true });
    expect(result.hospitalConsent?.excludedOrgans.sort()).toEqual(['brain', 'heart']);
  });

  it('never widens: retentionPermitted only moves true -> false, a request to flip it back to true is refused', () => {
    const narrowed = baseDetails({ hospitalConsent: { ...baseDetails().hospitalConsent!, status: 'narrowed', excludedOrgans: [], retentionPermitted: false } });
    const result = applyAutopsyConsentStatusChange(narrowed, { status: 'narrowed', excludedOrgans: [], retentionPermitted: true });
    expect(result.hospitalConsent?.retentionPermitted).toBe(false);
  });

  it('a genuine further narrowing (already narrowed -> revoked, more exclusions) still applies', () => {
    const narrowed = baseDetails({ hospitalConsent: { ...baseDetails().hospitalConsent!, status: 'narrowed', excludedOrgans: ['brain'], retentionPermitted: true } });
    const result = applyAutopsyConsentStatusChange(narrowed, { status: 'revoked', excludedOrgans: ['heart'], retentionPermitted: false, revocationNote: 'Family revoked entirely' });
    expect(result.hospitalConsent?.status).toBe('revoked');
    expect(result.hospitalConsent?.excludedOrgans.sort()).toEqual(['brain', 'heart']);
    expect(result.hospitalConsent?.retentionPermitted).toBe(false);
  });
});
