// Batch 414 (Pete: support every country, or a flexible engine).
import { describe, it, expect } from 'vitest';
import { SCREENING_REGISTRY_DEFINITIONS, screeningRegistriesFor, screeningRegistryDefinition } from './screeningRegistryDefinitions';
import { buildScreeningRegistryPayload, decideRegistrySubmission, patientIdentifierMatches, registryConfigReadiness, registryHoldMessage, registryMappingRows, resolveRegistryPatientIdentifier, withRegistryMapping } from './screeningRegistryEngine';
import { defaultScreeningRegistryConfig } from './mockScreeningRegistryConfigService';
import { IDENTIFIER_FORMAT_LIBRARY, type Jurisdiction } from '@/types/systemConfig';

const review = { adequacySelections: [{ categoryId: 'sat' }], primaryInterpretationId: 'nilm', additionalInterpretations: [], recommendations: [{ categoryId: 'rep' }] };
const categories = [
  { id: 'sat', label: 'Satisfactory', section: 'adequacy', nomenclatureSystem: 'bsccRcpath' },
  { id: 'nilm', label: 'Negative', section: 'interpretation_result', usage: 'primary', nomenclatureSystem: 'bscc_rcpath' },
  { id: 'rep', label: 'Routine recall', section: 'recommendation' },
];

describe('the registry catalog', () => {
  it('covers every jurisdiction PathScribe supports except the US, which has no national cervical registry', () => {
    const all: Jurisdiction[] = ['CA', 'GB_EW', 'GB_SCT', 'GB_NIR', 'IE', 'AU', 'NZ', 'KR', 'BE', 'NL', 'DE', 'FR'];
    for (const j of all) expect(SCREENING_REGISTRY_DEFINITIONS.some(d => d.jurisdictions.includes(j)), j).toBe(true);
    expect(SCREENING_REGISTRY_DEFINITIONS.some(d => d.jurisdictions.includes('US'))).toBe(false);
  });
  it('every identifier it names exists in the identifier format library, and every registry is a GYN-only cervical programme', () => {
    for (const d of SCREENING_REGISTRY_DEFINITIONS) {
      if (d.patientIdentifierFormatId) expect(IDENTIFIER_FORMAT_LIBRARY.some(f => f.id === d.patientIdentifierFormatId), d.id).toBe(true);
      expect(d.eligibility.gynOnly).toBe(true);
      if (d.resultCoding === 'builtIn') expect(d.builtIn, d.id).toBeTruthy();
    }
  });
  it('a jurisdiction\'s own registries come first', () => {
    expect(screeningRegistriesFor('GB_SCT')[0].id).toBe('sccrs_scotland');
    expect(screeningRegistriesFor(undefined)).toHaveLength(SCREENING_REGISTRY_DEFINITIONS.length);
  });
});

describe('decideRegistrySubmission', () => {
  const sccrs = screeningRegistryDefinition('sccrs_scotland')!;
  it('a Non-GYN specimen is not eligible', () => {
    expect(decideRegistrySubmission(sccrs, defaultScreeningRegistryConfig('sccrs_scotland'), { isGynCytology: false, review }).eligible).toBe(false);
  });
  it('a mapping-table registry holds until the categories used have codes (the default for a lab-configured registry)', () => {
    const d = decideRegistrySubmission(sccrs, defaultScreeningRegistryConfig('sccrs_scotland'), { isGynCytology: true, review });
    expect(d).toMatchObject({ eligible: true, holdReasons: ['unmappedCodes'] });
    expect(d.unmapped).toEqual([{ field: 'adequacy', categoryId: 'sat' }, { field: 'primaryInterpretation', categoryId: 'nilm' }, { field: 'recommendation', categoryId: 'rep' }]);
    expect(registryHoldMessage(d, sccrs)).toContain('no registry code is mapped for adequacy sat');
  });
  it('mapped: sent with the codes', () => {
    const config = { ...defaultScreeningRegistryConfig('sccrs_scotland'), codeMappings: [
      { field: 'adequacy' as const, categoryId: 'sat', code: 'A1' }, { field: 'primaryInterpretation' as const, categoryId: 'nilm', code: 'N0' }, { field: 'recommendation' as const, categoryId: 'rep', code: 'R3' },
    ] };
    const d = decideRegistrySubmission(sccrs, config, { isGynCytology: true, review });
    expect(d.holdReasons).toEqual([]);
    expect(d.mappedCodes.map(m => m.code)).toEqual(['A1', 'N0', 'R3']);
  });
  it('a text registry (CervicalCheck, Korea) sends without codes, as before', () => {
    const cc = screeningRegistryDefinition('cervicalcheck_ireland')!;
    expect(decideRegistrySubmission(cc, defaultScreeningRegistryConfig('cervicalcheck_ireland'), { isGynCytology: true, review }).holdReasons).toEqual([]);
  });
  it('the national identifier is checked only when the lab turns it on', () => {
    const csms = screeningRegistryDefinition('csms_uk')!;
    const off = defaultScreeningRegistryConfig('csms_uk');
    expect(decideRegistrySubmission(csms, off, { isGynCytology: true, patientMrn: 'MRN1', review }).holdReasons).toEqual([]);
    expect(decideRegistrySubmission(csms, { ...off, requirePatientIdentifier: true }, { isGynCytology: true, patientMrn: 'MRN1', review }).holdReasons).toEqual(['patientIdentifierFormat']);
    expect(patientIdentifierMatches(csms, '943 476 5919')).toBe(true);
  });
  it('Batch 417: a verified national identifier is used first; a failed or missing one holds with its own reason', () => {
    const csms = screeningRegistryDefinition('csms_uk')!;
    const on = { ...defaultScreeningRegistryConfig('csms_uk'), requirePatientIdentifier: true };
    const verified = { mrn: 'MRN1', nationalIdentifiers: [{ system: 'mrn_nhs', value: '9434765919', verificationStatus: 'verified' as const }] };
    expect(decideRegistrySubmission(csms, on, { isGynCytology: true, patient: verified, review }).holdReasons).toEqual([]);
    const failed = { mrn: 'MRN1', nationalIdentifiers: [{ system: 'mrn_nhs', value: '9434765918', verificationStatus: 'failedChecksum' as const }] };
    expect(decideRegistrySubmission(csms, on, { isGynCytology: true, patient: failed, review }).holdReasons).toEqual(['patientIdentifierChecksum']);
    expect(decideRegistrySubmission(csms, on, { isGynCytology: true, patient: { nationalIdentifiers: [] }, review }).holdReasons).toEqual(['patientIdentifierMissing']);
    // A record from before Batch 417: only the MRN, format-checked as before.
    expect(resolveRegistryPatientIdentifier(csms, { mrn: '9434765919' })).toEqual({ formatId: 'mrn_nhs', value: '9434765919', status: 'formatOnly', fromNationalIdentifier: false });
    // Another system's identifier is not the registry's.
    expect(resolveRegistryPatientIdentifier(csms, { nationalIdentifiers: [{ system: 'mrn_chi', value: '1401740057', verificationStatus: 'verified' }] })?.status).toBe('missing');
    const msg = registryHoldMessage(decideRegistrySubmission(csms, on, { isGynCytology: true, patient: failed, review }), csms);
    expect(msg).toContain("failed its check digit");
  });
});

describe('the settings screen\'s view', () => {
  const sccrs = screeningRegistryDefinition('sccrs_scotland')!;
  it('one row per category and coded field, with the nomenclature\'s label key', () => {
    const rows = registryMappingRows(sccrs, defaultScreeningRegistryConfig('sccrs_scotland'), categories);
    expect(rows.map(r => [r.field, r.categoryId])).toEqual([['adequacy', 'sat'], ['primaryInterpretation', 'nilm'], ['recommendation', 'rep']]);
    expect(rows[1].nomenclatureLabelId).toBe('bsccRcpath');
  });
  it('editing a row, and readiness', () => {
    let config = defaultScreeningRegistryConfig('sccrs_scotland');
    expect(registryConfigReadiness(sccrs, config, categories)).toMatchObject({ needed: 3, ready: false });
    for (const r of registryMappingRows(sccrs, config, categories)) config = withRegistryMapping(config, r, 'X', '');
    expect(registryConfigReadiness(sccrs, config, categories)).toMatchObject({ missing: [], ready: true });
  });
  it('a built-in registry needs no mapping', () => {
    const csms = screeningRegistryDefinition('csms_uk')!;
    expect(registryConfigReadiness(csms, defaultScreeningRegistryConfig('csms_uk'), categories).ready).toBe(true);
  });
});

describe('buildScreeningRegistryPayload', () => {
  it('carries the programme, wire format, identifier and mapped codes, plus the built-in coding', () => {
    const csms = screeningRegistryDefinition('csms_uk')!;
    const record = { id: 'so-1', reportContent: { patientName: 'A B', patientMrn: '9434765919', accessionNumber: 'S1', specimenAdequacy: [], primaryInterpretation: 'NILM', additionalInterpretations: [], recommendations: [], requiresPathologistReview: false } } as never;
    const decision = decideRegistrySubmission(csms, defaultScreeningRegistryConfig('csms_uk'), { isGynCytology: true, review });
    const p = buildScreeningRegistryPayload(csms, decision, record, { facilityId: 'F1', primaryInterpretationId: 'nilm', isUnsatisfactory: false });
    expect(p).toMatchObject({ registryId: 'csms_uk', programme: 'cervical', wireFormat: 'hl7v2_oru', patientIdentifier: { formatId: 'mrn_nhs', matchesFormat: true, verification: 'formatOnly', fromNationalIdentifier: false }, registryExtension: { type: 'csms_uk' } });
    // Batch 417: with the case's patient, the verified national identifier is the one sent.
    const p2 = buildScreeningRegistryPayload(csms, decision, record, { facilityId: 'F1', primaryInterpretationId: 'nilm', isUnsatisfactory: false,
      patient: { mrn: '100001', nationalIdentifiers: [{ system: 'mrn_nhs', value: '9434765919', verificationStatus: 'verified' }] } });
    expect(p2.patientIdentifier).toEqual({ formatId: 'mrn_nhs', value: '9434765919', matchesFormat: true, verification: 'verified', fromNationalIdentifier: true });
  });
});
