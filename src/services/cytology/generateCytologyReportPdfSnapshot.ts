// src/services/cytology/generateCytologyReportPdfSnapshot.ts
// ─────────────────────────────────────────────────────────────────────────────
// One cytology report's PDF as { pdfBase64 } or { generationError }, the shape
// print, delivery and the result messages take: a specimen's signed report
// (kept with its sign-out record) and an urgent preliminary.
//
// Batch 539 (PS-539 D2): made by the report renderer (renderCytologyPdf.ts).
// Before, the browser drew it with jsPDF in a Web Worker.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyReportContent } from '@/types/cytology/CytologyReportContent';
import { asPdfSnapshot, renderCytologyReportPdf, type RenderCytologyDeps } from './renderCytologyPdf';

export async function generateCytologyReportPdfSnapshot(
  content: CytologyReportContent,
  deps: RenderCytologyDeps = {},
): Promise<{ pdfBase64?: string; generationError?: string }> {
  return asPdfSnapshot(() => renderCytologyReportPdf(content, {}, deps));
}
