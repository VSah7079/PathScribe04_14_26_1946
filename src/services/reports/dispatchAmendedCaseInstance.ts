// src/services/reports/dispatchAmendedCaseInstance.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up ("wire that in" — replacing
// sendSynopticReportToLis entirely for orchestration-mode amendments):
// the real, electronic dispatch for a genuine CORRECTED or ADDENDUM
// result. Reuses buildOruR01Payload.ts's own, already-tested builder
// and outboundResultQueueService.ts's own, already-tested queue —
// same real infrastructure dispatchCaseInstances.ts and
// dispatchPreliminaryCaseInstances.ts already use, never a third,
// separate implementation of the same enqueue → dispatch →
// markSent/markFailed sequence.
//
// Real, deliberate difference from dispatchCaseInstances.ts (which is
// genuinely, permanently 'FINAL'-only — confirmed directly: it hardcodes
// 'FINAL' in its own dedup check, payload build, and enqueue call, all
// three): this function is scoped to ONE, specific real instance —
// the one actually amended — never every SynopticReportInstance on the
// case. A correction to one specimen's result has nothing to do with
// every other, unrelated specimen also on that case; re-dispatching
// all of them would misrepresent which result actually changed.
//
// Real, deliberate: no dedup at all, same real reasoning as
// dispatchPreliminaryCaseInstances.ts's own identical choice — each
// genuine correction or addendum is its own, distinct, legitimate real
// event (a case can be corrected more than once over its lifetime),
// never a re-send of something already sent.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '../cases/CaseRouter';
import { resolveDispatchOrganisation } from '../interfaceDispatch/resolveDispatchOrganisation';
import { outboundResultQueueService } from './reportServicesInstance';
import { prepareOruR01Dispatch } from './prepareOruR01Dispatch';
import type { GenerateReportPdf } from './resolveOruReportPdf';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';

export async function dispatchAmendedCaseInstance(
  caseId: string,
  instanceId: string,
  resultState: 'CORRECTED' | 'ADDENDUM',
  /** Real, per direct correction — the real, prior instance.comment,
   *  verbatim, forwarded straight through to buildOruR01Payload.ts's
   *  own identical parameter. See that function's own doc comment for
   *  the full reasoning; this function never fetches or constructs
   *  it itself either. */
  previouslyReportedAs?: string,
  /** Batch 392: the release's PDF (the one printing gets), if one was made. */
  generatePdf?: GenerateReportPdf,
): Promise<void> {
  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return;

  // Honest, non-blocking skip (recorded in the audit log), as in dispatchCaseInstances.ts: no real organisationId to enqueue against.
  const organisationId = await resolveDispatchOrganisation(caseData as any, 'Surgical', 'amended');
  if (!organisationId) return;

  // Batch 392: with its PDF, or held for retry when there is none.
  const prepared = await prepareOruR01Dispatch(caseId, instanceId, resultState, { generatePdf, previouslyReportedAs });
  if (prepared.ok === false && prepared.reason === 'not_found') return;

  const enqueueRes = await outboundResultQueueService.enqueue({
    caseId, instanceId, resultState,
    organisationId,
    ...(prepared.ok && prepared.document ? { reportDocumentId: prepared.document.id, ...(prepared.document.sha256 ? { pdfSha256: prepared.document.sha256 } : {}) } : {}),
    // Batch 559: a signed version's PDF has no document id; its hash is still recorded.
    ...(prepared.ok && !prepared.document && prepared.pdfSha256 ? { pdfSha256: prepared.pdfSha256 } : {}),
  });
  if (!enqueueRes.ok) return;
  if (prepared.ok === false) {
    await outboundResultQueueService.markFailed(enqueueRes.data.id, {
      errorCode: 'DISPATCH_REJECTED', errorMessage: prepared.error, maxRetriesExceeded: false,
    });
    return;
  }

  const result = await dispatchInterfaceMessage(enqueueRes.data.id, 'ORU_R01', prepared.payload);
  if (result.ok) {
    await outboundResultQueueService.markSent(enqueueRes.data.id);
  } else {
    await outboundResultQueueService.markFailed(enqueueRes.data.id, {
      errorCode: result.errorCode ?? 'DISPATCH_REJECTED',
      errorMessage: result.error ?? 'Unknown dispatch failure.',
      maxRetriesExceeded: false,
    });
  }
}
