// src/services/reports/reportTranslate.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 463: a translation function in a facility's report language (the
// performing lab's), for report text and images built from synoptic answers,
// so they match the rest of the report rather than the reader's screen.
// ─────────────────────────────────────────────────────────────────────────────

import i18n from '@/i18n/config';
import { resolveReportLocaleForFacility } from './resolveReportLocale';

export type ReportTranslate = (key: string, options?: Record<string, unknown>) => string;

/** The translation in a facility's report language. */
export async function reportTranslateFor(facilityId: string | null | undefined): Promise<ReportTranslate> {
  const { language } = await resolveReportLocaleForFacility(facilityId ?? undefined);
  return i18n.getFixedT(language) as unknown as ReportTranslate;
}
