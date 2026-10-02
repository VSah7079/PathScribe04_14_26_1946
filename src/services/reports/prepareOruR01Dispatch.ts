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
//
// `heldMessage` is the queue entry's error text (English: it is a queue
// record, read in the failed-messages screen and the audit trail).
// ─────────────────────────────────────────────────────────────────────────────

import type { OruResultState } from '@/types/case/OutboundResultQueueEntry';
import { buildOruR01Payload, type OruR01Payload } from './buildOruR01Payload';
import { resolveOruReportPdf, type GenerateReportPdf, type ResolveOruReportPdfDeps } from './resolveOruReportPdf';

export type PreparedOruR01 =
  | { ok: true; payload: OruR01Payload }
  | { ok: false; reason: 'pdf_unavailable' | 'not_found'; error: string };

import { heldMessage } from './heldMessage';
export { heldMessage };

export async function prepareOruR01Dispatch(
  caseId: string,
  instanceId: string,
  resultState: OruResultState,
  options: { generatePdf?: GenerateReportPdf; previouslyReportedAs?: string } = {},
  deps?: ResolveOruReportPdfDeps,
): Promise<PreparedOruR01> {
  const pdf = await resolveOruReportPdf({ caseId, instanceId, resultState, generatePdf: options.generatePdf }, deps);
  if (pdf.ok === false) return { ok: false, reason: 'pdf_unavailable', error: heldMessage(pdf.error) };
  const payload = await buildOruR01Payload(caseId, instanceId, resultState, async () => ({ pdfBase64: pdf.pdfBase64 }), undefined, options.previouslyReportedAs);
  if (!payload) return { ok: false, reason: 'not_found', error: 'Could not build the message: the case or its report may no longer exist.' };
  return { ok: true, payload };
}
