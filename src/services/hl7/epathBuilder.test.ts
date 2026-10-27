import { describe, it, expect } from 'vitest';
import { applyExtensions, buildEpathOruR01, escapeHl7, EPATH_DEFAULTS, type EpathFacts } from './epathBuilder';
import { parseHL7Message, getField } from './hl7Parser';

// Batch 620 (part E, PS-800): the base US ePath message (HL7 v2.5.1 ORU^R01).
const ctx = { sendingApplication: 'PATHSCRIBE', sendingFacility: 'LABA', receivingApplication: 'NPCR_EPATH', receivingFacility: 'AZ', processingId: 'T' as const };
const facts: EpathFacts = {
  patient: { mrn: 'M123', firstName: 'Ana', lastName: 'Lopez', dateOfBirth: '1960-03-02', sex: 'F', address: { street: '1 Main St', city: 'Tucson', state: 'AZ', zip: '85701' } },
  accessionNumber: 'S26-1001', reportStatus: 'final', signedOutAt: '2026-10-19T18:00:00Z', finalDiagnosis: 'Invasive ductal carcinoma, grade 2',
  orderingProvider: { npi: '1234567890', lastName: 'Reyes', firstName: 'Sam' },
  performingFacility: { id: 'fac-a', name: 'Westside Lab', clia: '03D0000000', address: { street: '9 Lab Rd', city: 'Tucson', state: 'AZ', zip: '85702' } },
  specimens: [
    { id: 'sp-1', type: 'TISS', site: 'Breast, left', collectedAt: '2026-10-15T15:00:00Z', icdO: [{ code: '8500/3', description: 'Infiltrating duct carcinoma' }], snomed: [{ code: '254837009', description: 'Malignant neoplasm of breast' }] },
    { id: 'sp-2', icdO: [], snomed: [] },
  ],
};
const build = (f: EpathFacts = facts, extensions: Parameters<typeof buildEpathOruR01>[1]['extensions'] = []) =>
  buildEpathOruR01(f, { ctx, timezone: 'America/Phoenix', extensions, now: '2026-10-19T19:00:00Z' });
const parsed = (m: string) => parseHL7Message(m);

describe('buildEpathOruR01', () => {
  it('is an HL7 v2.5.1 ORU^R01 with the NPCR ePath segments in order', () => {
    const { message } = build();
    const ids = message.split('\r').map(s => s.slice(0, 3));
    expect(ids).toEqual(['MSH', 'PID', 'PV1', 'OBR', 'SPM', 'SPM', 'OBX', 'OBX', 'OBX']);
    const msh = message.split('\r')[0].split('|');
    expect(msh[8]).toBe('ORU^R01^ORU_R01');
    expect(msh[11]).toBe('2.5.1');
    expect(msh[10]).toBe('T');
  });
  it('carries the patient, accession, report status and ordering provider', () => {
    const m = parsed(build().message);
    expect(getField(m.getSegment('PID'), 5)).toBe('Lopez^Ana');
    expect(getField(m.getSegment('PID'), 7)).toBe('19600302');
    expect(getField(m.getSegment('PID'), 11)).toContain('Tucson');
    const obr = m.getSegment('OBR');
    expect(getField(obr, 3)).toBe('S26-1001');
    expect(getField(obr, 4)).toBe(EPATH_DEFAULTS.serviceId);
    expect(getField(obr, 25)).toBe('F');
    expect(getField(obr, 16)).toContain('1234567890');
  });
  it('writes the final diagnosis and each specimen\'s ICD-O-3 and SNOMED codes, linked to the specimen', () => {
    const obx = parsed(build().message).getAllSegments('OBX');
    expect(obx.map(o => getField(o, 2))).toEqual(['TX', 'CWE', 'CWE']);
    expect(getField(obx[0], 5)).toBe('Invasive ductal carcinoma, grade 2');
    expect(getField(obx[1], 5)).toBe('8500/3^Infiltrating duct carcinoma^ICDO3');
    expect(getField(obx[2], 5)).toBe('254837009^Malignant neoplasm of breast^SCT');
    expect(getField(obx[1], 4)).toBe('1');
    expect(obx.every(o => getField(o, 11) === 'F')).toBe(true);
  });
  it('names the performing laboratory on every result', () => {
    const obx = parsed(build().message).getAllSegments('OBX');
    expect(getField(obx[0], 15)).toBe('03D0000000^Westside Lab^CLIA');
    expect(getField(obx[0], 23)).toBe('Westside Lab');
    expect(getField(obx[0], 24)).toContain('9 Lab Rd');
  });
  it('an amended report is status C on the order and every result', () => {
    const m = parsed(build({ ...facts, reportStatus: 'corrected' }).message);
    expect(getField(m.getSegment('OBR'), 25)).toBe('C');
    expect(m.getAllSegments('OBX').every(o => getField(o, 11) === 'C')).toBe(true);
  });
  it('uses the facility time zone offset and is the same message for the same case', () => {
    const a = build(); const b = build();
    expect(a.message).toBe(b.message);
    expect(a.message.split('\r')[0]).toContain('-0700');
    expect(a.messageControlId).toBe('EPATH-S26-1001-F');
  });
  it('leaves a field empty when the case does not carry it', () => {
    const m = parsed(build({ ...facts, patient: { ...facts.patient, address: undefined } }).message);
    expect(getField(m.getSegment('PID'), 11)).toBe('');
  });
  it('escapes HL7 separators in free text', () => {
    expect(escapeHl7('a|b^c~d\\e&f\ng')).toBe('a\\F\\b\\S\\c\\R\\d\\E\\e\\T\\f g');
    const m = parsed(build({ ...facts, finalDiagnosis: 'Grade 2 | pT1c' }).message);
    expect(getField(m.getAllSegments('OBX')[0], 5)).toBe('Grade 2 \\F\\ pT1c');
  });
});

describe('profile extensions', () => {
  it('a fixed extension puts the state\'s own value in the named field of every segment of that type', () => {
    const m = parsed(build(facts, [{ field: 'OBR-4', mode: 'fixed', value: 'AZ01^State code^L' }, { field: 'OBX-3', mode: 'fixed', value: 'X^Y^L' }]).message);
    expect(getField(m.getSegment('OBR'), 4)).toBe('AZ01^State code^L');
    expect(m.getAllSegments('OBX').every(o => getField(o, 3) === 'X^Y^L')).toBe(true);
  });
  it('a required extension and an MSH extension change nothing here', () => {
    const plain = build().message;
    expect(build(facts, [{ field: 'PID-11', mode: 'required' }, { field: 'MSH-5', mode: 'fixed', value: 'X' }]).message).toBe(plain);
  });
  it('applyExtensions pads a short segment', () => {
    const segs = [{ id: 'OBR', fields: ['OBR', '1'] }];
    applyExtensions(segs, [{ field: 'OBR-4', mode: 'fixed', value: 'V' }]);
    expect(segs[0].fields).toEqual(['OBR', '1', '', '', 'V']);
  });
});
