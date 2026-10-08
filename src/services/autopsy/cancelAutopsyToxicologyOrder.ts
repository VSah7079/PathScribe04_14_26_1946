// src/services/autopsy/cancelAutopsyToxicologyOrder.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 471 (PS-261 follow-up) — the write site AutopsyToxicologyOrder's
// own `cancelledAt`/`cancelReason` fields had been waiting on since
// Batch 469 (flagged there by an independent review as modeled but
// never set by anything). Same orchestration shape as the rest of this
// folder: capability check, fetch, re-check on the freshest copy,
// persist via updateCaseWithRetry (version-safe, PS-71), real
// audit-log write.
//
// Its own capability, never reusing autopsy:toxicology:order or
// autopsy:toxicology:result — cancelling is a distinct action from
// placing an order or recording a result arrived from the lab.
//
// Only ever moves an 'ordered' order to 'cancelled' — a 'resulted' or
// already-'cancelled' order is refused, same "can't undo a result that
// already landed" posture recordAutopsyToxicologyResult.ts itself
// takes toward an order that isn't still 'ordered'.
//
// Clears the ancillaryHold with the exact same care
// recordAutopsyToxicologyResult.ts already takes: only when it's still
// the hold THIS order started (matched by `startedAt`), never blindly
// flipping `active` to false if the case has since moved on to a
// different hold reason.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '@/services/cases/CaseRouter';
import { updateCaseWithRetry } from '@/services/cases/caseWrite';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockAuditService } from '../auditlog/mockAuditService';

export interface CancelAutopsyToxicologyOrderInput {
  orderId: string;
  cancelReason: string;
}

export type CancelAutopsyToxicologyOrderReasonCode = 'notPermitted' | 'caseNotFound' | 'orderNotFound' | 'conflict';

export interface CancelAutopsyToxicologyOrderResult {
  ok: boolean;
  error?: string;
  reasonCode?: CancelAutopsyToxicologyOrderReasonCode;
  notPermitted?: boolean;
}

export async function cancelAutopsyToxicologyOrder(
  caseId: string,
  input: CancelAutopsyToxicologyOrderInput,
  actingUserName: string,
): Promise<CancelAutopsyToxicologyOrderResult> {
  const decision = await authorizationService.enforce('autopsy:toxicology:cancel', { caseId });
  if (!decision.allowed) return { ok: false, error: 'Cancelling a toxicology order needs the autopsy:toxicology:cancel permission', notPermitted: true, reasonCode: 'notPermitted' };

  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
  if (!caseData.autopsy) return { ok: false, error: 'Case has no autopsy record.', reasonCode: 'caseNotFound' };

  let orderNotFound = false;
  const write = await updateCaseWithRetry(caseId, current => {
    if (!current.autopsy) { orderNotFound = true; return null; }
    const order = current.autopsy.toxicologyOrders?.find(o => o.id === input.orderId);
    if (!order || order.status !== 'ordered') { orderNotFound = true; return null; }
    const cancelledAt = new Date().toISOString();
    const toxicologyOrders = current.autopsy.toxicologyOrders!.map(o =>
      o.id === input.orderId ? { ...o, status: 'cancelled' as const, cancelledAt, cancelReason: input.cancelReason } : o,
    );
    const hold = current.autopsy.ancillaryHold;
    const clearThisHold = hold.active && hold.startedAt === order.orderedAt;
    return {
      autopsy: {
        ...current.autopsy,
        toxicologyOrders,
        ancillaryHold: clearThisHold ? { ...hold, active: false, endedAt: cancelledAt } : hold,
      },
    };
  }, caseRouter);

  if (write.ok === true) {
    mockAuditService.logEvent({
      type: 'system',
      event: 'AUTOPSY_TOXICOLOGY_CANCELLED',
      detail: input.cancelReason,
      user: actingUserName,
      caseId,
      confidence: null,
    }).catch(() => {});
    return { ok: true };
  }
  if (orderNotFound) return { ok: false, error: 'That toxicology order was not found, or already has a result or cancellation.', reasonCode: 'orderNotFound' };
  if (write.reason === 'conflict') return { ok: false, error: 'The case changed while the cancellation was being saved; reopen it and try again.', reasonCode: 'conflict' };
  return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
}
