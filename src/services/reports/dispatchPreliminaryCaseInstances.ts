// src/services/reports/dispatchPreliminaryCaseInstances.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up ("Component A refinement: formalize a
// real Report_Released_Event") — extracted directly from
// releasePreliminaryReport.ts's own original dispatch loop, unchanged
// in behavior, so that both releasePreliminaryReport.ts (which owns
// the real, Preliminary-specific guards and attestation-field write)
// and publishReportReleasedEvent.ts (the new, real, shared trigger
// point) can call the same, real dispatch logic — never two, slightly
// different copies of it.
//
// Mirrors dispatchCaseInstances.ts's own real shape and naming
// convention, with one deliberate difference: returns a real count
// rather than void, since a Preliminary release's own real caller (the
// UI) needs an honest number to report back to the pathologist ("2
// specimens released" vs. a false, generic success).
//
// Real, deliberate: no dedup check here, unlike the strict,
// one-time-only FINAL dispatch in dispatchCaseInstances.ts. A
// pathologist may legitimately release more than one Preliminary
// report for the same instance as findings develop (the acute
// leukemia bone marrow case, released again once flow cytometry's own
// partial results come back) — each is its own, real, separately
// timestamped message, not a re-send of the same one.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '../cases/CaseRouter';
import { prepareOruR01Dispatch } from './prepareOruR01Dispatch';
import { resultInstanceIds } from './resultInstances';
import type { GenerateReportPdf } from './resolveOruReportPdf';
import { mockOutboundResultQueueService } from './mockOutboundResultQueueService';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';

export async function dispatchPreliminaryCaseInstances(
  caseId: string,
  /** Batch 392: the release's PDF (the one printing gets), if one was made. */
  generatePdf?: GenerateReportPdf,
): Promise<number> {
  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return 0;

  // Batch 393: one result per synoptic report, or one for an autopsy report (the PAD).
  const instances = resultInstanceIds(caseData as any, 'PRELIMINARY').map(instanceId => ({ instanceId }));
  let dispatchedCount = 0;

  for (const instance of instances) {
    // Batch 392: with its PDF, or held for retry when there is none.
    const prepared = await prepareOruR01Dispatch(caseId, instance.instanceId, 'PRELIMINARY', { generatePdf });
    if (prepared.ok === false && prepared.reason === 'not_found') continue;

    const enqueueRes = await mockOutboundResultQueueService.enqueue({
      caseId,
      instanceId: instance.instanceId,
      resultState: 'PRELIMINARY',
      organisationId: (caseData as any)?.patient?.organisationId,
      ...(prepared.ok && prepared.document ? { reportDocumentId: prepared.document.id, ...(prepared.document.sha256 ? { pdfSha256: prepared.document.sha256 } : {}) } : {}),
      // Batch 559: a signed version's PDF has no document id; its hash is still recorded.
      ...(prepared.ok && !prepared.document && prepared.pdfSha256 ? { pdfSha256: prepared.pdfSha256 } : {}),
    });
    if (!enqueueRes.ok) continue;
    dispatchedCount++; // queued, whether sent now or held for retry
    if (prepared.ok === false) {
      await mockOutboundResultQueueService.markFailed(enqueueRes.data.id, {
        errorCode: 'DISPATCH_REJECTED', errorMessage: prepared.error, maxRetriesExceeded: false,
      });
      continue;
    }

    await dispatchInterfaceMessage(enqueueRes.data.id, 'ORU_R01', prepared.payload);
  }

  return dispatchedCount;
}
