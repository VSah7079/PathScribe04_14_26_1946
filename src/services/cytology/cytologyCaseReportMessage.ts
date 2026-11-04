// src/services/cytology/cytologyCaseReportMessage.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 532 (Pete, Oct 12, 2026): building the one consolidated cytology
// result message for an accession, for the first send and for a retry
// (services/interfaceDispatch/outboundQueueAdapters.ts). Shared, so a retry
// sends exactly what the first attempt would have: the case report as it
// stands, with the same changed specimen.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CytologySignOutRecord } from '@/types/cytology/CytologySignOutRecord';
import { resolveCytologyCaseReport } from './resolveCytologyCaseReport';
import type { CytologyCaseOruR01Payload } from './buildCytologyCaseOruR01Payload';
import type { GenerateReportPdf } from '../reports/resolveOruReportPdf';
import type { ReportPdf } from '../reportDocuments/reportDocuments';

/** Whether the case has been released (closed): signed out in full, or finalized early (pure). */
export function cytologyCaseIsReleased(c: Pick<Case, 'status' | 'cytologyEarlyFinalization'>): boolean {
  return c.status === 'finalized' || c.status === 'closed' || !!c.cytologyEarlyFinalization;
}

export async function buildCytologyCaseReportMessage(
  caseData: Case,
  records: readonly CytologySignOutRecord[],
  resultState: 'FINAL' | 'CORRECTED' | 'ADDENDUM',
  options: {
    changedRecordId?: string; previouslyReportedAs?: string; messageId?: string;
    /** Batch 538: the release's report document (the same bytes print and fax get); a retry passes the entry's. */
    pdf?: GenerateReportPdf;
  } = {},
): Promise<{ payload: CytologyCaseOruR01Payload; document?: { id: string; sha256?: string } } | { held: string }> {
  const report = resolveCytologyCaseReport(caseData, records);
  if (!report.specimens.some(s => s.record)) return { held: 'The case has no signed cytology specimen to report.' };
  const pdf: ReportPdf = options.pdf
    ? await options.pdf()
    : await (await import('./generateCytologyCaseReportPdf')).generateCytologyCaseReportPdfSnapshot(report);
  if (!pdf.pdfBase64) return { held: `The case report PDF was not built: ${pdf.generationError ?? 'unknown error'}.` };
  const { buildCytologyCaseOruR01Payload } = await import('./buildCytologyCaseOruR01Payload');
  return {
    ...(pdf.documentId ? { document: { id: pdf.documentId, ...(pdf.sha256 ? { sha256: pdf.sha256 } : {}) } } : {}),
    payload: buildCytologyCaseOruR01Payload(report, resultState, pdf.pdfBase64, {
      messageId: options.messageId ?? crypto.randomUUID(),
      ...(options.changedRecordId ? { changedRecordId: options.changedRecordId } : {}),
      ...(options.previouslyReportedAs ? { previouslyReportedAs: options.previouslyReportedAs } : {}),
    }),
  };
}
