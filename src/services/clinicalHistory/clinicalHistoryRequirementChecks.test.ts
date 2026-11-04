import { describe, it, expect } from 'vitest';
import { missingClinicalHistory } from './clinicalHistoryRequirementChecks';
import { resolveFieldRequirements } from '../fieldRequirements/fieldRequirementRules';

const coded = { historyCode: 'SCR-01' };
const freeText = { historyCode: null };

describe('Clinical history requirements at Accession (PS-359)', () => {
  it('nothing is required by default', () => {
    expect(missingClinicalHistory(resolveFieldRequirements('clinicalHistory'), [], [[]], true)).toEqual([]);
  });
  it('only cytology and FNA cases are checked', () => {
    const r = resolveFieldRequirements('clinicalHistory', { caseEntry: true });
    expect(missingClinicalHistory(r, [], [[]], false)).toEqual([]);
    expect(missingClinicalHistory(r, [], [[]], true).map(f => f.id)).toEqual(['caseEntry']);
    expect(missingClinicalHistory(r, [coded], [[]], true)).toEqual([]);
  });
  it('per specimen: every specimen needs an entry; with one specimen a case entry counts', () => {
    const r = resolveFieldRequirements('clinicalHistory', { specimenEntry: true });
    expect(missingClinicalHistory(r, [], [[coded], []], true).map(f => f.id)).toEqual(['specimenEntry']);
    expect(missingClinicalHistory(r, [coded], [[coded], []], true).map(f => f.id)).toEqual(['specimenEntry']);
    expect(missingClinicalHistory(r, [coded], [[]], true)).toEqual([]);
    expect(missingClinicalHistory(r, [], [[coded], [coded]], true)).toEqual([]);
  });
  it('coded: no free-text entries anywhere', () => {
    const r = resolveFieldRequirements('clinicalHistory', { coded: true });
    expect(missingClinicalHistory(r, [coded], [[freeText]], true).map(f => f.id)).toEqual(['coded']);
    expect(missingClinicalHistory(r, [coded], [[coded]], true)).toEqual([]);
    expect(missingClinicalHistory(r, [], [[]], true)).toEqual([]);
  });
});
