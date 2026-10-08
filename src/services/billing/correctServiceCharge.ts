// src/services/billing/correctServiceCharge.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct correction: no business logic in UI code. This
// exact "find the original charge, reverse it with a credit, build and
// save a new corrected charge" sequence previously lived inline inside
// QualityAssurancePage.tsx's own handleResolveBillingDeficiency - real
// financial orchestration that belongs in the services layer, not a
// page component. Extracted here so every real call site (the QA
// CODE_CORRECTED resolution path, and BillingReviewPanel's own
// "Correct code" action on an already-applied code) shares the exact
// same real logic rather than each re-implementing it slightly
// differently.
//
// Deliberately still returns both the credit and the corrected charge
// (rather than void) so a caller can build its own, context-specific
// audit log entry (different wording for a QA resolution vs. a direct
// billing-panel correction) without this function needing to know
// anything about audit logging itself.
// ─────────────────────────────────────────────────────────────────────────────

import type { PostSignoutChangeContext } from './resolveServiceCharge';
import type { ServiceChargeRecord } from '@/types/billing/ServiceChargeRecord';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { applyBillingCorrection } from './billingCorrection';

export interface ServiceChargeCorrectionResult {
  original: ServiceChargeRecord;
  credit: ServiceChargeRecord;
  corrected: ServiceChargeRecord;
}

/**
 * Batch 382 (Pete: keep today's users, but as a permission of its own so a
 * hospital can later take it off its clinical roles). Correcting an applied
 * billing code credits the original charge and bills a new one, so it needs
 * billing:applied-code:correct for the case's facility. The report page asks
 * this before it changes the visible code (assist mode makes no charge, but
 * the correction is still a billing change); correctServiceCharge asks it
 * again for every caller, the QA resolution included.
 */
export async function enforceAppliedCodeCorrection(caseId: string): Promise<boolean> {
  const decision = await authorizationService.enforce('billing:applied-code:correct', { caseId });
  return decision.allowed;
}

/** Real, per direct guidance's own established "credit the old, charge
 *  the new, all must be audited" pattern. Returns a real, honest error
 *  (never throws, never silently no-ops) when the original charge
 *  genuinely can't be found - a caller deciding what to do about a
 *  missing charge record is a real, per-context UI decision, not
 *  something this function should assume. */
export async function correctServiceCharge(
  caseId: string,
  originalChargeId: string,
  correctedCptCode: string,
  _correctedBy: string,
  postSignoutContext?: PostSignoutChangeContext
): Promise<{ ok: true; data: ServiceChargeCorrectionResult } | { ok: false; error: string; notPermitted?: true }> {
  // Batch 433: one engine for every billing correction (billingCorrection.ts).
  // The report page passes a reason only after sign-out (before, it's
  // drafting); it records an audit entry, not a deficiency.
  const res = await applyBillingCorrection({
    caseId,
    correction: { kind: 'changeCode', chargeId: originalChargeId, newCptCode: correctedCptCode },
    reason: postSignoutContext,
    requireReason: false,
    recordDeficiency: false,
    updateCaseCoding: false,
  });
  if (res.ok === false) {
    if (res.error === 'NOT_PERMITTED') return { ok: false, error: 'Correcting an applied billing code needs the billing:applied-code:correct permission', notPermitted: true };
    if (res.error === 'CHARGE_NOT_FOUND') return { ok: false, error: `No real charge record found with id ${originalChargeId} on case ${caseId}` };
    return { ok: false, error: res.error };
  }
  return { ok: true, data: { original: res.data.original!, credit: res.data.credit!, corrected: res.data.charge! } };
}
