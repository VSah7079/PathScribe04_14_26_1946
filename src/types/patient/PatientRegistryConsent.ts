// src/types/patient/PatientRegistryConsent.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 418 (Registry Engine SRS v2.1, FR-008.1). What the patient has said
// about registry reporting. Two flags, one per domain, because the law treats
// them differently: a cervical screening programme honours an opt-out; a
// cancer registry is statutory and reports regardless, unless the lab's
// configuration records a legal exception (CancerRegistrySettingsConfig
// .honoursPatientOptOut). The rule is services/registryConsent/
// evaluateRegistryConsent.ts; this is only what was recorded.
// ─────────────────────────────────────────────────────────────────────────────

export interface PatientRegistryConsent {
  /** The patient has opted out of cervical screening programme reporting. */
  screeningOptOut: boolean;
  /** The patient has opted out of cancer registry reporting (honoured only where configured). */
  cancerRegistryOptOut: boolean;
  /** ISO timestamp of when this was recorded. */
  recordedAt: string;
  /** Who recorded it (user id); absent when it came in over an interface. */
  recordedBy?: string;
  source?: 'manual' | 'hl7' | 'import';
}
