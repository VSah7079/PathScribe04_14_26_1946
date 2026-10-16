// src/services/reportDocuments/reportDocuments.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 538 (Pete, Oct 12, 2026: the server makes every PDF that leaves
// PathScribe and the browser only shows previews, "as long as the preview
// matches exactly what gets sent out"). A released report is one stored
// document:
//
//   - made once, when it is released (or put on hold for the release delay);
//   - stored with its SHA-256 (of the PDF bytes, the same digest
//     `sha256sum report.pdf` prints), and never changed or deleted;
//   - every channel sends those bytes: the result message, print, e-fax, file
//     drop, the fallback channels and every retry. Each records the document's
//     id and hash;
//   - "View as sent" opens the same bytes, so what the pathologist sees after
//     release is byte-for-byte what went out.
//
// Before this, each channel and each retry could make or pick its own PDF: a
// fax retry of a correction resent the original sign-out PDF, a preliminary's
// fax retry was held for good, and the cytology result message drew its own
// copy alongside the held one.
//
// Pure: types and the hash. The store is reportDocumentService.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { sha256HexBytes } from '../registrySubmission/sha256';

export type ReportDocumentType = 'PRELIMINARY' | 'FINAL' | 'CORRECTED' | 'ADDENDUM';
export type ReportDocumentSource = 'SURGPATH' | 'CYTOLOGY';

/**
 * Who made the bytes:
 *   - report-renderer: the report renderer (functions/ render_report today;
 *     the API server's renderer in production);
 *   - browser-cytology: a cytology report drawn in the browser, before the
 *     renderer had the cytology template (Batch 538 only; since Batch 539 the
 *     renderer makes cytology too, as report-renderer);
 *   - saved-version: the signed PDF saved with the case's report versions
 *     (a release with no PDF of its own: the end of the release delay).
 */
export type ReportDocumentProducer = 'report-renderer' | 'browser-cytology' | 'saved-version';

export interface ReportDocument {
  id: string;
  caseId: string;
  reportType: ReportDocumentType;
  source: ReportDocumentSource;
  /** The report instance (a correction or addendum) or the cytology specimen record it is for. */
  instanceId?: string;
  releasedAt: string;
  producedBy: ReportDocumentProducer;
  /** SHA-256 of the PDF bytes, lower-case hex. */
  sha256: string;
  byteLength: number;
  createdAt: string;
}

/** The bytes, base64, kept with the document (the API server keeps them in blob storage). */
export interface StoredReportDocument extends ReportDocument {
  pdfBase64: string;
}

/** What a render or a stored document gives a channel. */
export interface ReportPdf {
  pdfBase64?: string;
  generationError?: string;
  /** Batch 556: why a stored document couldn't be read (a ReportDocumentError), so a caller can tell a passing outage from a lasting problem. */
  documentError?: string;
  /** Set once the PDF is a stored report document. */
  documentId?: string;
  sha256?: string;
  producedBy?: ReportDocumentProducer;
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** SHA-256 of a PDF given as base64, over its bytes. Pure. */
export function pdfSha256(pdfBase64: string): string {
  return sha256HexBytes(base64ToBytes(pdfBase64));
}

/** The first characters of a hash, for display ("a3f9…12c0"). The full hash is in the record. */
export function shortHash(sha256: string): string {
  return sha256.length > 12 ? `${sha256.slice(0, 8)}…${sha256.slice(-4)}` : sha256;
}
