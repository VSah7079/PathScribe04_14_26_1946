// src/services/cytology/cytologyPdfLabelsFor.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-340 follow-up (Batch 391). The report PDF's wording for a report's
// language, read from the app's locale files (`cytologyPdf.*`). Main thread only
// (the PDF worker gets the result as data; see cytologyPdfLabels.ts). An unknown
// language is English. If i18n
// isn't ready (a test, early start-up), English.
// ─────────────────────────────────────────────────────────────────────────────

import i18n from 'i18next';
import { resolvePdfLanguage } from '../reports/reportLanguage';
import { buildCytologyPdfLabels, ENGLISH_CYTOLOGY_PDF_LABELS, type CytologyPdfLabels } from './cytologyPdfLabels';

export function cytologyPdfLabelsFor(reportLanguage: string | undefined): CytologyPdfLabels {
  const language = resolvePdfLanguage(reportLanguage);
  if (language === 'en' || !i18n.isInitialized) return ENGLISH_CYTOLOGY_PDF_LABELS;
  const t = i18n.getFixedT(language);
  return buildCytologyPdfLabels((key, options) => t(key, options) as string);
}
