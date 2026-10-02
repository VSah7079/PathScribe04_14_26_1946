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
// ─────────────────────────────────────────────────────────────────────────────

import type { Jurisdiction } from '@/types/systemConfig';

export type CytologyComplianceFeature = 'workloadCap' | 'fiveYearLookback';
export type CytologyFeatureSetting = 'auto' | 'on' | 'off';
export type CytologyComplianceSettings = Partial<Record<CytologyComplianceFeature, CytologyFeatureSetting>>;

export const CYTOLOGY_COMPLIANCE_FEATURES: CytologyComplianceFeature[] = ['workloadCap', 'fiveYearLookback'];

/** Where Automatic turns each feature on: the jurisdictions whose regulation it is. */
const AUTO_ON: Record<CytologyComplianceFeature, Jurisdiction[]> = {
  workloadCap: ['US'],
  fiveYearLookback: ['US'],
};

/** Facility setting, else enterprise, else Automatic; Automatic follows the lab's jurisdiction. */
export function resolveCytologyComplianceFeatures(
  jurisdiction: Jurisdiction | undefined,
  enterprise: CytologyComplianceSettings | null | undefined,
  facility: CytologyComplianceSettings | null | undefined,
): Record<CytologyComplianceFeature, boolean> {
  const one = (f: CytologyComplianceFeature) => {
    const setting = facility?.[f] ?? enterprise?.[f] ?? 'auto';
    return setting === 'on' || (setting === 'auto' && !!jurisdiction && AUTO_ON[f].includes(jurisdiction));
  };
  return { workloadCap: one('workloadCap'), fiveYearLookback: one('fiveYearLookback') };
}
