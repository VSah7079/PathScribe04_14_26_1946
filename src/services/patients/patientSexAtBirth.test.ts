import { describe, it, expect } from 'vitest';
import { sexAtBirthLabelKey, nhsSexCode } from './patientSexAtBirth';
import { nhsNumberForBanner } from './patientNhsNumberStatus';

describe('sex at birth', () => {
  it('maps to words and NHS codes, blank stays blank', () => {
    expect(sexAtBirthLabelKey('F')).toBe('patientSex.female');
    expect(sexAtBirthLabelKey('I')).toBe('patientSex.indeterminate');
    expect(sexAtBirthLabelKey(undefined)).toBeNull();
    expect([nhsSexCode('M'), nhsSexCode('F'), nhsSexCode('I'), nhsSexCode('U'), nhsSexCode('')]).toEqual(['1', '2', '9', 'X', null]);
  });
});

describe('NHS number banner status', () => {
  const id = (value: string, statusCode?: string) => [{ system: 'mrn_nhs', value, verificationStatus: 'verified' as const, ...(statusCode ? { statusCode } : {}) }];
  it('is checkOnly for a valid check digit, verified only with status 01, invalid on a bad digit', () => {
    expect(nhsNumberForBanner(id('943 476 5919'))?.status).toBe('checkOnly');
    expect(nhsNumberForBanner(id('943 476 5919', '01'))?.status).toBe('verified');
    expect(nhsNumberForBanner(id('943 476 5918'))?.status).toBe('invalid');
    expect(nhsNumberForBanner([])).toBeNull();
  });
});

import { sexAtBirthEnglish } from './patientSexAtBirth';
import { CASE_SEARCH_SEX_OPTIONS } from '@/services/caseSearch/caseSearchTypes';
import { CASE_SEX_LABEL_KEY } from '@/utils/search/caseSearchLabels';

describe('report and search', () => {
  it('prints the English word on reports', () => {
    expect(sexAtBirthEnglish('I')).toBe('Indeterminate');
    expect(sexAtBirthEnglish(undefined)).toBeUndefined();
  });
  it('offers Indeterminate in search, with a label for every option', () => {
    expect(CASE_SEARCH_SEX_OPTIONS).toContain('I');
    for (const o of CASE_SEARCH_SEX_OPTIONS) expect(CASE_SEX_LABEL_KEY[o]).toBeTruthy();
  });
});
