// src/services/printing/reportPrintAudit.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-282 (Batch 451): the audit entry for printing a case report from the
// report page (print or reprint, the record version, the accession, where it
// went, and the reason when the lab asks for one). Moved out of
// SynopticReportPage.tsx's printReport so the entry can be tested; the page
// records it through recordDocumentOutput for each outcome (PDF opened,
// popup blocked so downloaded, PDF renderer unavailable so the browser print
// dialog).
// ─────────────────────────────────────────────────────────────────────────────
import type { DocumentOutputEvent, DocumentOutputStatus } from './documentOutputAudit';

/** The document name report prints are recorded (and found as "printed before") under. */
export const REPORT_DOCUMENT = 'report';

export interface ReportPrintCase {
  id: string;
  version?: string | number | null;
  accession?: { fullAccession?: string | null; accessionNumber?: string | null } | null;
}

export function reportPrintAuditEvent(
  print: { action: 'print' | 'reprint'; caseRecord: ReportPrintCase; reason: string },
  outcome: { destination: string; status: DocumentOutputStatus; format: 'pdf' | 'html' },
): DocumentOutputEvent {
  const accession = print.caseRecord.accession?.fullAccession ?? print.caseRecord.accession?.accessionNumber ?? '';
  return {
    action: print.action, document: REPORT_DOCUMENT, documentId: print.caseRecord.id, version: print.caseRecord.version ?? null,
    caseId: accession || print.caseRecord.id, destination: outcome.destination, status: outcome.status, reason: print.reason, format: outcome.format,
  };
}
