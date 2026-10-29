// src/services/regulatoryProfile/regulatoryProfile.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 679: one deployment setting, VITE_REGULATORY_PROFILE, decides whether
// the clinical-decision-support behaviours are active.
//
//   documentation     (the default) PathScribe works as a documentation,
//                     workflow and traceability tool, in line with the
//                     Intended Use Statement and its "Provenance Over
//                     Confidence" standard: AI output is shown with the source
//                     text it came from, never a percentage; no score holds
//                     sign-out.
//   clinical_support  Reserved for a future decision to market for a clinical
//                     purpose (medical device). Restores the confidence
//                     figures and the score-driven thresholds and sign-out
//                     holds that are built and kept in the code. Not for use
//                     until regulatory review is done.
//
// Anything else (including a typo) means "documentation": the safe side.
// ─────────────────────────────────────────────────────────────────────────────
import { appEnv } from '@/services/runtimeConfig/runtimeEnv';

export const REGULATORY_PROFILES = ['documentation', 'clinical_support'] as const;
export type RegulatoryProfile = typeof REGULATORY_PROFILES[number];

/** The profile a raw setting value means (pure). */
export function parseRegulatoryProfile(value: unknown): RegulatoryProfile {
  return typeof value === 'string' && value.trim().toLowerCase().replace(/[-\s]/g, '_') === 'clinical_support' ? 'clinical_support' : 'documentation';
}

export function regulatoryProfile(): RegulatoryProfile {
  return parseRegulatoryProfile(appEnv().VITE_REGULATORY_PROFILE);
}

/** What each profile switches on (pure; the one place the capabilities are listed). */
export interface RegulatoryCapabilities {
  /** Batch 706: no longer drives any screen. Confidence figures are not rendered in either profile; kept so the profile table and tests stay stable. */
  showConfidenceScores: boolean;
  /** A model's score can raise a mismatch to a rule's action (e.g. Block) and hold sign-out. */
  scoreDrivenActions: boolean;
  /** A score below the display threshold hides a suggestion. */
  scoreDrivenSuppression: boolean;
}

export function capabilitiesFor(profile: RegulatoryProfile): RegulatoryCapabilities {
  const support = profile === 'clinical_support';
  return { showConfidenceScores: support, scoreDrivenActions: support, scoreDrivenSuppression: support };
}

export const regulatoryCapabilities = (): RegulatoryCapabilities => capabilitiesFor(regulatoryProfile());

/** Batch 706: only the admin Clinical Mismatch Rules page still reads this (to hide threshold editing). Screens never render a confidence number. */
export const showsConfidence = (): boolean => regulatoryCapabilities().showConfidenceScores;
