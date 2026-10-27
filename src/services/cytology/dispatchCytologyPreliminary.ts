// src/services/cytology/dispatchCytologyPreliminary.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 533 (Pete, Oct 12, 2026): sends an urgent cytology preliminary report
// to the EMR (publishReportReleasedEvent, PRELIMINARY + source CYTOLOGY).
// One message per preliminary, never deduplicated (a pathologist may send a
// second one). Queued with scope 'preliminary' so a retry rebuilds the same
// message from the release kept on the case (outboundQueueAdapters.ts); since
// Batch 538 with the release's stored report document, when it has one. A PDF
// that can't be built marks the entry failed (to retry), never sent without it.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import { caseRouter } from '../cases/CaseRouter';
import { resolveCytologyDispatchOrganisation } from './resolveCytologyDispatchOrganisation';
import { cytologyOutboundResultQueueService } from './cytologyOutboundResultQueueServiceInstance';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';
import type { CytologyPreliminaryOruR01Payload } from './buildCytologyPreliminaryOruR01Payload';
import type { ReportPdf } from '../reportDocuments/reportDocuments';

type PdfSnapshot = () => Promise<ReportPdf>;

/** The message for a preliminary kept on the case, or why it can't be built. */
export async function buildCytologyPreliminaryMessage(
  caseData: Case, releaseId: string, generatePdf?: PdfSnapshot, messageId: string = crypto.randomUUID(),
): Promise<{ payload: CytologyPreliminaryOruR01Payload } | { held: string }> {
  const release = (caseData.cytologyPreliminaryReleases ?? []).find(r => r.id === releaseId);
  if (!release) return { held: 'The preliminary report is not on the case.' };
  const pdf = await (generatePdf ?? (async () => {
    const { generateCytologyReportPdfSnapshot } = await import('./generateCytologyReportPdfSnapshot');
    return generateCytologyReportPdfSnapshot(release.reportContent);
  }))().catch((e: unknown) => ({ generationError: e instanceof Error ? e.message : 'unknown error' }) as { pdfBase64?: string; generationError?: string });
  if (!pdf.pdfBase64) return { held: `The preliminary report PDF was not built: ${pdf.generationError ?? 'unknown error'}.` };
  const label = (caseData.specimens ?? []).find(s => s.id === release.specimenId)?.label ?? release.specimenId;
  const { buildCytologyPreliminaryOruR01Payload } = await import('./buildCytologyPreliminaryOruR01Payload');
  return { payload: buildCytologyPreliminaryOruR01Payload(caseData.id, label, release, pdf.pdfBase64, messageId) };
}

/** Returns how many messages were sent (0 or 1). */
export async function dispatchCytologyPreliminary(caseId: string, releaseId: string | undefined, generatePdf?: PdfSnapshot): Promise<number> {
  if (!releaseId) return 0;
  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return 0;
  const organisationId = await resolveCytologyDispatchOrganisation(caseData, 'preliminary');
  if (!organisationId) return 0;
  // Batch 538: the release's report document; recorded on the entry so a retry sends the same bytes.
  const doc = generatePdf ? await generatePdf().catch((e: unknown) => ({ generationError: e instanceof Error ? e.message : 'unknown error' }) as ReportPdf) : undefined;
  const enqueueRes = await cytologyOutboundResultQueueService.enqueue({
    caseId, signOutRecordId: releaseId, resultState: 'PRELIMINARY', scope: 'preliminary', organisationId,
    ...(doc?.documentId ? { reportDocumentId: doc.documentId, ...(doc.sha256 ? { pdfSha256: doc.sha256 } : {}) } : {}),
  });
  if (!enqueueRes.ok) return 0;
  const built = await buildCytologyPreliminaryMessage(caseData, releaseId, doc ? async () => doc : undefined);
  if ('held' in built) {
    await cytologyOutboundResultQueueService.markFailed(enqueueRes.data.id, { errorCode: 'DISPATCH_REJECTED', errorMessage: built.held, maxRetriesExceeded: false });
    return 0;
  }
  const sent = await dispatchInterfaceMessage(enqueueRes.data.id, 'ORU_R01', built.payload as unknown as Record<string, unknown>);
  if (sent.ok) {
    await cytologyOutboundResultQueueService.markSent(enqueueRes.data.id);
    return 1;
  }
  const failure = sent as { errorCode?: 'DISPATCH_TIMEOUT' | 'DISPATCH_UNREACHABLE' | 'DISPATCH_REJECTED'; error?: string };
  await cytologyOutboundResultQueueService.markFailed(enqueueRes.data.id, {
    errorCode: failure.errorCode ?? 'DISPATCH_REJECTED', errorMessage: failure.error ?? 'Unknown dispatch failure.', maxRetriesExceeded: false,
  });
  return 0;
}
