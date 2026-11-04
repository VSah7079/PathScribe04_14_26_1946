// src/services/cytology/generateCytologyCaseReportPdf.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 532 (Pete, Oct 12, 2026: "Implement a Master Case Report View … one
// unified report template grouped under the parent accession number"). The
// consolidated cytology case report PDF:
//
//   - one specimen, reported: that specimen's report, exactly as signed (no
//     extra page for a one-specimen case);
//   - otherwise: a first page listing every specimen and its status, then each
//     reported specimen's own signed report, in case order, in one document.
//
// Batch 539 (PS-539 D2): made by the report renderer in one request
// (cytologyRenderPayload.ts builds it; renderCytologyPdf.ts posts it). Before,
// the browser drew each part with jsPDF and joined them with pdf-lib.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyCaseReport } from '@/types/cytology/CytologyCaseReport';
import { asPdfSnapshot, renderCytologyCaseReportPdf, type RenderCytologyDeps } from './renderCytologyPdf';

export { caseReportNeedsCover } from './cytologyRenderPayload';

export async function generateCytologyCaseReportPdf(report: CytologyCaseReport, deps: RenderCytologyDeps = {}): Promise<Uint8Array> {
  return renderCytologyCaseReportPdf(report, deps);
}

/** Base64 of the case report, in the { pdfBase64?, generationError? } shape print and delivery expect. Never throws. */
export async function generateCytologyCaseReportPdfSnapshot(report: CytologyCaseReport, deps: RenderCytologyDeps = {}): Promise<{ pdfBase64?: string; generationError?: string }> {
  return asPdfSnapshot(() => renderCytologyCaseReportPdf(report, deps));
}
