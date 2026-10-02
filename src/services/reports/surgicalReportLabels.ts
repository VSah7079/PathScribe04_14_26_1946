// src/services/reports/surgicalReportLabels.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 392 (Pete: a report is written in the performing lab's language). The
// wording the surgical and autopsy report renderer (functions/main.py render_report) prints
// around the report: the case-header labels, the template caption and the
// confidentiality line, from `surgicalReportPdf.*` in the report's language.
// Sent as `labels` in the render request; a renderer given none uses English.
// Placeholders stay as {{name}} for the renderer to fill.
// Also the date of birth as the report writes it.
// ─────────────────────────────────────────────────────────────────────────────

import i18n from 'i18next';
import { resolvePdfLanguage } from './reportLanguage';

export const SURGICAL_REPORT_LABEL_KEYS = [
  'patient', 'mrn', 'dob', 'referring', 'clinician', 'reportTemplate', 'resolvedBy', 'confidential',
  // Batch 393: the renderer's placeholders for missing content.
  'notYetGenerated', 'requiredNotCompleted', 'noContent', 'noSynopticData',
  // Batch 426: one synoptic workup's own PDF (services/reports/workupPdf.ts).
  'workupParts', 'workupProtocol', 'workupVersion', 'workupStatus', 'workupSigned', 'workupDocument', 'workupChanges',
  'workupFinal', 'workupCorrected', 'workupAddendum',
] as const;
export type SurgicalReportLabels = Record<typeof SURGICAL_REPORT_LABEL_KEYS[number], string>;

/** The labels for a report language; undefined before the app's i18n has started (the renderer then uses English). */
export function surgicalReportLabelsFor(language: string | undefined): SurgicalReportLabels | undefined {
  if (!i18n.isInitialized) return undefined;
  const t = i18n.getFixedT(resolvePdfLanguage(language));
  const out = {} as SurgicalReportLabels;
  for (const key of SURGICAL_REPORT_LABEL_KEYS) {
    out[key] = t(`surgicalReportPdf.${key}`, { name: '{{name}}', interpolation: { skipOnVariables: true, escapeValue: false } }) as string;
  }
  return out;
}

/** A date of birth as the report writes it ("02 April 1988" in en-GB, "2. April 1988" in de-DE). A date with no time is read as that calendar day. */
export function formatReportDateOfBirth(iso: string | undefined, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric', ...(dateOnly ? { timeZone: 'UTC' } : {}) });
}
