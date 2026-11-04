// src/services/reports/reportLanguage.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-340 follow-up (Batch 391, Pete): a report is written in the language of the
// lab that performs it, not the language of the person at the screen. Dutch labs
// report in Dutch, German labs in German. Each facility can carry a
// `reportLanguage`; when it doesn't, the jurisdiction decides. An administrator
// changes it for the labs the jurisdiction can't settle (a French-speaking lab
// in Canada, a Dutch- or French-speaking lab in Belgium). Dates follow the lab's
// jurisdiction (resolveReportDateLocale).
//
// The language is stored with the report at sign-out, so a reprint or resend
// is always in the language the report was signed in, and a correction or an
// addendum keeps the original's.
//
// Pure. The languages are the app's own (i18n/config.ts SUPPORTED_LANGUAGES); a
// test keeps the two lists equal.
// ─────────────────────────────────────────────────────────────────────────────

import type { Jurisdiction } from '@/types/systemConfig';

export const REPORT_LANGUAGES = ['en', 'fr', 'fr-BE', 'de', 'nl', 'nl-BE', 'ko', 'es'] as const;
export type ReportLanguage = typeof REPORT_LANGUAGES[number];

/**
 * What each jurisdiction reports in until an administrator says otherwise.
 * Belgium is bilingual; it starts as Dutch (Belgian variant) and a French-
 * speaking Belgian lab sets French (Belgian variant). Canada starts as English.
 */
export const DEFAULT_REPORT_LANGUAGE_BY_JURISDICTION: Readonly<Record<Jurisdiction, ReportLanguage>> = {
  US: 'en', CA: 'en', GB_EW: 'en', GB_SCT: 'en', GB_NIR: 'en', IE: 'en', AU: 'en', NZ: 'en',
  KR: 'ko', BE: 'nl-BE', NL: 'nl', DE: 'de', FR: 'fr', ES: 'es',
};

export function isReportLanguage(value: unknown): value is ReportLanguage {
  return typeof value === 'string' && (REPORT_LANGUAGES as readonly string[]).includes(value);
}

export function defaultReportLanguage(jurisdiction: Jurisdiction | undefined): ReportLanguage {
  return (jurisdiction && DEFAULT_REPORT_LANGUAGE_BY_JURISDICTION[jurisdiction]) || 'en';
}

/** The language a lab reports in: its own setting, else its jurisdiction's default. */
export function resolveReportLanguage(lab: { reportLanguage?: string; jurisdiction?: Jurisdiction } | undefined): ReportLanguage {
  if (lab && isReportLanguage(lab.reportLanguage)) return lab.reportLanguage;
  return defaultReportLanguage(lab?.jurisdiction);
}

/** The language a PDF is worded in: the report's, or English if it has none or an unknown one. */
export function resolvePdfLanguage(language: string | undefined): ReportLanguage {
  return isReportLanguage(language) ? language : 'en';
}

/** Date format when a report carries no locale of its own. */
const DATE_LOCALE_BY_LANGUAGE: Readonly<Record<ReportLanguage, string>> = {
  en: 'en-US', fr: 'fr-FR', 'fr-BE': 'fr-BE', de: 'de-DE', nl: 'nl-NL', 'nl-BE': 'nl-BE', ko: 'ko-KR', es: 'es-ES',
};

/**
 * How the report writes dates and times: the lab's jurisdiction (a UK lab
 * writes 02/04/1988 and a 24-hour clock, a US lab 04/02/1988), else the
 * language's usual format.
 */
export function resolveReportDateLocale(lab: { reportLanguage?: string; jurisdiction?: Jurisdiction } | undefined, jurisdictionLocale: (j: Jurisdiction) => string | undefined): string {
  const fromJurisdiction = lab?.jurisdiction ? jurisdictionLocale(lab.jurisdiction) : undefined;
  return fromJurisdiction ?? DATE_LOCALE_BY_LANGUAGE[resolveReportLanguage(lab)];
}

/** Date format for a stored report: its own, else from its language. */
export function reportDateLocale(content: { language?: string; locale?: string }): string {
  return content.locale ?? DATE_LOCALE_BY_LANGUAGE[resolvePdfLanguage(content.language)];
}
