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
  // Batch 463: in place of a map that is part of the report but couldn't be drawn as an image.
  'figureNotDrawn',
  // Batch 498 (PS-283): the revision banner and the footer document reference.
  'revisionAmendment', 'revisionAddendum', 'revisionCorrection', 'revisionDatesWithOriginal', 'revisionDatesLatestOnly',
  'documentReference', 'documentReferenceNoVersion',
  // Batch 613: the intraoperative diagnosis and the related cases the signer attached.
  'intraopDiagnosis', 'relatedCasesTitle', 'relatedCasesNotice', 'relatedCaseReleased', 'relatedCaseSpecimens',
  'relatedCaseDiagnosis', 'relatedCaseSignedBy', 'relatedCaseOrdering', 'relatedCaseCopyTo', 'relatedCaseClient',
  // Batch 618 (PS-336): the technical lab of a split case.
  'technicalComponentAt',
  // Batch 742: images and documents placed in report sections.
  'imagesTitle', 'imageUnavailable', 'documentAttached', 'documentAttachedNoCaption',
] as const;
export type SurgicalReportLabels = Record<typeof SURGICAL_REPORT_LABEL_KEYS[number], string>;

const RENDERER_PLACEHOLDERS = { name: '{{name}}', original: '{{original}}', latest: '{{latest}}', accession: '{{accession}}', version: '{{version}}', facility: '{{facility}}', caption: '{{caption}}' };

/** The labels for a report language; undefined before the app's i18n has started (the renderer then uses English). */
export function surgicalReportLabelsFor(language: string | undefined): SurgicalReportLabels | undefined {
  if (!i18n.isInitialized) return undefined;
  const t = i18n.getFixedT(resolvePdfLanguage(language));
  const out = {} as SurgicalReportLabels;
  for (const key of SURGICAL_REPORT_LABEL_KEYS) {
    // Every placeholder is passed through as itself, for the renderer to fill.
    out[key] = t(`surgicalReportPdf.${key}`, { ...RENDERER_PLACEHOLDERS, interpolation: { skipOnVariables: true, escapeValue: false } }) as string;
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
