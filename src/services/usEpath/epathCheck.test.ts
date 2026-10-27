import { describe, it, expect } from 'vitest';
import { buildEpathOruR01, type EpathFacts } from '../hl7/epathBuilder';
import { checkEpathMessage } from './epathCheck';
import { exampleProfile } from './epathProfile';

// Batch 620 (part E, PS-800): a case's message checked against its state profile; fixed codes only.
const ctx = { sendingApplication: 'P', sendingFacility: 'L', receivingApplication: 'N', receivingFacility: 'AZ', processingId: 'T' as const };
const facts: EpathFacts = {
  patient: { mrn: 'M1', firstName: 'Ana', lastName: 'Lopez', dateOfBirth: '1960-03-02', sex: 'F', address: { street: '1 Main St' } },
  accessionNumber: 'S1', reportStatus: 'final', finalDiagnosis: 'Carcinoma', performingFacility: { id: 'f', name: 'Lab' },
  specimens: [{ id: 'sp1', icdO: [{ code: '8500/3' }], snomed: [{ code: '1' }] }],
};
const check = (f: EpathFacts, profile = exampleProfile('t')) => checkEpathMessage(buildEpathOruR01(f, { ctx, timezone: 'America/Phoenix', extensions: profile.extensions, now: '2026-10-19T19:00:00Z' }).message, profile, f);

describe('checkEpathMessage', () => {
  it('a complete case passes the example profile', () => expect(check(facts)).toEqual([]));
  it('names each empty required field, without the message text', () => {
    const codes = check({ ...facts, patient: { ...facts.patient, address: undefined, mrn: undefined } });
    expect(codes).toEqual(['field:PID-3', 'field:PID-11']);
  });
  it('a required extension is checked like a required field', () => {
    const p = { ...exampleProfile('t'), requiredFields: [], extensions: [{ field: 'OBR-16', mode: 'required' as const }] };
    expect(check(facts, p)).toEqual(['field:OBR-16']);
  });
  it('switched-on checks fail with their fixed codes', () => {
    const codes = check({ ...facts, reportStatus: 'preliminary', specimens: [{ id: '', icdO: [], snomed: [] }] });
    expect(codes).toEqual(expect.arrayContaining(['rule:icdOMorphologyRequired', 'rule:snomedRequired', 'rule:specimenIdentifierRequired', 'rule:finalReportOnly']));
  });
  it('the provider NPI check only runs when the profile asks for it', () => {
    expect(check(facts)).toEqual([]);
    expect(check(facts, { ...exampleProfile('t'), validationRules: ['providerNpiRequired'] })).toEqual(['rule:providerNpiRequired']);
  });
  it('a required field missing from a repeated segment fails', () => {
    const p = { ...exampleProfile('t'), requiredFields: ['OBX-15'] };
    expect(check(facts, p)).toEqual(['field:OBX-15']);
  });
  it('codes are plain strings with no patient text', () => {
    const codes = check({ ...facts, patient: { ...facts.patient, firstName: 'Ana', address: undefined } });
    expect(codes.join(' ')).not.toMatch(/Ana|Lopez|M1/);
  });
});
