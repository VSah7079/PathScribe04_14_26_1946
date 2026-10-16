// src/services/cytology/cytologyComplianceFeatures.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 415 (PS-359; Pete: "should be an enabled feature"). Two cytology rules
// are US regulations, yet ran in every country:
//
//   • workloadCap       CLIA 42 CFR § 493.1274: a cytotechnologist's daily
//                       slide cap, prorated by active screening hours
//                       (saveCytologyReview's workload check and reassignment).
//   • fiveYearLookback  CAP: a new high-grade diagnosis flags the patient's
//                       negative Paps from the last five years for
//                       retrospective review (sign-out, and the on-screen card).
//
// Each is now a feature: On, Off, or Automatic (on for a US lab, off
// elsewhere), set for the enterprise and optionally per facility. Automatic is
// the default, so US labs behave as before and other countries stop getting US
// rules unless they switch them on. Workload is still recorded in the ledger
// either way; Off only stops the cap from blocking and reassigning.
//
// Batch 533 (Pete, Oct 12: "This should be configurable"): a laboratory
// policy alongside them, set the same way:
//
//   • preliminarySignature  an urgent cytology preliminary report needs the
//                           pathologist's electronic signature, as a sign-out
//                           does. Automatic = required in every jurisdiction.
// ─────────────────────────────────────────────────────────────────────────────

import type { Jurisdiction } from '@/types/systemConfig';

export type CytologyComplianceFeature = 'workloadCap' | 'fiveYearLookback' | 'preliminarySignature';
export type CytologyFeatureSetting = 'auto' | 'on' | 'off';
export type CytologyComplianceSettings = Partial<Record<CytologyComplianceFeature, CytologyFeatureSetting>>;

export const CYTOLOGY_COMPLIANCE_FEATURES: CytologyComplianceFeature[] = ['workloadCap', 'fiveYearLookback', 'preliminarySignature'];

/** Where Automatic turns each feature on: the jurisdictions whose regulation it is. */
const AUTO_ON: Record<CytologyComplianceFeature, Jurisdiction[] | 'all'> = {
  workloadCap: ['US'],
  fiveYearLookback: ['US'],
  preliminarySignature: 'all',
};

/** Facility setting, else enterprise, else Automatic; Automatic follows the lab's jurisdiction. */
export function resolveCytologyComplianceFeatures(
  jurisdiction: Jurisdiction | undefined,
  enterprise: CytologyComplianceSettings | null | undefined,
  facility: CytologyComplianceSettings | null | undefined,
): Record<CytologyComplianceFeature, boolean> {
  const one = (f: CytologyComplianceFeature) => {
    const setting = facility?.[f] ?? enterprise?.[f] ?? 'auto';
    const auto = AUTO_ON[f];
    return setting === 'on' || (setting === 'auto' && (auto === 'all' || (!!jurisdiction && auto.includes(jurisdiction))));
  };
  return { workloadCap: one('workloadCap'), fiveYearLookback: one('fiveYearLookback'), preliminarySignature: one('preliminarySignature') };
}

/** Batch 533: the features whose Automatic is on everywhere (the screen words Automatic for them). */
export const CYTOLOGY_FEATURES_ON_EVERYWHERE: readonly CytologyComplianceFeature[] =
  CYTOLOGY_COMPLIANCE_FEATURES.filter(f => AUTO_ON[f] === 'all');

/** Batch 533: the locale key (under cytologyCompliance.settings) naming a setting for a feature. */
export function cytologyComplianceSettingKey(feature: CytologyComplianceFeature, setting: CytologyFeatureSetting): string {
  return setting === 'auto' && CYTOLOGY_FEATURES_ON_EVERYWHERE.includes(feature) ? 'autoEverywhere' : setting;
}
