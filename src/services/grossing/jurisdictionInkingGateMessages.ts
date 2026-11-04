// src/services/grossing/jurisdictionInkingGateMessages.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 484 (Structured Inking Sign-Out & Grossing Gate Logic Engine;
// PS-359/PS-519 follow-up, Pete's own "Regional Sign-Out Gate Regulatory
// Messaging" spec). The exact blocking-message text (and its regulatory
// citation) shown at Gate B (SIGN_OUT) when a Severity 3
// margin_ink_color_unmapped issue hard-blocks sign-out.
//
// Deliberately keyed off the real, existing Jurisdiction type
// (types/systemConfig.ts) — this app already resolves a jurisdiction per
// facility/case (Facility.jurisdiction) and renders its display name via
// t('jurisdictionNames.<code>'); Pete's spec names six regulatory-body
// profiles (US_CAP, KR_MFDS, UK_RCPATH, CA_IQMH, ANZ_RCPA, EU_IVDR) rather
// than six new jurisdiction codes, so this file maps the real Jurisdiction
// values onto those six profiles instead of inventing a second, parallel
// jurisdiction vocabulary. GB_EW/GB_SCT/GB_NIR all map to UK_RCPATH (one
// regulatory college, three home-nation jurisdictions); AU/NZ both map to
// ANZ_RCPA (one joint college); IE/BE/NL/DE/FR all map to EU_IVDR (EU
// member states under the same regulation — Ireland included, since RCPath
// is a UK-only body and IE is not inside the UK regulatory jurisdiction).
//
// Message text is translated (i18n key below), NOT hard-coded English —
// standing rule #3. What IS fixed, per profile, is which regulatory
// citation to interpolate into that translated template (CLIA §42 CFR
// 493.1273 / CAP Accreditation Checklist for US_CAP, etc.) — citations are
// proper-noun regulatory references, not language-dependent prose, so they
// are data here and interpolated via {{citation}} rather than translated
// per locale (mirrors how a SNOMED/ICD-10 code is never translated).
// ─────────────────────────────────────────────────────────────────────────────

import type { Jurisdiction } from '@/types/systemConfig';

export type InkingGateJurisdictionProfile = 'US_CAP' | 'KR_MFDS' | 'UK_RCPATH' | 'CA_IQMH' | 'ANZ_RCPA' | 'EU_IVDR';

const PROFILE_BY_JURISDICTION: Record<Jurisdiction, InkingGateJurisdictionProfile> = {
  US: 'US_CAP',
  CA: 'CA_IQMH',
  GB_EW: 'UK_RCPATH',
  GB_SCT: 'UK_RCPATH',
  GB_NIR: 'UK_RCPATH',
  AU: 'ANZ_RCPA',
  NZ: 'ANZ_RCPA',
  KR: 'KR_MFDS',
  IE: 'EU_IVDR',
  BE: 'EU_IVDR',
  NL: 'EU_IVDR',
  DE: 'EU_IVDR',
  FR: 'EU_IVDR',
  ES: 'EU_IVDR',
};

/** The regulatory profile a given (real) jurisdiction's Gate B messaging uses. */
export function resolveInkingGateJurisdictionProfile(jurisdiction: Jurisdiction | undefined): InkingGateJurisdictionProfile {
  return jurisdiction === undefined ? 'US_CAP' : PROFILE_BY_JURISDICTION[jurisdiction];
}

/** The regulatory citation interpolated into the translated blocking message for each profile. */
export const INKING_GATE_REGULATORY_CITATION: Record<InkingGateJurisdictionProfile, string> = {
  US_CAP: 'CLIA §42 CFR 493.1273; CAP Accreditation Checklist',
  KR_MFDS: 'KSP / KALM',
  UK_RCPATH: 'UKAS ISO 15189; RCPath Tissue Pathways',
  CA_IQMH: 'IQMH / OLA',
  ANZ_RCPA: 'NPAAC / RCPA',
  EU_IVDR: 'EU IVDR (2017/746); ISO 15189',
};

/** The i18n key (under signOutInkingGate.blockingMessage.*) for a profile's translated template. */
export function inkingGateBlockingMessageKey(profile: InkingGateJurisdictionProfile): string {
  return `signOutInkingGate.blockingMessage.${profile}`;
}
