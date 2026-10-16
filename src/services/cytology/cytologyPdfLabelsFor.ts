// src/services/cytology/cytologyPdfLabelsFor.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-340 follow-up (Batch 391). The report PDF's wording for a report's
// language, read from the app's locale files (`cytologyPdf.*`). Since Batch 539
// the labels go to the report renderer with the report's text
// (cytologyRenderPayload.ts). An unknown language is English. If i18n
// isn't ready (a test, early start-up), English.
// ─────────────────────────────────────────────────────────────────────────────

import i18n from 'i18next';
import { resolvePdfLanguage } from '../reports/reportLanguage';
import { buildCytologyPdfLabels, ENGLISH_CYTOLOGY_PDF_LABELS, type CytologyPdfLabels } from './cytologyPdfLabels';
import { PRELIMINARY_WATERMARK_KEY } from '../reports/resolveReportWatermark';

export function cytologyPdfLabelsFor(reportLanguage: string | undefined): CytologyPdfLabels {
  const language = resolvePdfLanguage(reportLanguage);
  if (language === 'en' || !i18n.isInitialized) return ENGLISH_CYTOLOGY_PDF_LABELS;
  const t = i18n.getFixedT(language);
  return buildCytologyPdfLabels((key, options) => t(key, options) as string);
}

/** Batch 539: an unsigned preview's watermark, in the report's language (the surgical print's wording). */
export function cytologyPreviewWatermarkFor(reportLanguage: string | undefined): string {
  const english = 'PRELIMINARY — SUBJECT TO CHANGE';
  if (!i18n.isInitialized) return english;
  const text = i18n.getFixedT(resolvePdfLanguage(reportLanguage))(PRELIMINARY_WATERMARK_KEY) as string;
  return text && text !== PRELIMINARY_WATERMARK_KEY ? text : english;
}
