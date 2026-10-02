// src/services/cytology/cytologyPdfLabels.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-340 follow-up (Batch 391). The wording the cytology report PDF prints
// around the report's own content: the title, the section headers, the labels,
// the sign-off line and the correction / addendum banner. It follows the
// report's language (services/reports/reportLanguage.ts).
//
// The PDF is built in a Web Worker that has no i18n, so the wording travels as
// plain data: `cytologyPdfLabelsFor` (cytologyPdfLabelsFor.ts, main thread) reads
// it from the locale files (`cytologyPdf.*`) and the generator only fills the
// {{placeholders}}. This file has no i18n import so the worker stays small.
// ENGLISH_CYTOLOGY_PDF_LABELS is what a caller that passes no labels gets; a
// test keeps it equal to `cytologyPdf` in en.json.
//
// The report's own content (diagnosis wording from the dictionary, the reason,
// the addendum text, the HPV result text, patient details) is stored data and
// prints as stored.
// ─────────────────────────────────────────────────────────────────────────────

/** Each label and the placeholders its text takes. */
export const CYTOLOGY_PDF_LABEL_VARS = {
  title: [], patient: [], specimenType: [], specimenAdequacy: [], generalCategorization: [], interpretation: [],
  adjunctive: [], recommendations: [], addendum: [], signOff: [],
  dob: ['date'], mrn: ['mrn'], accession: ['accession'], orderingProvider: ['name'],
  collected: ['date'], received: ['date'], lmp: ['date'],
  hpv: ['result'], computerAssisted: ['value'], yes: [], no: [],
  director: ['name'], clia: ['number'],
  screenedBy: ['name'], signedBy: ['name', 'role', 'date'], rolePathologist: [], roleCytotechnologist: [],
  prepLiquidBased: [], prepConventional: [],
  correctedReport: [], addendumBanner: [], reason: ['reason'], previouslyReported: ['diagnosis'],
  continuationPage: ['page', 'total'], metadataTitle: ['accession'], metadataSubject: [],
} as const satisfies Record<string, readonly string[]>;

export type CytologyPdfLabelKey = keyof typeof CYTOLOGY_PDF_LABEL_VARS;
export type CytologyPdfLabels = Record<CytologyPdfLabelKey, string>;

export const CYTOLOGY_PDF_LABEL_KEYS = Object.keys(CYTOLOGY_PDF_LABEL_VARS) as CytologyPdfLabelKey[];

export const ENGLISH_CYTOLOGY_PDF_LABELS: CytologyPdfLabels = {
  title: 'Cytology Report — GYN Cervical Screening',
  patient: 'Patient',
  specimenType: 'Specimen Type',
  specimenAdequacy: 'Specimen Adequacy',
  generalCategorization: 'General Categorization',
  interpretation: 'Interpretation / Diagnostic Result',
  adjunctive: 'Adjunctive Testing & Integrated Results',
  recommendations: 'Recommendations & Comments',
  addendum: 'Addendum',
  signOff: 'Sign-Off',
  dob: 'DOB {{date}}',
  mrn: 'MRN {{mrn}}',
  accession: 'Accession: {{accession}}',
  orderingProvider: 'Ordering Provider: {{name}}',
  collected: 'Collected: {{date}}',
  received: 'Received: {{date}}',
  lmp: 'LMP: {{date}}',
  hpv: 'HPV: {{result}}',
  computerAssisted: 'Computer-Assisted Screening: {{value}}',
  yes: 'Yes',
  no: 'No',
  director: 'Director: {{name}}',
  clia: 'CLIA/ISO: {{number}}',
  screenedBy: 'Screened by: {{name}}',
  signedBy: 'Signed by: {{name}}, {{role}} — {{date}}',
  rolePathologist: 'Pathologist',
  roleCytotechnologist: 'Cytotechnologist',
  prepLiquidBased: 'Liquid-Based',
  prepConventional: 'Conventional',
  correctedReport: 'CORRECTED REPORT',
  addendumBanner: 'ADDENDUM',
  reason: 'Reason: {{reason}}',
  previouslyReported: 'Previously reported as: {{diagnosis}}',
  continuationPage: 'Page {{page}} of {{total}}',
  metadataTitle: 'Cytology Report — {{accession}}',
  metadataSubject: 'Cytology Report',
};

/** Fills a label's {{placeholders}}; a missing value becomes empty. */
export function fillLabel(template: string, vars: Record<string, string | number | undefined> = {}): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(vars[name] ?? ''));
}

/** Builds the label set from a translate function (keys are `cytologyPdf.<label>`). Pure. */
export function buildCytologyPdfLabels(
  t: (key: string, options: Record<string, unknown>) => string,
): CytologyPdfLabels {
  const out = {} as CytologyPdfLabels;
  for (const key of CYTOLOGY_PDF_LABEL_KEYS) {
    // Each placeholder is handed back as itself, so the generator fills it later.
    const vars = Object.fromEntries((CYTOLOGY_PDF_LABEL_VARS[key] as readonly string[]).map(v => [v, `{{${v}}}`]));
    out[key] = t(`cytologyPdf.${key}`, { ...vars, interpolation: { skipOnVariables: true, escapeValue: false } });
  }
  return out;
}
