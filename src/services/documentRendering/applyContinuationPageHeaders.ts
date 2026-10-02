// src/services/documentRendering/applyContinuationPageHeaders.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-277 §1.2.1 (Master Template Engine — modular
// header/footer) — "continuation pages (2+) get an abbreviated header
// showing Patient Name, MRN, Accession Number, and Page X of Y."
//
// Deliberately a LAST pass, called once the caller's own real content
// layout is completely finished: "Page X of Y" cannot be correct any
// earlier than doc.getNumberOfPages() reflecting the true, final count.
// The first page is deliberately left untouched — it already carries
// the report's own full title and administrative/patient section, so
// repeating an abbreviated version there would be redundant, not
// missing.
//
// Callers MUST reserve CONTINUATION_HEADER_HEIGHT_MM of real vertical
// space at the top of every page they themselves add via
// doc.addPage() (i.e. resume content at MARGIN + CONTINUATION_HEADER_HEIGHT_MM,
// not MARGIN, on every page after the first) — this function only
// draws INTO that reserved band on this second pass; it cannot safely
// push already-placed real content down after the fact.
//
// Real, per PS-276 §1.1.1 gap-closing — this function's own text draw
// now uses EMBEDDED_PRINT_FONT_FAMILY instead of jsPDF's built-in
// 'helvetica'. Real, deliberate reason this matters here specifically:
// a genuine PDF/A embedded-fonts requirement means EVERY font actually
// used anywhere in the document must be embedded, not just the body
// text — a continuation-page header left on the old, non-embeddable
// 'helvetica' would have been a real, easy-to-miss partial-compliance
// gap in an otherwise-embedded document. Callers MUST call
// registerEmbeddedPrintFont(doc) on this same doc instance before
// calling this function (generateCytologyReportPdf.ts's own real
// caller already does, at the top of generateCytologyReportPdf()).
// ─────────────────────────────────────────────────────────────────────────────

import type { jsPDF } from 'jspdf';
import { EMBEDDED_PRINT_FONT_FAMILY } from './registerEmbeddedPrintFont';

/** Real, deliberate constant — enough real vertical room for one real
 *  ~8pt text line plus a visible divider rule and a small buffer.
 *  Exported so every real caller that adds its own pages reserves
 *  exactly this much space at the top of each, rather than each
 *  guessing its own value independently. */
export const CONTINUATION_HEADER_HEIGHT_MM = 12;

export interface ContinuationHeaderIdentity {
  patientName: string;
  patientMrn?: string;
  accessionNumber: string;
}

export interface ContinuationHeaderLayout {
  marginMm: number;
  pageWidthMm: number;
}

/** Batch 391: the wording of the line, with {{placeholders}} (mrn, accession, page/total). Defaults are the English wording used before. */
export interface ContinuationHeaderLabels { mrn: string; accession: string; page: string }
const DEFAULT_LABELS: ContinuationHeaderLabels = { mrn: 'MRN {{mrn}}', accession: 'Accession: {{accession}}', page: 'Page {{page}} of {{total}}' };
const fill = (tpl: string, vars: Record<string, string | number>) => tpl.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => String(vars[k] ?? ''));

export function applyContinuationPageHeaders(
  doc: jsPDF,
  identity: ContinuationHeaderIdentity,
  layout: ContinuationHeaderLayout,
  labels: ContinuationHeaderLabels = DEFAULT_LABELS,
  /** Batch 391: the family the document is printed in (Pretendard for Korean). */
  fontFamily: string = EMBEDDED_PRINT_FONT_FAMILY,
): void {
  const totalPages = doc.getNumberOfPages();
  for (let page = 2; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(8);
    const line = [identity.patientName, identity.patientMrn ? fill(labels.mrn, { mrn: identity.patientMrn }) : '', fill(labels.accession, { accession: identity.accessionNumber }), fill(labels.page, { page, total: totalPages })].filter(Boolean).join(' · ');
    doc.text(line, layout.marginMm, layout.marginMm + 4);
    doc.setDrawColor(180);
    doc.line(layout.marginMm, layout.marginMm + 6, layout.pageWidthMm - layout.marginMm, layout.marginMm + 6);
  }
}
