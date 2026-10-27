// src/services/reports/dispatchCaseInstances.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance (the Post-Sign-Out Release Buffer / real
// outbound ORU^R01 dispatch reconciliation — "Are you sure that Finalize
// is intended for the assist mode case while signout for the
// orchestration mode cases?" and the full design that followed): the
// single, real, idempotent dispatch execution point for orchestration
// mode's initial sign-out — called from exactly two real places,
// deliberately never duplicated:
//   - handleSignOutConfirm() (useSignOutWorkflow.ts), synchronously,
//     when no release buffer applies (disabled config, or a real
//     STAT-priority bypass) — there's no reason to make a case wait on
//     a buffer that was never going to fire.
//   - checkAndReleaseIfExpired() (mockReportReleaseService.ts), when a
//     real buffer's countdown genuinely expires.
//
// Real, per direct guidance ("each specimen/instance represents its own
// discrete observation stream (OBR/OBX structure)... Do not build a new
// composite multi-report message"): deliberately per-instance, reusing
// buildOruR01Payload.ts's own, already-tested builder and
// outboundResultQueueService.ts's own, already-tested queue —
// never a new, combined whole-case payload format.
//
// Real, deliberate scope: 'FINAL' only — this function is the real,
// INITIAL dispatch for a case's first sign-out. CORRECTED/ADDENDUM
// results (real amendments, re-signed after this) stay on their
// existing, separate, unchanged path — the release buffer was never
// scoped to amendments (confirmed directly: useAmendmentWorkflow.ts has
// zero release-buffer awareness), and this pass doesn't change that.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '../cases/CaseRouter';
import { resolveDispatchOrganisation } from '../interfaceDispatch/resolveDispatchOrganisation';
import { outboundResultQueueService } from './reportServicesInstance';
import { prepareOruR01Dispatch } from './prepareOruR01Dispatch';
import { resultInstanceIds } from './resultInstances';
import type { GenerateReportPdf } from './resolveOruReportPdf';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';

export async function dispatchCaseInstances(
  caseId: string,
  /** Batch 392: the release's PDF (the one printing gets), if one was made. */
  generatePdf?: GenerateReportPdf,
): Promise<void> {
  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return;

  // Honest, non-blocking skip (recorded in the audit log): no real organisationId to enqueue against.
  const organisationId = await resolveDispatchOrganisation(caseData as any, 'Surgical', 'final');
  if (!organisationId) return;

  // Batch 393: one result per finalized synoptic report, or one for an autopsy report.
  const resultIds = resultInstanceIds(caseData as any, 'FINAL');

  for (const instanceId of resultIds) {
    const instance = { instanceId };
    // Real, idempotent dedup — this function may genuinely be called
    // more than once for the same case (a page reload mid-buffer, a
    // real retry of the whole flow) — never double-enqueue the same
    // real instance's initial FINAL result.
    const existingRes = await outboundResultQueueService.getByInstanceAndState(instance.instanceId, 'FINAL');
    if (existingRes.ok && existingRes.data.length > 0) continue;

    // Batch 392: with its PDF, or held for retry when there is none.
    const prepared = await prepareOruR01Dispatch(caseId, instance.instanceId, 'FINAL', { generatePdf });
    if (prepared.ok === false && prepared.reason === 'not_found') continue;

    const enqueueRes = await outboundResultQueueService.enqueue({
      caseId,
      instanceId: instance.instanceId,
      resultState: 'FINAL',
      organisationId,
      ...(prepared.ok && prepared.document ? { reportDocumentId: prepared.document.id, ...(prepared.document.sha256 ? { pdfSha256: prepared.document.sha256 } : {}) } : {}),
      // Batch 559: a signed version's PDF has no document id; its hash is still recorded.
      ...(prepared.ok && !prepared.document && prepared.pdfSha256 ? { pdfSha256: prepared.pdfSha256 } : {}),
    });
    if (!enqueueRes.ok) continue;
    if (prepared.ok === false) {
      await outboundResultQueueService.markFailed(enqueueRes.data.id, {
        errorCode: 'DISPATCH_REJECTED', errorMessage: prepared.error, maxRetriesExceeded: false,
      });
      continue;
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
}
