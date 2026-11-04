// Batch 468: consent-scope enforcement — the first real reader of
// HospitalConsentRecord.excludedOrgans/retentionPermitted.
import { describe, it, expect } from 'vitest';
import { resolveExcludedOrgansPresent, resolveRetentionTierConsentCheck } from './resolveAutopsyConsentScopeViolation';
import type { HospitalConsentRecord } from '../../types/autopsy/AutopsyCaseDetails';

const consent = (over: Partial<HospitalConsentRecord> = {}): HospitalConsentRecord => ({
  consentingRelativeName: 'Jane Doe',
  consentingRelativeRelationship: 'spouse',
  consentGivenAt: '2026-10-01T10:00:00Z',
  status: 'active',
  consentScope: [],
  excludedOrgans: [],
  retentionPermitted: true,
  ...over,
});

describe('resolveExcludedOrgansPresent', () => {
  it('is empty with no consent on file, or with no exclusions', () => {
    expect(resolveExcludedOrgansPresent([{ organCodes: ['brain'] }], undefined)).toEqual([]);
    expect(resolveExcludedOrgansPresent([{ organCodes: ['brain'] }], consent())).toEqual([]);
  });
  it('lists only organs both present among specimens and excluded by consent', () => {
    const c = consent({ excludedOrgans: ['brain', 'heart'] });
    expect(resolveExcludedOrgansPresent([{ organCodes: ['brain'] }, { organCodes: ['liver'] }], c)).toEqual(['brain']);
    expect(resolveExcludedOrgansPresent([{ organCodes: ['liver'] }], c)).toEqual([]);
  });
  it('de-duplicates an excluded organ present on more than one specimen', () => {
    const c = consent({ excludedOrgans: ['brain'] });
    expect(resolveExcludedOrgansPresent([{ organCodes: ['brain'] }, { organCodes: ['brain'] }], c)).toEqual(['brain']);
  });
  it('treats a specimen with no organCodes as contributing nothing', () => {
    expect(resolveExcludedOrgansPresent([{}], consent({ excludedOrgans: ['brain'] }))).toEqual([]);
  });
});

describe('resolveRetentionTierConsentCheck', () => {
  it('always allows tier_0 (no retention) or clearing the field, regardless of consent', () => {
    expect(resolveRetentionTierConsentCheck(consent({ retentionPermitted: false }), 'tier_0_no_retention')).toEqual({ allowed: true });
    expect(resolveRetentionTierConsentCheck(consent({ status: 'revoked' }), undefined)).toEqual({ allowed: true });
  });
  it('allows any tier when no consent is on file yet', () => {
    expect(resolveRetentionTierConsentCheck(undefined, 'tier_2_full_organ_retention')).toEqual({ allowed: true });
  });
  it('refuses any retention beyond tier_0 when revoked, even if retentionPermitted is true', () => {
    expect(resolveRetentionTierConsentCheck(consent({ status: 'revoked', retentionPermitted: true }), 'tier_1_diagnostic_tissue_only'))
      .toEqual({ allowed: false, refusal: 'consentRevoked' });
  });
  it('refuses retention beyond tier_0 when retentionPermitted is false', () => {
    expect(resolveRetentionTierConsentCheck(consent({ retentionPermitted: false }), 'tier_1_diagnostic_tissue_only'))
      .toEqual({ allowed: false, refusal: 'retentionNotPermitted' });
  });
  it('allows retention when permitted and consent is active or merely narrowed', () => {
    expect(resolveRetentionTierConsentCheck(consent({ retentionPermitted: true }), 'tier_2_full_organ_retention')).toEqual({ allowed: true });
    expect(resolveRetentionTierConsentCheck(consent({ status: 'narrowed', retentionPermitted: true }), 'tier_3_education_research_genomic')).toEqual({ allowed: true });
  });
});
