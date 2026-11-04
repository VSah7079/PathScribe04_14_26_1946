// Batch 620 (part C, PS-800): the UK COSD checks and preview: working days, the NHS number rule, the preview XML, the findings, the correction status.
import { describe, it, expect } from 'vitest';
import type { CancerRegistryReportPayload } from '../cancerRegistry/buildCancerRegistryReportPayload';
import { addWorkingDays, calendarDaysBetween, isIsoDate, isWorkingDay } from './workingDays';
import { buildCosdXml, escapeXml } from './buildCosdXml';
import { checkCosdSubmission, isWellFormedXml, nhsNumberStatus, validateCosdPayload } from './validateCosd';
import { COSD_RULES_NEEDING_SPEC, COSD_MODEL_STATUS } from './cosdModel';
import { correctionStatus } from './cosdFeed';
import { samplePayload } from './cosdSample';

const NOW = new Date('2026-10-19T09:00:00Z');
const payload = (over: Partial<CancerRegistryReportPayload> = {}): CancerRegistryReportPayload => ({
  messageId: 'm1', timestamp: '2026-10-19T08:00:00.000Z', registryId: 'cosd_uk', facilityId: 'fac-a', facilityName: 'Westside',
  patient: { name: 'Sample', dateOfBirth: '1960-05-02' }, accessionNumber: 'S26-1', diagnosisDate: '2026-10-01', primaryDiagnosis: 'Invasive ductal carcinoma',
  icdOCodes: [{ code: '8500/3', description: 'Infiltrating duct carcinoma', behaviorCode: '3' }], icd10Codes: ['C50.9'],
  patientIdentifier: { formatId: 'mrn_nhs', value: '9434765919', verification: 'verified', fromNationalIdentifier: true }, ...over,
});

describe('working days', () => {
  it('skips weekends: five working days from Friday is the next Friday', () => {
    expect(addWorkingDays(new Date('2026-10-16T09:00:00Z'), 5).toISOString()).toBe('2026-10-23T09:00:00.000Z');
  });
  it('skips the non-working dates the lab lists', () => {
    expect(addWorkingDays(new Date('2026-10-19T09:00:00Z'), 5, ['2026-10-21']).toISOString()).toBe('2026-10-27T09:00:00.000Z');
  });
  it('zero days returns the same moment, and the weekday test reads UTC', () => {
    expect(addWorkingDays(NOW, 0).getTime()).toBe(NOW.getTime());
    expect(isWorkingDay(new Date('2026-10-17T09:00:00Z'), [])).toBe(false);
    expect(isWorkingDay(new Date('2026-10-19T09:00:00Z'), ['2026-10-19'])).toBe(false);
  });
  it('knows a real date from a made-up one, and counts calendar days', () => {
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-10-19')).toBe(true);
    expect(calendarDaysBetween(new Date('2026-10-16T09:00:00Z'), new Date('2026-10-23T09:00:00Z'))).toBe(7);
  });
});

describe('NHS number check', () => {
  it('accepts a number with a good check digit, with or without spaces', () => {
    expect(nhsNumberStatus('9434765919')).toBe('ok');
    expect(nhsNumberStatus('943 476 5919')).toBe('ok');
  });
  it('refuses a wrong check digit, a wrong length and nothing at all', () => {
    expect(nhsNumberStatus('9434765918')).toBe('checkDigit');
    expect(nhsNumberStatus('94347659')).toBe('format');
    expect(nhsNumberStatus(undefined)).toBe('format');
  });
  it('a remainder that makes ten is never valid', () => {
    expect(nhsNumberStatus('0000000060')).toBe('checkDigit');
  });
});

describe('the preview', () => {
  it('is a labelled simplified model with the values from the payload', () => {
    const xml = buildCosdXml(payload(), { submissionId: 'sub-1', messageType: 'NEW' });
    expect(xml).toContain(`model="${COSD_MODEL_STATUS}"`);
    expect(xml).toContain('<NhsNumber>9434765919</NhsNumber>');
    expect(xml).toContain('<Morphology code="8500/3" behaviour="3"');
    expect(xml).toContain('<Icd10 code="C50.9"/>');
    expect(xml).toContain("not the official COSD schema");
  });
  it('an amendment names the submission it amends', () => {
    const xml = buildCosdXml(payload(), { submissionId: 'sub-2', messageType: 'AMENDMENT', amendsSubmissionId: 'sub-1' });
    expect(xml).toContain('type="AMENDMENT"');
    expect(xml).toContain('amends="sub-1"');
  });
  it('escapes text so it stays well formed', () => {
    expect(escapeXml(`a & b < c "d"`)).toBe('a &amp; b &lt; c &quot;d&quot;');
    const xml = buildCosdXml(payload({ primaryDiagnosis: 'Tumour <5 mm & "small"' }), { submissionId: 's', messageType: 'NEW' });
    expect(isWellFormedXml(xml)).toBe(true);
  });
  it('the well-formedness check catches a bare ampersand, a mismatched tag and an unquoted attribute', () => {
    expect(isWellFormedXml('<a>1 & 2</a>')).toBe(false);
    expect(isWellFormedXml('<a><b></a></b>')).toBe(false);
    expect(isWellFormedXml('<a b=1/>')).toBe(false);
    expect(isWellFormedXml('<a b="1"><c/></a>')).toBe(true);
  });
});

describe('findings', () => {
  const codes = (p: CancerRegistryReportPayload) => validateCosdPayload(p, NOW).map(f => f.code);
  it('a complete submission has none and is ok', () => {
    expect(codes(payload())).toEqual([]);
    expect(checkCosdSubmission(payload(), { submissionId: 's', messageType: 'NEW' }, NOW).ok).toBe(true);
  });
  it('names each thing missing', () => {
    const out = codes(payload({ patientIdentifier: undefined, patient: { name: '' }, diagnosisDate: undefined, primaryDiagnosis: '', icdOCodes: [], accessionNumber: '' }));
    expect(out).toEqual(['PATIENT_IDENTIFIER_MISSING', 'DOB_MISSING', 'DIAGNOSIS_DATE_MISSING', 'PRIMARY_DIAGNOSIS_MISSING', 'ICDO_MISSING', 'ACCESSION_MISSING']);
  });
  it('a bad NHS number is an error and the submission is held', () => {
    const p = payload({ patientIdentifier: { formatId: 'mrn_nhs', value: '9434765918', verification: 'formatOnly', fromNationalIdentifier: true } });
    expect(codes(p)).toEqual(['NHS_NUMBER_CHECK_DIGIT']);
    expect(checkCosdSubmission(p, { submissionId: 's', messageType: 'NEW' }, NOW).ok).toBe(false);
  });
  it('checks the dates against each other and against today', () => {
    expect(codes(payload({ patient: { name: '', dateOfBirth: '2027-01-01' } }))).toContain('DOB_IN_FUTURE');
    expect(codes(payload({ diagnosisDate: '1950-01-01' }))).toEqual(['DIAGNOSIS_DATE_BEFORE_BIRTH']);
    expect(codes(payload({ diagnosisDate: '2027-01-01' }))).toEqual(['DIAGNOSIS_DATE_IN_FUTURE']);
    expect(codes(payload({ diagnosisDate: '2026-13-40' }))).toEqual(['DIAGNOSIS_DATE_INVALID']);
  });
  it('checks the shape of the codes; a wrong ICD-10 shape is a warning only', () => {
    expect(codes(payload({ icdOCodes: [{ code: '85003', description: '', behaviorCode: null }] }))).toEqual(['ICDO_FORMAT']);
    const r = checkCosdSubmission(payload({ icd10Codes: ['50.9'] }), { submissionId: 's', messageType: 'NEW' }, NOW);
    expect(r.findings.map(f => [f.code, f.severity])).toEqual([['ICD10_FORMAT', 'warning']]);
    expect(r.ok).toBe(true);
  });
  it('findings carry fixed codes and a field id, never patient text', () => {
    const r = validateCosdPayload(payload({ patientIdentifier: { formatId: 'mrn_nhs', value: '123', verification: 'formatOnly', fromNationalIdentifier: true } }), NOW);
    expect(JSON.stringify(r)).not.toContain('123');
  });
});

describe('correction status through the delivery schedule deadline', () => {
  const rejected = new Date('2026-10-16T09:00:00Z');
  const due = addWorkingDays(rejected, 5);
  it('is on time early, near within three days, overdue after', () => {
    expect(correctionStatus(rejected, due, new Date('2026-10-16T10:00:00Z')).state).toBe('ok');
    expect(correctionStatus(rejected, due, new Date('2026-10-21T10:00:00Z')).state).toBe('near');
    expect(correctionStatus(rejected, due, new Date('2026-10-24T10:00:00Z')).state).toBe('overdue');
    expect(correctionStatus(rejected, due, NOW).dueAt).toBe(due.toISOString());
  });
});

describe('the sample and the honest list', () => {
  it('builds a payload from typed fields and reads the behaviour digit from the code', () => {
    const p = samplePayload({ nhsNumber: ' 9434765919 ', dateOfBirth: '1960-05-02', diagnosisDate: '2026-10-01', icdO: '8500/3', primaryDiagnosis: 'Carcinoma' }, NOW);
    expect(p.patientIdentifier?.value).toBe('9434765919');
    expect(p.icdOCodes[0].behaviorCode).toBe('3');
    expect(validateCosdPayload(p, NOW)).toEqual([]);
  });
  it('an empty sample has no identifier and no code', () => {
    const p = samplePayload({ nhsNumber: '', dateOfBirth: '', diagnosisDate: '', icdO: '', primaryDiagnosis: '' }, NOW);
    expect(p.patientIdentifier).toBeUndefined();
    expect(p.icdOCodes).toEqual([]);
  });
  it('lists what still needs the published specification', () => {
    expect(COSD_RULES_NEEDING_SPEC).toContain('mandatoryItemList');
    expect(COSD_MODEL_STATUS).toBe('simplified');
  });
});
