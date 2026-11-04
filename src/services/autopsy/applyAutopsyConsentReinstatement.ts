// src/services/autopsy/applyAutopsyConsentReinstatement.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 471 (PS-261 follow-up) — reinstating an already-narrowed or
// revoked hospital consent. applyAutopsyConsentStatusChange.ts's own
// header comment calls this "a real, separate clinical/legal decision
// this module doesn't model" and deliberately refuses it — a next-of-
// kin who changes their mind and wants to restore broader consent is a
// real, if rarer, event this module hadn't given a write site either
// way. Per direct product direction, that's now built, but kept
// genuinely separate from the narrowing function rather than adding a
// "widen: true" escape hatch to it: narrowing is meant to never widen,
// by construction, and a flag that lets it would have undermined the
// very guarantee that function exists to enforce (and the one an
// independent review of Batch 469 had to go back and actually add).
// Reinstatement is its own pure function, gated by its own capability
// at the orchestration layer (recordAutopsyConsentReinstatement.ts),
// so narrowing's own guarantee is untouched by this existing at all.
//
// Unlike the narrowing function, this one does NOT enforce a ladder:
// it moves status to exactly what's asked (including back to
// 'active'), and replaces excludedOrgans/retentionPermitted with
// whatever is passed — trusted here because reinstatement is itself
// the deliberate widening action, authorized by its own capability,
// and always carries a mandatory note explaining why (enforced at the
// orchestration layer, same as the hospital-consented-only gate).
// ─────────────────────────────────────────────────────────────────────────────

import type { AutopsyCaseDetails, HospitalConsentStatus } from '@/types/autopsy/AutopsyCaseDetails';
import type { AutopsyOrganCode } from '@/types/autopsy/AutopsyOrganCode';

export interface AutopsyConsentReinstatementInput {
  status: HospitalConsentStatus;
  excludedOrgans: AutopsyOrganCode[];
  retentionPermitted: boolean;
  reinstatementNote: string;
  changedAt?: string;
}

export function applyAutopsyConsentReinstatement(
  caseDetails: AutopsyCaseDetails,
  input: AutopsyConsentReinstatementInput,
): AutopsyCaseDetails {
  if (caseDetails.caseAuthority !== 'hospital_consented' || !caseDetails.hospitalConsent) return caseDetails;
  const current = caseDetails.hospitalConsent;
  return {
    ...caseDetails,
    hospitalConsent: {
      ...current,
      status: input.status,
      excludedOrgans: input.excludedOrgans,
      retentionPermitted: input.retentionPermitted,
      statusChangedAt: input.changedAt ?? new Date().toISOString(),
      revocationNote: input.reinstatementNote,
    },
  };
}
