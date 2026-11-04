// src/services/registryConsent/evaluateRegistryConsent.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateRegistryConsent, consentExclusionMessage } from './evaluateRegistryConsent';

const optOutBoth = { screeningOptOut: true, cancerRegistryOptOut: true, recordedAt: '2026-09-30T00:00:00.000Z' };
const optOutScreening = { screeningOptOut: true, cancerRegistryOptOut: false, recordedAt: '2026-09-30T00:00:00.000Z' };

describe('evaluateRegistryConsent (Batch 418, SRS FR-008.1)', () => {
  it('no consent recorded: everything proceeds', () => {
    expect(evaluateRegistryConsent('screening', undefined)).toEqual({ proceed: true });
    expect(evaluateRegistryConsent('cancer', undefined)).toEqual({ proceed: true });
  });
  it('a screening opt-out always excludes', () => {
    expect(evaluateRegistryConsent('screening', optOutScreening)).toEqual({ proceed: false, exclusion: 'EXCLUDED_BY_CONSENT' });
    expect(evaluateRegistryConsent('screening', { ...optOutScreening, screeningOptOut: false })).toEqual({ proceed: true });
  });
  it('a cancer registry opt-out is overridden by statute unless the lab honours it', () => {
    expect(evaluateRegistryConsent('cancer', optOutBoth)).toEqual({ proceed: true, optOutOverriddenByStatute: true });
    expect(evaluateRegistryConsent('cancer', optOutBoth, { honoursPatientOptOut: true })).toEqual({ proceed: false, exclusion: 'EXCLUDED_BY_CONSENT' });
    expect(evaluateRegistryConsent('cancer', optOutScreening, { honoursPatientOptOut: true })).toEqual({ proceed: true }); // only the screening flag was set
  });
  it('the exclusion text names the registry', () => {
    expect(consentExclusionMessage('screening', 'csms_uk')).toContain('csms_uk');
    expect(consentExclusionMessage('cancer', 'cosd_uk')).toMatch(/^Excluded by consent/);
  });
});
