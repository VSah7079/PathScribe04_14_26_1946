// src/services/autopsy/recordAutopsyToxicologyResult.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 469 (PS-261 §2.3) — the other half of orderAutopsyToxicology.ts:
// records a result (or a cancellation) against an existing, still-
// 'ordered' toxicology order, and clears the ancillary hold that
// order placed — mirroring how a real external lab result would
// arrive and end the wait. See orderAutopsyToxicology.ts's own header
// comment for why this is a small, self-contained list rather than
// built on the molecular send-out engine.
//
// Deliberately does not re-activate a hold that was overwritten by a
// later, unrelated reason (e.g. the case moved on to a fixed-brain
// neuropathology hold since this order was placed) — it only clears
// the hold when it is still the one this order itself started
// (matched by `startedAt`), never blindly flips `active` to false.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '@/services/cases/CaseRouter';
import { updateCaseWithRetry } from '@/services/cases/caseWrite';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { auditService } from '../auditlog/auditServiceInstance';

export interface RecordAutopsyToxicologyResultInput {
  orderId: string;
  resultSummary: string;
}

export type RecordAutopsyToxicologyResultReasonCode = 'notPermitted' | 'caseNotFound' | 'orderNotFound' | 'conflict';

export interface RecordAutopsyToxicologyResultResult {
  ok: boolean;
  error?: string;
  reasonCode?: RecordAutopsyToxicologyResultReasonCode;
  notPermitted?: boolean;
}

export async function recordAutopsyToxicologyResult(
  caseId: string,
  input: RecordAutopsyToxicologyResultInput,
  actingUserName: string,
): Promise<RecordAutopsyToxicologyResultResult> {
  const decision = await authorizationService.enforce('autopsy:toxicology:result', { caseId });
  if (!decision.allowed) return { ok: false, error: 'Recording a toxicology result needs the autopsy:toxicology:result permission', notPermitted: true, reasonCode: 'notPermitted' };

  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
  if (!caseData.autopsy) return { ok: false, error: 'Case has no autopsy record.', reasonCode: 'caseNotFound' };

  let orderNotFound = false;
  const write = await updateCaseWithRetry(caseId, current => {
    if (!current.autopsy) { orderNotFound = true; return null; }
    const order = current.autopsy.toxicologyOrders?.find(o => o.id === input.orderId);
    if (!order || order.status !== 'ordered') { orderNotFound = true; return null; }
    const resultedAt = new Date().toISOString();
    const toxicologyOrders = current.autopsy.toxicologyOrders!.map(o =>
      o.id === input.orderId ? { ...o, status: 'resulted' as const, resultedAt, resultSummary: input.resultSummary } : o,
    );
    const hold = current.autopsy.ancillaryHold;
    const clearThisHold = hold.active && hold.startedAt === order.orderedAt;
    return {
      autopsy: {
        ...current.autopsy,
        toxicologyOrders,
        ancillaryHold: clearThisHold ? { ...hold, active: false, endedAt: resultedAt } : hold,
      },
    };
  }, caseRouter);

  if (write.ok === true) {
    auditService.logEvent({
      type: 'system',
      event: 'AUTOPSY_TOXICOLOGY_RESULTED',
      detail: input.resultSummary,
      user: actingUserName,
      caseId,
      confidence: null,
    }).catch(() => {});
    return { ok: true };
  }
  if (orderNotFound) return { ok: false, error: 'That toxicology order was not found, or already has a result.', reasonCode: 'orderNotFound' };
  if (write.reason === 'conflict') return { ok: false, error: 'The case changed while the result was being saved; reopen it and try again.', reasonCode: 'conflict' };
  return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
}
