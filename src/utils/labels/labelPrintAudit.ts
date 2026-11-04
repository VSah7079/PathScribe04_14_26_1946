// src/utils/labels/labelPrintAudit.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-282 (Batch 437): label prints are audited like every other document
// (services/printing/documentOutputAudit.ts). A label sent through QZ Tray or
// the PathScribe agent records the printer and whether it took the job; a
// label printed through the browser's dialog records "pending" (the browser
// never says whether paper came out). Network label prints through the
// interface engine keep their own entries (printing/attemptPrintDelivery.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { DESTINATION } from '@/services/printing/documentOutputAudit';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';

export interface LabelPrintAudit {
  /** 'requisition-label', 'container-label', 'cassette-label', … */
  document: string;
  documentId?: string | null;
  /** The accession, when the label belongs to one case. */
  caseId?: string | null;
}

export const printerDestination = (printer: Pick<PrinterProfile, 'printerId' | 'bridgeType'>): string =>
  `printer ${printer.printerId} (${printer.bridgeType})`;

export function auditLabelPrint(audit: LabelPrintAudit | undefined, destination: string, status: 'success' | 'failed' | 'pending', count?: number): void {
  if (!audit) return;
  // Loaded when first used: the label helpers also run where the app's
  // storage-backed services can't load (unit tests, the print agent's tests).
  void import('@/services/printing/recordDocumentOutput').then(({ recordDocumentOutput }) => recordDocumentOutput({
    action: 'print', document: audit.document, documentId: audit.documentId ?? null, caseId: audit.caseId ?? null,
    destination, status, rowCount: count,
  })).catch(() => { /* an audit failure never stops a print */ });
}

export const browserDialog = DESTINATION.browserPrintDialog;
