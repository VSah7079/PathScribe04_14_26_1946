// src/services/cytology/dispatchCytologyCaseInstances.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up ("wire in Cytology") — extracted directly
// from CytologyScreeningPage.tsx's own original, inline ORU^R01
// dispatch block, unchanged in behavior, so it can be shared through
// publishReportReleasedEvent.ts (services/reports/) rather than
// living only inline in one page's own handler.
//
// Real, honest structural reason this is its own, separate function
// rather than a branch inside dispatchCaseInstances.ts: Cytology has
// no SynopticReportInstance at all — its own real sign-out unit is
// CytologySignOutRecord (mockCytologySignOutRecordService), dispatched
// through its own, already-real, separate outbound queue
// (mockCytologyOutboundResultQueueService) and payload builder
// (buildCytologyOruR01Payload) — confirmed directly before writing
// this, not assumed. These were real, working, already-tested
// implementations before this file existed; this file calls them,
// never re-implements them.
//
// Batch 532 (corrects two statements that had gone stale): cytology does
// have a PDF (since Batch 532 the consolidated case report,
// generateCytologyCaseReportPdf.ts; since Batch 539 made by the report
// renderer, not drawn in the browser), and print,
// fax and file drop use it through publishReportReleasedEvent. The registry
// submission is made by signOutCytologyCase.ts (no longer the page).
//
// Batch 532 (Pete, Oct 12, 2026): one consolidated message per accession,
// sent once the case is released, instead of one per specimen sign-out.
//
// The registry submission (REGISTRY_REPORT) stays out of this function and
// out of publishReportReleasedEvent: it is a separate regulatory obligation.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '../cases/CaseRouter';
import { mockPatientIndexService } from '../patients/mockPatientIndexService';
import { mockCytologySignOutRecordService } from './mockCytologySignOutRecordService';
import { mockCytologyOutboundResultQueueService } from './mockCytologyOutboundResultQueueService';
// Batch 527 (PS-486): buildCytologyOruR01Payload is loaded when a report is built (it carries the PDF engine).
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';
import { buildCytologyCaseReportMessage, cytologyCaseIsReleased } from './cytologyCaseReportMessage';
import type { GenerateReportPdf } from '../reports/resolveOruReportPdf';

/**
 * Batch 532 (Pete, Oct 12, 2026: "a single comprehensive message per
 * accession"). The case's FINAL result, once, when the case is released
 * (every cytology specimen signed out, or the case finalized early): one
 * consolidated message with every specimen and the case report PDF. Before
 * release it sends nothing. Called again for the same case (or for a case
 * whose specimens were sent one by one before Batch 532), it sends nothing:
 * any FINAL already queued for the case counts.
 */
/** Batch 538: `generatePdf` is the release's report document, so the result message carries the same bytes as print and fax. */
export async function dispatchCytologyCaseInstances(caseId: string, generatePdf?: GenerateReportPdf): Promise<void> {
  const caseData = await caseRouter.getCase(caseId);
  if (!caseData || !cytologyCaseIsReleased(caseData)) return;

  const patientId = (caseData as any)?.patient?.id;
  const patientRecord = patientId ? await mockPatientIndexService.getById(patientId) : null;
  // Non-blocking skip: no organisationId to enqueue against.
  if (!patientRecord) return;

  const existing = await mockCytologyOutboundResultQueueService.getByCaseId(caseId).catch(() => null);
  if (existing?.ok && existing.data.some(e => e.resultState === 'FINAL')) return;

  const recordsRes = await mockCytologySignOutRecordService.getByCaseId(caseId);
  if (!recordsRes.ok || !recordsRes.data.length) return;
  const closing = [...recordsRes.data].sort((a, b) => String(a.signedAt).localeCompare(String(b.signedAt))).pop()!;
  await sendCaseMessage(caseData, recordsRes.data, (patientRecord as any).organisationId, 'FINAL', closing.id, undefined, generatePdf);
}

/** Enqueues and sends one consolidated message (shared with dispatchCytologyAmendedCaseInstance). */
export async function sendCaseMessage(
  caseData: Parameters<typeof buildCytologyCaseReportMessage>[0],
  records: Parameters<typeof buildCytologyCaseReportMessage>[1],
  organisationId: string,
  resultState: 'FINAL' | 'CORRECTED' | 'ADDENDUM',
  signOutRecordId: string,
  previouslyReportedAs?: string,
  generatePdf?: GenerateReportPdf,
): Promise<void> {
  // Batch 538: the release's document first, so the queue entry records which one it carries.
  // A generator that throws becomes a render error, which the message build then holds for retry.
  const doc = generatePdf
    ? await generatePdf().catch((e: unknown): Awaited<ReturnType<GenerateReportPdf>> => ({ generationError: e instanceof Error ? e.message : String(e) }))
    : undefined;
  const enqueueRes = await mockCytologyOutboundResultQueueService.enqueue({
    caseId: caseData.id, signOutRecordId, resultState, scope: 'case', organisationId,
    ...(doc?.documentId ? { reportDocumentId: doc.documentId, ...(doc.sha256 ? { pdfSha256: doc.sha256 } : {}) } : {}),
  });
  if (!enqueueRes.ok) return;
  const built = await buildCytologyCaseReportMessage(caseData, records, resultState, {
    ...(resultState !== 'FINAL' ? { changedRecordId: signOutRecordId } : {}),
    ...(previouslyReportedAs ? { previouslyReportedAs } : {}),
    ...(doc ? { pdf: async () => doc } : {}),
  }).catch((e: unknown) => ({ held: e instanceof Error ? e.message : 'The case report could not be built.' }));
  if ('held' in built) {
    await mockCytologyOutboundResultQueueService.markFailed(enqueueRes.data.id, {
      errorCode: 'DISPATCH_REJECTED', errorMessage: built.held, maxRetriesExceeded: false,
    });
    return;
  }
  const dispatchResult = await dispatchInterfaceMessage(enqueueRes.data.id, 'ORU_R01', built.payload as any);
  if (dispatchResult.ok) {
    await mockCytologyOutboundResultQueueService.markSent(enqueueRes.data.id);
  } else {
    await mockCytologyOutboundResultQueueService.markFailed(enqueueRes.data.id, {
      errorCode: (dispatchResult as any).errorCode ?? 'DISPATCH_REJECTED',
      errorMessage: (dispatchResult as any).error ?? 'Unknown dispatch failure.',
      maxRetriesExceeded: false,
    });
  }
}
