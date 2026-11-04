// src/services/reports/prepareOruR01Dispatch.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 392. Builds one surgical / preliminary / autopsy ORU^R01 message with
// its report PDF (resolveOruReportPdf), or says why it can't be sent yet. Used
// by the three dispatchers at release and by the failed-messages screen on a
// retry, so both send the same thing.
//
//   { ok: true, payload }                      send it
//   { ok: false, reason: 'pdf_unavailable' }   hold: queue it failed, retry later
//   { ok: false, reason: 'not_found' }         nothing to send (no case/instance)
//   { ok: false, reason: 'version_unknown' }   hold (Batch 559): the server's report versions
//                                              couldn't be read, so the workup's version isn't known
//
// `heldMessage` is the queue entry's error text (English: it is a queue
// record, read in the failed-messages screen and the audit trail).
// ─────────────────────────────────────────────────────────────────────────────

import type { OruResultState } from '@/types/case/OutboundResultQueueEntry';
import { buildOruR01Payload, type OruR01Payload } from './buildOruR01Payload';
import { workupVersionUnknown } from './oruWorkupVersion';
import { resolveOruReportPdf, type GenerateReportPdf, type ResolveOruReportPdfDeps } from './resolveOruReportPdf';

export type PreparedOruR01 =
  | { ok: true; payload: OruR01Payload; document?: { id: string; sha256?: string }; pdfSha256?: string }
  | { ok: false; reason: 'pdf_unavailable' | 'not_found' | 'version_unknown'; error: string };

import { heldMessage } from './heldMessage';
export { heldMessage };

export async function prepareOruR01Dispatch(
  caseId: string,
  instanceId: string,
  resultState: OruResultState,
  options: { generatePdf?: GenerateReportPdf; previouslyReportedAs?: string; documentId?: string } = {},
  deps?: ResolveOruReportPdfDeps,
): Promise<PreparedOruR01> {
  const pdf = await resolveOruReportPdf({ caseId, instanceId, resultState, generatePdf: options.generatePdf, documentId: options.documentId }, deps);
  if (pdf.ok === false) return { ok: false, reason: 'pdf_unavailable', error: heldMessage(pdf.error) };
  const payload = await buildOruR01Payload(caseId, instanceId, resultState, async () => ({ pdfBase64: pdf.pdfBase64 }), undefined, options.previouslyReportedAs);
  if (!payload) return { ok: false, reason: 'not_found', error: 'Could not build the message: the case or its report may no longer exist.' };
  if (workupVersionUnknown(payload)) {
    return { ok: false, reason: 'version_unknown', error: "Held: the PathScribe server's list of report versions could not be read, so this result's workup version is not known. The result is sent when retried." };
  }
  // Batch 559: the PDF's fingerprint goes with the message whenever it is known, for the receiver to check.
  if (pdf.sha256) payload.reportPdfSha256 = pdf.sha256;
  // Batch 538: the report document it carries, recorded on the queue entry so a retry sends the same one.
  // Batch 559: a signed version's PDF has no document; its hash is recorded on the entry instead.
  return { ok: true, payload, ...(pdf.documentId ? { document: { id: pdf.documentId, ...(pdf.sha256 ? { sha256: pdf.sha256 } : {}) } } : pdf.sha256 ? { pdfSha256: pdf.sha256 } : {}) };
}
