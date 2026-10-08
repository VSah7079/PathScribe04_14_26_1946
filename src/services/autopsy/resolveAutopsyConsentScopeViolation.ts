// src/services/autopsy/resolveAutopsyConsentScopeViolation.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 468 (PS-261 / RFP-APLIS-2026-GLOBAL §3.1.C §2.5.1) — "Block
// grossing/retention actions that exceed what the consent on file
// allows." Before this batch, HospitalConsentRecord.consentScope was
// captured and stored but never read by any code path — pure
// decoration (confirmed by a repo-wide search). This file is the
// first real enforcement: two narrow, pure checks against the two new
// structured consent fields (excludedOrgans, retentionPermitted —
// see AutopsyCaseDetails.ts), each wired into the one real write site
// that can act on it.
//
// Deliberate scope, honestly bounded: the autopsy gross-exam template
// (data/templates/Autopsy/autopsy_gross_examination.json) has no
// per-field organ tag — only whole SECTIONS are organ-derived (see
// resolveActiveAutopsyGrossingSections.ts), and only specimens
// themselves carry a real, structured AutopsyOrganCode (Specimen.
// organCodes). So organ-exclusion enforcement here works at the
// organ/section level, not a per-finding hard block: an excluded
// organ already present among the case's specimens is surfaced as a
// clear violation for the UI to warn on, not silently hidden (hiding
// it would look like a bug, not a safeguard). Retention-tier
// enforcement, by contrast, has exactly one write site and one
// consent flag behind it, so that one is a real hard block.
//
// Not a capability/authorization check: whether an organ is excluded
// or retention is permitted is a clinical/consent fact about the
// CASE, not a permission about the USER, so this never calls
// authorizationService — same reasoning as
// resolveAutopsyGrossExaminationGate.ts, which it complements.
// ─────────────────────────────────────────────────────────────────────────────

import type { AutopsyOrganCode } from '@/types/autopsy/AutopsyOrganCode';
import type { HospitalConsentRecord, OrganRetentionTier } from '@/types/autopsy/AutopsyCaseDetails';

export interface AutopsySpecimenOrganSource {
  organCodes?: AutopsyOrganCode[];
}

/** Organs actually present among the case's specimens that the
 *  hospital consent on file explicitly excludes. Empty when consent
 *  is undefined (nothing recorded yet — never treated as a
 *  violation) or when nothing present is excluded. Only meaningful
 *  for hospital-consented cases; a forensic case has no consent
 *  record to check against, so callers should only invoke this for
 *  caseAuthority === 'hospital_consented'. */
export function resolveExcludedOrgansPresent(
  specimens: readonly AutopsySpecimenOrganSource[],
  consent: HospitalConsentRecord | undefined,
): AutopsyOrganCode[] {
  if (!consent || consent.excludedOrgans.length === 0) return [];
  const excluded = new Set(consent.excludedOrgans);
  const present = new Set<AutopsyOrganCode>();
  for (const specimen of specimens) {
    for (const organ of specimen.organCodes ?? []) {
      if (excluded.has(organ)) present.add(organ);
    }
  }
  return [...present];
}

export type AutopsyRetentionConsentRefusal = 'consentRevoked' | 'retentionNotPermitted';

export interface AutopsyRetentionTierConsentCheck {
  allowed: boolean;
  refusal?: AutopsyRetentionConsentRefusal;
}

/** Real, per PS-261 §2.4.1/§2.5.1 — a hospital-consented case's
 *  organRetentionTier may never move beyond 'tier_0_no_retention'
 *  when the NOK's consent doesn't permit retention, or has been
 *  revoked outright. 'tier_0_no_retention' itself, and undefined
 *  (clearing the field), are always allowed — they only ever REDUCE
 *  what's retained. A forensic case has no consent record to check
 *  against, so callers should only invoke this for
 *  caseAuthority === 'hospital_consented'. */
export function resolveRetentionTierConsentCheck(
  consent: HospitalConsentRecord | undefined,
  requestedTier: OrganRetentionTier | undefined,
): AutopsyRetentionTierConsentCheck {
  if (!requestedTier || requestedTier === 'tier_0_no_retention') return { allowed: true };
  if (!consent) return { allowed: true };
  if (consent.status === 'revoked') return { allowed: false, refusal: 'consentRevoked' };
  if (!consent.retentionPermitted) return { allowed: false, refusal: 'retentionNotPermitted' };
  return { allowed: true };
}
