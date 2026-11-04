export interface EnterpriseFeatures {
  reportingPlusEnabled: boolean; // default false
  /** Real, per direct guidance (PS-105): a genuine enterprise-level
   *  kill switch for the Abnormal Detection capability — deliberately
   *  NOT resolved through isFeatureEnabled()'s existing "hospital
   *  overrides enterprise, either direction" logic. That logic is
   *  correct for reportingPlusEnabled (a facility should be able to
   *  turn a nice-to-have feature on or off for itself either way), but
   *  wrong here: "If the enterprise level is disabled then the
   *  performing facility level is disabled and cannot be overridden."
   *  See resolveAbnormalDetectionEnabled() (services/abnormalDetection/)
   *  for the real, separate resolution logic this actually uses.
   *  Default true — this is an opt-out safety feature, not an
   *  opt-in one. */
  abnormalDetectionEnabled: boolean; // default true
}

/** Batch 623 (PS-130): the code systems a customer can hold a licence for. */
export type LicensedTerminologySystem = 'SNOMED_CT' | 'ICD_O_3';

/** What the customer tells PathScribe about a licence it holds. PathScribe never ships these code sets. */
export interface TerminologyLicence {
  /** Real codes are used only while this is on (and the licence has not expired). */
  enabled: boolean;
  /** Who holds the licence (a hospital, a national body or an affiliate). */
  holder: string;
  /** The edition or release the customer is licensed for, e.g. "SNOMED CT Spanish Edition". */
  edition: string;
  /** The licence or agreement number, for the audit trail. */
  reference: string;
  /** YYYY-MM-DD, last day the licence is valid. Empty = no expiry recorded. */
  expiresOn: string;
}

export type TerminologyLicences = Partial<Record<LicensedTerminologySystem, TerminologyLicence>>;

export interface EnterpriseConfig {
  id: string;
  name: string;
  features: EnterpriseFeatures;
  /** Batch 623 (PS-130): the customer's terminology licences. Absent = none recorded (test codes only). */
  terminologyLicences?: TerminologyLicences;
  /** Batch 750: where slide previews come from and the address that opens the lab's own digital pathology application
   *  (services/digitalPathology/slideImages.ts). Absent = the deployment's, if any. */
  slideImages?: import('@/services/digitalPathology/slideImages').SlideImageSettings;
}