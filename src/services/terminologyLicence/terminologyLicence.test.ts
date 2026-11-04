// Batch 623 (PS-130): the customer's SNOMED CT / ICD-O-3 licences and which codes a finding carries.
import { describe, expect, it } from 'vitest';
import {
  activeLicensedSystems, isWellFormedCode, licenceDraftsOf, licenceStatus, parseRuleCoding, ruleCodingDraftOf,
  validateLicenceDraft, validateLicences, EMPTY_LICENCE, EMPTY_RULE_CODING_DRAFT, todayIso,
} from './terminologyLicence';
import { resolveFindingCoding } from '../abnormalDetection/resolveFindingCoding';
import { evaluateAbnormalTriggerRules } from '../abnormalDetection/evaluateAbnormalTriggerRules';
import type { AbnormalTriggerRule } from '../abnormalDetection/IAbnormalTriggerRuleService';
import type { TerminologyLicence } from '@app-types/config/EnterpriseConfig';
import type { ResolvedAnswer } from '@/orchestrator/contextBuilder';

const lic = (over: Partial<TerminologyLicence> = {}): TerminologyLicence =>
  ({ enabled: true, holder: 'Hospital Clínico', edition: 'SNOMED CT Spanish Edition', reference: 'AGR-1', expiresOn: '', ...over });

describe('licence status', () => {
  it('is none when nothing is recorded, off when switched off', () => {
    expect(licenceStatus(undefined, '2026-10-19')).toBe('none');
    expect(licenceStatus(lic({ enabled: false }), '2026-10-19')).toBe('off');
  });
  it('is active with no expiry, and on the last valid day', () => {
    expect(licenceStatus(lic(), '2026-10-19')).toBe('active');
    expect(licenceStatus(lic({ expiresOn: '2026-10-19' }), '2026-10-19')).toBe('active');
  });
  it('expires the day after the last valid day', () => {
    expect(licenceStatus(lic({ expiresOn: '2026-10-18' }), '2026-10-19')).toBe('expired');
  });
  it('lists only the systems whose licence is active', () => {
    const l = { SNOMED_CT: lic(), ICD_O_3: lic({ expiresOn: '2020-01-01' }) };
    expect(activeLicensedSystems(l, '2026-10-19')).toEqual(['SNOMED_CT']);
    expect(activeLicensedSystems(undefined, '2026-10-19')).toEqual([]);
  });
  it('todayIso is the UTC date', () => {
    expect(todayIso(new Date('2026-10-19T23:59:59Z'))).toBe('2026-10-19');
  });
});

describe('validating a licence', () => {
  it('turning one on needs the holder, edition and reference', () => {
    const r = validateLicenceDraft(lic({ holder: ' ', edition: '', reference: '' }));
    expect(r).toEqual({ ok: false, errors: ['holderRequired', 'editionRequired', 'referenceRequired'] });
  });
  it('one that is off needs nothing, and an impossible date is refused', () => {
    expect(validateLicenceDraft({ ...EMPTY_LICENCE }).ok).toBe(true);
    expect(validateLicenceDraft(lic({ expiresOn: '2026-02-30' }))).toEqual({ ok: false, errors: ['expiryInvalid'] });
    expect(validateLicenceDraft(lic({ expiresOn: '19/10/2026' }))).toEqual({ ok: false, errors: ['expiryInvalid'] });
  });
  it('trims what it stores', () => {
    const r = validateLicenceDraft(lic({ holder: '  H  ' }));
    expect(r.ok && r.licence.holder).toBe('H');
  });
  it('stores only the systems that have something to store', () => {
    const drafts = licenceDraftsOf(undefined);
    drafts.SNOMED_CT = lic();
    const r = validateLicences(drafts);
    expect(r.ok && Object.keys(r.licences)).toEqual(['SNOMED_CT']);
  });
  it('reports the errors per system and stores nothing', () => {
    const drafts = licenceDraftsOf(undefined);
    drafts.ICD_O_3 = lic({ holder: '' });
    expect(validateLicences(drafts)).toEqual({ ok: false, errors: { ICD_O_3: ['holderRequired'] } });
  });
});

describe('code shapes', () => {
  it('SNOMED CT is 6 to 18 digits; ICD-O-3 is 4 digits, a slash and 1 digit', () => {
    expect(isWellFormedCode('SNOMED-CT', '254837009')).toBe(true);
    expect(isWellFormedCode('SNOMED-CT', '12345')).toBe(false);
    expect(isWellFormedCode('SNOMED-CT', 'TEST-SNOMED-000001')).toBe(false);
    expect(isWellFormedCode('ICD-O-3', '8500/3')).toBe(true);
    expect(isWellFormedCode('ICD-O-3', '8500-3')).toBe(false);
  });
  it('an empty pair is left out; a half-filled one is refused', () => {
    expect(parseRuleCoding(EMPTY_RULE_CODING_DRAFT)).toEqual({ ok: true, coding: [] });
    expect(parseRuleCoding({ ...EMPTY_RULE_CODING_DRAFT, snomedCode: '254837009' })).toEqual({ ok: false, errors: ['snomedDisplayRequired'] });
    expect(parseRuleCoding({ ...EMPTY_RULE_CODING_DRAFT, icdo3Display: 'Carcinoma' })).toEqual({ ok: false, errors: ['icdo3CodeInvalid'] });
  });
  it('both pairs become the rule\'s coding and round-trip to the form', () => {
    const r = parseRuleCoding({ snomedCode: ' 254837009 ', snomedDisplay: 'Neoplasia maligna', icdo3Code: '8500/3', icdo3Display: 'Carcinoma ductal' });
    expect(r.ok && r.coding.map(c => c.system)).toEqual(['SNOMED-CT', 'ICD-O-3']);
    expect(ruleCodingDraftOf(r.ok ? r.coding : undefined)).toEqual({ snomedCode: '254837009', snomedDisplay: 'Neoplasia maligna', icdo3Code: '8500/3', icdo3Display: 'Carcinoma ductal' });
  });
});

describe('which codes a finding carries', () => {
  const rule = {
    licensedCoding: [
      { system: 'SNOMED-CT' as const, code: '254837009', display: 'Neoplasia maligna de mama' },
      { system: 'ICD-O-3' as const, code: '8500/3', display: 'Carcinoma ductal' },
    ],
  };
  it('uses the test codes when no licence is on', () => {
    const codes = resolveFindingCoding(rule, 'Malignant', []);
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.every(c => c.code.startsWith('TEST-'))).toBe(true);
  });
  it('uses the real codes of each licence that is on, and never mixes in a test code for it', () => {
    expect(resolveFindingCoding(rule, 'Malignant', ['SNOMED_CT', 'ICD_O_3']).map(c => c.code)).toEqual(['254837009', '8500/3']);
    expect(resolveFindingCoding(rule, 'Malignant', ['SNOMED_CT']).map(c => c.code)).toEqual(['254837009']);
  });
  it('a rule without real codes keeps its test codes whatever the licences', () => {
    const codes = resolveFindingCoding({}, 'Critical', ['SNOMED_CT']);
    expect(codes.every(c => c.code.startsWith('TEST-'))).toBe(true);
  });
  it('a rule\'s own test codes still win over the severity default when no licence is on', () => {
    const own = [{ system: 'TEST-SNOMED' as const, code: 'TEST-SNOMED-000099', display: '[SYNTHETIC — TEST ONLY] x' }];
    expect(resolveFindingCoding({ syntheticCoding: own }, 'Critical', [])).toBe(own);
  });
});

describe('a match at sign-out', () => {
  const full: AbnormalTriggerRule = {
    id: 'r1', fieldLabel: 'Margin Status', triggerValues: ['Positive'], severity: 'Critical', status: 'Active',
    licensedCoding: [{ system: 'SNOMED-CT', code: '254837009', display: 'Neoplasia maligna' }],
  };
  const answers = [{ fieldId: 'f', fieldLabel: 'Margin Status', fieldType: 'select', value: 'o', displayValue: 'Positive' } as ResolvedAnswer];
  it('carries test codes until the licence is on, then the real code', () => {
    expect(evaluateAbnormalTriggerRules('sp1', answers, [full])[0].syntheticCoding[0].code).toMatch(/^TEST-/);
    expect(evaluateAbnormalTriggerRules('sp1', answers, [full], ['SNOMED_CT'])[0].syntheticCoding[0].code).toBe('254837009');
  });
});
