// src/services/cytology/csmsEligibility.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 636 (PS-193's open item, Pete, Oct 20, 2026). Every case sent to CSMS (England's cervical screening register) carries
// the flag "CSMS Eligibility Verification Needed" (f36), because PathScribe holds no eligibility or suspension data. A person in
// the Cytology QA group checks the woman's status in the register and records the answer here. Verified clears the flag in one
// step; Not eligible takes a quick-pick reason and also clears it, with the reason in the audit log. Pure rules only.
// ─────────────────────────────────────────────────────────────────────────────
export const CSMS_ELIGIBILITY_FLAG_ID = 'f36';

export const CSMS_NOT_ELIGIBLE_REASONS = ['ceased', 'suspended', 'out_of_age_range', 'other'] as const;
export type CsmsNotEligibleReason = typeof CSMS_NOT_ELIGIBLE_REASONS[number];

export type CsmsEligibilityDecision = { kind: 'verified' } | { kind: 'not_eligible'; reason: CsmsNotEligibleReason };

interface FlagLike { id: string; flagDefinitionId?: string; deletedAt?: string | null }

/** The flag instances still open (not deleted) for CSMS eligibility. */
export function openCsmsEligibilityFlags<F extends FlagLike>(flags: readonly F[] | undefined): F[] {
  return (flags ?? []).filter(f => f.flagDefinitionId === CSMS_ELIGIBILITY_FLAG_ID && !f.deletedAt);
}

export function csmsEligibilityProblem(decision: CsmsEligibilityDecision): 'reason-required' | null {
  if (decision.kind === 'not_eligible' && !(CSMS_NOT_ELIGIBLE_REASONS as readonly string[]).includes(decision.reason)) return 'reason-required';
  return null;
}

export function csmsEligibilityEventName(decision: CsmsEligibilityDecision): string {
  return decision.kind === 'verified' ? 'CSMS_ELIGIBILITY_VERIFIED' : 'CSMS_ELIGIBILITY_NOT_ELIGIBLE';
}

const REASON_TEXT: Record<CsmsNotEligibleReason, string> = {
  ceased: 'ceased from the programme', suspended: 'suspended from the programme', out_of_age_range: 'outside the programme age range', other: 'not eligible for another reason',
};

/** Audit text is literal English (a compliance record, not UI). No patient data. */
export function csmsEligibilityAuditDetail(decision: CsmsEligibilityDecision, userName: string): string {
  return decision.kind === 'verified'
    ? `CSMS eligibility verified by ${userName}; the verification flag was cleared.`
    : `CSMS eligibility checked by ${userName}: not eligible (${REASON_TEXT[decision.reason]}); the verification flag was cleared. Nothing was changed on the result itself.`;
}

/** Batch 638: why a held CSMS message was closed. Stored on the queue entry (literal English, like the audit text). */
export function csmsNotEligibleMessage(reason: CsmsNotEligibleReason): string {
  return `Recorded as ${REASON_TEXT[reason]}. The CSMS message was not sent; the clinical report is unaffected.`;
}
