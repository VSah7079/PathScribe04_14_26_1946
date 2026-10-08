// src/services/autopsy/applyAutopsyConsentStatusChange.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 469 (PS-261 §2.5.1 follow-up) — the write site
// applyAutopsyAuthorizationCompletion.ts's own comment named as
// missing: "narrowing/revoking consent after the initial grant has no
// UI yet." That form only ever fills in the fields still missing at
// authorization-completion time; it never changes `status` once set.
// This is the separate, later action — a next-of-kin narrowing or
// withdrawing consent after the case is already under way — kept as
// its own pure merge function, same reasoning as
// applyAutopsyAuthorizationCompletion.ts being kept separate from its
// own validation function.
//
// Deliberately only ever narrows: this never widens consent back out
// (an 'active' status, or a wider excludedOrgans/retentionPermitted)
// — reinstating withdrawn consent is a real, separate clinical/legal
// decision this module doesn't model, and nothing here needs to.
//
// Enforced here, not just assumed of the caller (an independent review
// of this batch flagged that the first cut of this function trusted
// the input verbatim, which would have let a caller — including a UI
// form reopened without re-seeding its draft from the current record
// — silently widen an already-narrowed consent): excludedOrgans is the
// UNION of what's already excluded and what's newly passed, never a
// replacement; retentionPermitted only ever moves true → false, never
// back; and status only ever moves forward on the
// active → narrowed → revoked ladder, never backward. A caller asking
// to move backward on any of these three gets the unchanged value for
// that field, not an error — the rest of the input (e.g. a note, or a
// genuinely further narrowing) still applies.
// ─────────────────────────────────────────────────────────────────────────────

import type { AutopsyCaseDetails, HospitalConsentStatus } from '@/types/autopsy/AutopsyCaseDetails';
import type { AutopsyOrganCode } from '@/types/autopsy/AutopsyOrganCode';

export interface AutopsyConsentStatusChangeInput {
  status: HospitalConsentStatus;
  excludedOrgans: AutopsyOrganCode[];
  retentionPermitted: boolean;
  revocationNote?: string;
  changedAt?: string;
}

const STATUS_RANK: Record<HospitalConsentStatus, number> = { active: 0, narrowed: 1, revoked: 2 };

export function applyAutopsyConsentStatusChange(
  caseDetails: AutopsyCaseDetails,
  input: AutopsyConsentStatusChangeInput,
): AutopsyCaseDetails {
  if (caseDetails.caseAuthority !== 'hospital_consented' || !caseDetails.hospitalConsent) return caseDetails;
  const current = caseDetails.hospitalConsent;
  const status = STATUS_RANK[input.status] >= STATUS_RANK[current.status] ? input.status : current.status;
  const excludedOrgans = Array.from(new Set([...current.excludedOrgans, ...input.excludedOrgans]));
  const retentionPermitted = current.retentionPermitted && input.retentionPermitted;
  return {
    ...caseDetails,
    hospitalConsent: {
      ...current,
      status,
      excludedOrgans,
      retentionPermitted,
      statusChangedAt: input.changedAt ?? new Date().toISOString(),
      revocationNote: input.revocationNote,
    },
  };
}
