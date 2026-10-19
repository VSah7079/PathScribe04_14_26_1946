// src/services/billing/postSignoutBillingReason.ts
// ─────────────────────────────────────────────────────────────────────────────
// Oct 15, 2026 (review finding): when a billing change after sign-out needs
// the documented reason (PostSignoutBillingChangeModal: the
// POST_SIGNOUT_BILLING_CHANGE picklist + comment), in one place (pure).
//
// The case-level paths (the Code Manager save, approving / overriding /
// correcting a code) asked; a specimen's own billing codes (adding or
// removing a specimen base code, applying a matrix-block code to a specimen)
// charged or credited a signed-out case with no reason at all, on the report
// page and in the shared billing review (Cytology Workspace, Microtomy). Every
// one of those paths now asks through this decision, and the reason goes on
// the charge or credit and its audit entry (caseBillingCharges.ts
// postSignoutNote), exactly as the case-level path records it.
// ─────────────────────────────────────────────────────────────────────────────

import type { CaseStatus } from '@/types/case/CaseStatus';
import { isCaseSignedOutForBilling } from './isCaseSignedOutForBilling';

/**
 * Whether a billing change must ask for the post-sign-out reason: the case is
 * billed here (orchestration mode; the LIS bills an Assist case), it has
 * signed out, and something actually changes (`hasChange`, default true).
 */
export function postSignoutReasonNeeded(input: {
  billed: boolean;
  status: CaseStatus | string | null | undefined;
  hasChange?: boolean;
}): boolean {
  return input.billed && (input.hasChange ?? true) && isCaseSignedOutForBilling(input.status as CaseStatus | null | undefined);
}

/** The orienting line the reason window shows for a specimen-level change (locale key + values). */
export function specimenBillingChangeSummary(kind: 'added' | 'removed', code: string): {
  key: 'postSignoutBillingChangeModal.summaryCodeAdded' | 'postSignoutBillingChangeModal.summaryCodeRemoved';
  values: { code: string };
} {
  return {
    key: kind === 'added' ? 'postSignoutBillingChangeModal.summaryCodeAdded' : 'postSignoutBillingChangeModal.summaryCodeRemoved',
    values: { code },
  };
}
