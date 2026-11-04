// src/services/printing/documentOutputAudit.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-282 (Batch 437): one audit entry for every document PathScribe prints,
// reprints, prints from a preview or exports. Pete: needed for HIPAA.
//
// It is a kind of entry in the existing audit log (services/auditlog), not a
// separate log, so the Audit Log page and its CSV show it beside everything
// else. Each entry carries the spec's §4.1.2 fields:
//
//   event        DOCUMENT_RENDERED (a stored PDF opened) | DOCUMENT_PRINTED
//                | DOCUMENT_REPRINTED | DOCUMENT_PREVIEW_PRINTED
//                | DOCUMENT_EXPORTED | DOCUMENT_FAXED
//   user         the person (or "SYSTEM" for automatic routing)
//   caseId       the accession, when the document is about one case
//   detail       document=…; id=…; version=…; destination=…; status=…;
//                at=<UTC ISO> (UTC±hh:mm); reason=…; format=…; rows=…
//
// Detail stays literal English and holds no patient identifiers (audit
// records are compliance artifacts; see services/auditlog/README.md).
//
// Status: a browser print dialog never tells the page whether paper came out,
// so a print handed to it is recorded `pending`; a download the browser
// accepted is `success`; a renderer or network failure is `failed`. Network
// label prints keep their own detailed entries (printing/attemptPrintDelivery).
// ─────────────────────────────────────────────────────────────────────────────

import type { HeldPrintOutcome } from '../reportRelease/heldPrintPolicy';
import type { AuditLog, NewAuditLog } from '../auditlog/IAuditService';

export type DocumentOutputAction = 'render' | 'print' | 'reprint' | 'preview-print' | 'export' | 'fax';
export type DocumentOutputStatus = 'success' | 'failed' | 'pending';

export const DOCUMENT_OUTPUT_EVENTS: Record<DocumentOutputAction, string> = {
  render:          'DOCUMENT_RENDERED',
  print:           'DOCUMENT_PRINTED',
  reprint:         'DOCUMENT_REPRINTED',
  // Batch 497: nothing produces this any more (the preview window was
  // retired); kept so earlier audit entries still read as prints.
  'preview-print': 'DOCUMENT_PREVIEW_PRINTED',
  export:          'DOCUMENT_EXPORTED',
  fax:             'DOCUMENT_FAXED',
};

/** Where the document went. */
export const DESTINATION = {
  browserPrintDialog: 'browser print dialog',
  pdfInBrowser:       'PDF opened in the browser',
  download:           (filename: string) => `download ${filename}`,
} as const;

export interface DocumentOutputEvent {
  action: DocumentOutputAction;
  /** What kind of document: 'surgical-report', 'audit-log', 'case-search', … */
  document: string;
  /** Which one (a case id, a batch id); omitted for whole-list exports. */
  documentId?: string | null;
  /** The document's revision, when it has one (the case record version). */
  version?: string | number | null;
  /** The accession, when the document is about one case. */
  caseId?: string | null;
  destination: string;
  status: DocumentOutputStatus;
  /** Why a reprint was made (asked for when the lab requires it). */
  reason?: string | null;
  format?: 'csv' | 'json' | 'pdf' | 'html';
  rowCount?: number;
  facilityId?: string | null;
}

const clean = (v: string) => v.replace(/[;\r\n]+/g, ',').trim();

function utcOffset(now: Date): string {
  const minutes = -now.getTimezoneOffset();
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/** The entry's detail text (pure). */
export function documentOutputDetail(e: DocumentOutputEvent, now: Date): string {
  const parts = [`document=${clean(e.document)}`];
  if (e.documentId) parts.push(`id=${clean(e.documentId)}`);
  if (e.version !== undefined && e.version !== null && e.version !== '') parts.push(`version=${clean(String(e.version))}`);
  parts.push(`destination=${clean(e.destination)}`, `status=${e.status}`, `at=${now.toISOString()} (${utcOffset(now)})`);
  if (e.reason && e.reason.trim()) parts.push(`reason=${clean(e.reason)}`);
  if (e.format) parts.push(`format=${e.format}`);
  if (typeof e.rowCount === 'number') parts.push(`rows=${e.rowCount}`);
  return parts.join('; ');
}

/** The audit entry (pure). */
export function buildDocumentOutputAuditEntry(e: DocumentOutputEvent, actor: string, now: Date): NewAuditLog {
  return {
    type: actor === 'SYSTEM' ? 'system' : 'user',
    event: DOCUMENT_OUTPUT_EVENTS[e.action],
    detail: documentOutputDetail(e, now),
    user: actor || 'unknown',
    caseId: e.caseId ?? null,
    confidence: null,
    facilityId: e.facilityId ?? null,
  };
}

export interface DocumentOutputDeps {
  logEvent: (entry: NewAuditLog) => Promise<unknown>;
  actor: () => string;
  now?: () => Date;
}

/** Records one output. Never throws: a failed audit write must not stop the print. */
export async function recordDocumentOutputWith(e: DocumentOutputEvent, deps: DocumentOutputDeps): Promise<void> {
  try {
    await deps.logEvent(buildDocumentOutputAuditEntry(e, deps.actor(), (deps.now ?? (() => new Date()))()));
  } catch { /* the audit service records its own failures */ }
}

// ── Reprints ─────────────────────────────────────────────────────────────────

const PRINT_EVENTS = new Set([DOCUMENT_OUTPUT_EVENTS.print, DOCUMENT_OUTPUT_EVENTS.reprint, DOCUMENT_OUTPUT_EVENTS['preview-print']]);

/** Whether this document was printed before (from the audit log; pure). */
export function wasPrintedBefore(logs: ReadonlyArray<Pick<AuditLog, 'event' | 'detail'>>, document: string, documentId: string): boolean {
  const head = `document=${clean(document)}; id=${clean(documentId)};`;
  return logs.some(l => PRINT_EVENTS.has(l.event) && l.detail.startsWith(head));
}

export interface PrintPlan {
  action: 'print' | 'reprint';
  /** The lab requires a reason for a reprint. */
  askReason: boolean;
  /** The report is Pending Release and the policy asks for a warning: say the copy carries the watermark. */
  warnPendingRelease: boolean;
  /** Batch 654: the Release Hold Print Policy forbids printing now. */
  blocked: boolean;
  /** Batch 654: a supervisor overriding the hold must give a reason. */
  askOverrideReason: boolean;
}

/** What happens when someone presses Print (pure). */
export function planDocumentPrint(input: { printedBefore: boolean; requireReprintReason: boolean; held: HeldPrintOutcome }): PrintPlan {
  const action = input.printedBefore ? 'reprint' : 'print';
  return {
    action,
    askReason: action === 'reprint' && input.requireReprintReason,
    warnPendingRelease: input.held.warn,
    blocked: input.held.blocked,
    askOverrideReason: input.held.askOverrideReason,
  };
}

/** Whether the person may go ahead from the print prompt (pure). */
export function printPromptComplete(plan: PrintPlan, reason: string): boolean {
  return !(plan.askReason || plan.askOverrideReason) || reason.trim().length > 0;
}
