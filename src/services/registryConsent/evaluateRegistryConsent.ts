// src/services/registryConsent/evaluateRegistryConsent.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 418 (Registry Engine SRS v2.1, FR-008.1). Whether a registry submission
// goes ahead given the patient's recorded opt-outs. Pure.
//
//   screening  An opt-out always excludes: every cervical screening programme
//              is consent-based (CSMS, NCSR, NCSP, CervicalCheck…).
//   cancer     Statutory: the report goes regardless of an opt-out, unless the
//              lab's settings say its jurisdiction honours one
//              (CancerRegistrySettingsConfig.honoursPatientOptOut).
//
// An exclusion is recorded in the audit log as EXCLUDED_BY_CONSENT by the
// caller; the payload is never built.
// ─────────────────────────────────────────────────────────────────────────────

import type { PatientRegistryConsent } from '@/types/patient/PatientRegistryConsent';

export type RegistryDomain = 'screening' | 'cancer';

export interface RegistryConsentDecision {
  proceed: boolean;
  /** Set when proceed is false. */
  exclusion?: 'EXCLUDED_BY_CONSENT';
  /** Set when an opt-out was recorded but the domain is statutory, so the report still goes. */
  optOutOverriddenByStatute?: boolean;
}

export function evaluateRegistryConsent(
  domain: RegistryDomain,
  consent: PatientRegistryConsent | undefined,
  settings: { honoursPatientOptOut?: boolean } = {},
): RegistryConsentDecision {
  if (!consent) return { proceed: true };
  if (domain === 'screening') {
    return consent.screeningOptOut ? { proceed: false, exclusion: 'EXCLUDED_BY_CONSENT' } : { proceed: true };
  }
  if (!consent.cancerRegistryOptOut) return { proceed: true };
  return settings.honoursPatientOptOut
    ? { proceed: false, exclusion: 'EXCLUDED_BY_CONSENT' }
    : { proceed: true, optOutOverriddenByStatute: true };
}

/** The English text stored on the audit record and the queue entry (a compliance record, not screen text). */
export function consentExclusionMessage(domain: RegistryDomain, registryId: string): string {
  return domain === 'screening'
    ? `Excluded by consent: the patient opted out of cervical screening programme reporting (${registryId}). Not sent.`
    : `Excluded by consent: the patient opted out of cancer registry reporting and this jurisdiction honours the opt-out (${registryId}). Not sent.`;
}
