// src/services/cosd/validateCosd.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 620 (part C, PS-800): the checks PathScribe can make offline on a UK submission, before it goes to the interface
// engine. Pure; the caller passes `now`. Only checks that can be stated without the published COSD specification are made:
// the NHS number's length and check digit (the public mod-11 rule), the ICD-O-3 and ICD-10 shapes, dates, the items the
// registry definition lists as mandatory, and that the preview is well formed XML. Everything else needs the specification
// (cosdModel.ts COSD_RULES_NEEDING_SPEC) and is NOT claimed here. A finding is a fixed code, never text, and never patient data.
// ─────────────────────────────────────────────────────────────────────────────
import type { CancerRegistryReportPayload } from '../cancerRegistry/buildCancerRegistryReportPayload';
import { buildCosdXml } from './buildCosdXml';
import { isIsoDate } from './workingDays';
import type { CosdBuildOptions, CosdFinding } from './cosdModel';

/** The NHS number's check: ten digits, the first nine weighted 10 down to 2, remainder from 11 (11 becomes 0, 10 is never valid). */
export function nhsNumberStatus(raw: string | undefined): 'ok' | 'format' | 'checkDigit' {
  const digits = (raw ?? '').replace(/[\s-]/g, '');
  if (!/^\d{10}$/.test(digits)) return 'format';
  const sum = digits.slice(0, 9).split('').reduce((total, d, i) => total + Number(d) * (10 - i), 0);
  const expected = 11 - (sum % 11);
  const check = expected === 11 ? 0 : expected;
  return check === 10 || check !== Number(digits[9]) ? 'checkDigit' : 'ok';
}

const ICDO_SHAPE = /^\d{4}\/\d$/;
const ICD10_SHAPE = /^[A-Z]\d{2}(\.\d{1,2})?$/;
const XML_ENTITY_OR_AMPERSAND = /&(?!(amp|lt|gt|quot|apos);)/;

/** A small well-formedness check: tags nest and close, attributes are quoted, no bare ampersand. It is not a schema check. */
export function isWellFormedXml(xml: string): boolean {
  const stack: string[] = [];
  const tokens = xml.match(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<[^>]+>|[^<]+/g) ?? [];
  for (const token of tokens) {
    if (token.startsWith('<!--') || token.startsWith('<?')) continue;
    if (!token.startsWith('<')) { if (XML_ENTITY_OR_AMPERSAND.test(token)) return false; continue; }
    if (token.startsWith('</')) { if (stack.pop() !== token.slice(2, -1).trim()) return false; continue; }
    const name = /^<([A-Za-z_][\w.-]*)/.exec(token)?.[1];
    if (!name) return false;
    const attributes = token.replace(/^<[^\s>/]+/, '').replace(/\/?>$/, '');
    if (attributes.replace(/\s+[A-Za-z_][\w.:-]*="[^"<]*"/g, '').trim() !== '') return false;
    if (XML_ENTITY_OR_AMPERSAND.test(attributes)) return false;
    if (!token.endsWith('/>')) stack.push(name);
  }
  return stack.length === 0;
}

const parsed = (value: string | undefined): Date | undefined => (value && isIsoDate(value.slice(0, 10)) ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : undefined);

export function validateCosdPayload(payload: CancerRegistryReportPayload, now: Date): CosdFinding[] {
  const out: CosdFinding[] = [];
  const add = (code: CosdFinding['code'], field: CosdFinding['field'], severity: CosdFinding['severity'] = 'error') => out.push({ code, severity, field });

  const nhs = payload.patientIdentifier?.value;
  if (!nhs) add('PATIENT_IDENTIFIER_MISSING', 'patient');
  else { const status = nhsNumberStatus(nhs); if (status === 'format') add('NHS_NUMBER_FORMAT', 'patient'); else if (status === 'checkDigit') add('NHS_NUMBER_CHECK_DIGIT', 'patient'); }

  const dobText = payload.patient.dateOfBirth;
  const dob = parsed(dobText);
  if (!dobText) add('DOB_MISSING', 'dateOfBirth');
  else if (!dob) add('DOB_INVALID', 'dateOfBirth');
  else if (dob.getTime() > now.getTime()) add('DOB_IN_FUTURE', 'dateOfBirth');

  const diagText = payload.diagnosisDate;
  const diag = parsed(diagText);
  if (!diagText) add('DIAGNOSIS_DATE_MISSING', 'diagnosisDate');
  else if (!diag) add('DIAGNOSIS_DATE_INVALID', 'diagnosisDate');
  else {
    if (diag.getTime() > now.getTime()) add('DIAGNOSIS_DATE_IN_FUTURE', 'diagnosisDate');
    if (dob && diag.getTime() < dob.getTime()) add('DIAGNOSIS_DATE_BEFORE_BIRTH', 'diagnosisDate');
  }

  if (!payload.primaryDiagnosis.trim()) add('PRIMARY_DIAGNOSIS_MISSING', 'primaryDiagnosis');
  if (payload.icdOCodes.length === 0) add('ICDO_MISSING', 'morphology');
  if (payload.icdOCodes.some(c => !ICDO_SHAPE.test(c.code))) add('ICDO_FORMAT', 'morphology');
  if (payload.icd10Codes.some(c => !ICD10_SHAPE.test(c))) add('ICD10_FORMAT', 'icd10', 'warning');
  if (!payload.accessionNumber.trim()) add('ACCESSION_MISSING', 'accession');
  return out;
}

export interface CosdCheckResult { xml: string; findings: CosdFinding[]; ok: boolean }

/** Builds the preview and checks it. `ok` is false when any finding is an error. */
export function checkCosdSubmission(payload: CancerRegistryReportPayload, options: CosdBuildOptions, now: Date): CosdCheckResult {
  const xml = buildCosdXml(payload, options);
  const findings = validateCosdPayload(payload, now);
  if (!isWellFormedXml(xml)) findings.push({ code: 'XML_NOT_WELL_FORMED', severity: 'error', field: 'xml' });
  return { xml, findings, ok: !findings.some(f => f.severity === 'error') };
}
