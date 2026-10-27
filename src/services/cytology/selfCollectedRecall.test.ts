// Batch 631: the Australia/NZ recall rules for a self-collected hrHPV result.
import { describe, it, expect } from 'vitest';
import { classifyHpvGenotype, isRecallJurisdiction, RECALL_TARGET_WEEKS, recallKindOfSpecimens, selfCollectedRecallFor, selfCollectedRecallOfSpecimens } from './selfCollectedRecall';
import { hpvGenotypeLabels, normalizeHpvGenotype } from './hpvGenotype';

const G = (over = {}) => ({ hpv16: false, hpv18Or45: false, otherHighRisk: false, ...over });

describe('which genotype makes the recall urgent', () => {
  it('HPV 16, or HPV 18 reported on its own, is 16/18', () => {
    expect(classifyHpvGenotype(G({ hpv16: true }))).toBe('hpv16_18');
    expect(classifyHpvGenotype(G({ hpv18Or45: true, hpv18: true, hpv45: false }))).toBe('hpv16_18');
  });
  it('HPV 45 alone, or another high-risk type, is "other"', () => {
    expect(classifyHpvGenotype(G({ hpv18Or45: true, hpv18: false, hpv45: true }))).toBe('other_oncogenic');
    expect(classifyHpvGenotype(G({ otherHighRisk: true }))).toBe('other_oncogenic');
  });
  it('the 18/45 group alone, no genotype, or nothing set is NOT reported: never read as the reassuring answer', () => {
    expect(classifyHpvGenotype(G({ hpv18Or45: true }))).toBe('genotype_not_reported');
    expect(classifyHpvGenotype(undefined)).toBe('genotype_not_reported');
    expect(classifyHpvGenotype(G())).toBe('genotype_not_reported');
  });
});

describe('the recall for each result', () => {
  it('16/18: urgent, colposcopy referral plus clinician LBC, 2–4 weeks, in each country', () => {
    expect(selfCollectedRecallFor('AU', 'Positive', G({ hpv16: true }))).toMatchObject({ priority: 'urgent', kind: 'clinician_lbc', colposcopy: true, codes: ['AU_REFER_COLPOSCOPY', 'AU_RECALL_CLINICIAN_LBC'], targetWeeks: { min: 2, max: 4 } });
    expect(selfCollectedRecallFor('NZ', 'Positive', G({ hpv16: true }))?.codes).toEqual(['NZ_REFER_COLPOSCOPY', 'NZ_RECALL_CLINICIAN_LBC']);
  });
  it('another oncogenic type: routine, clinician LBC, 6–12 weeks', () => {
    expect(selfCollectedRecallFor('AU', 'Positive', G({ otherHighRisk: true }))).toMatchObject({ priority: 'routine', colposcopy: false, codes: ['AU_RECALL_CLINICIAN_LBC'], targetWeeks: { min: 6, max: 12 } });
    expect(selfCollectedRecallFor('NZ', 'Positive', G({ otherHighRisk: true }))?.codes).toEqual(['NZ_RECALL_CLINICIAN_LBC']);
  });
  it('genotype not reported: the urgent window but no colposcopy claim', () => {
    expect(selfCollectedRecallFor('AU', 'Positive', undefined)).toMatchObject({ priority: 'urgent', basis: 'genotype_not_reported', colposcopy: false, codes: ['AU_RECALL_CLINICIAN_LBC'] });
  });
  it('Invalid: repeat collection, never cytology', () => {
    expect(selfCollectedRecallFor('AU', 'Invalid', undefined)).toMatchObject({ kind: 'repeat_collection', codes: ['AU_RECALL_REPEAT_COLLECTION'], colposcopy: false, targetWeeks: { min: 6, max: 12 } });
    expect(selfCollectedRecallFor('NZ', 'Invalid', undefined)?.codes).toEqual(['NZ_RECALL_REPEAT_COLLECTION']);
    expect(selfCollectedRecallFor('NZ', 'Invalid', undefined)?.targetWeeks).toBeNull();
  });
  it('Negative and Pending have no recall', () => {
    expect(selfCollectedRecallFor('AU', 'Negative', undefined)).toBeNull();
    expect(selfCollectedRecallFor('AU', undefined, undefined)).toBeNull();
  });
  it('the windows are the documented placeholders', () => {
    expect(RECALL_TARGET_WEEKS).toEqual({ urgent: { min: 2, max: 4 }, routine: { min: 6, max: 12 } });
  });
});

describe('which jurisdictions have this recall', () => {
  it('only Australia and New Zealand; elsewhere a row has none', () => {
    expect(isRecallJurisdiction('AU')).toBe(true);
    expect(isRecallJurisdiction('NZ')).toBe(true);
    for (const j of ['US', 'CA', 'GB_EW', 'IE', 'KR', 'DE', 'ES', undefined]) expect(isRecallJurisdiction(j)).toBe(false);
    expect(selfCollectedRecallOfSpecimens([{ cytologyScreening: { hpvResult: 'Positive' } }], 'US')).toBeNull();
    expect(selfCollectedRecallOfSpecimens([{ cytologyScreening: { hpvResult: 'Positive', hpvGenotypeDetail: G({ hpv16: true }) } }], 'NZ')?.priority).toBe('urgent');
  });
  it('a row is for a clinician sample when any specimen is Positive, and for a repeat collection only when Invalid', () => {
    expect(recallKindOfSpecimens([{ cytologyScreening: { hpvResult: 'Invalid' } }])).toBe('repeat_collection');
    expect(recallKindOfSpecimens([{ cytologyScreening: { hpvResult: 'Invalid' } }, { cytologyScreening: { hpvResult: 'Positive' } }])).toBe('clinician_lbc');
  });
});

describe('genotype helpers', () => {
  it('the 18/45 group is kept consistent when 18 or 45 is reported separately', () => {
    expect(normalizeHpvGenotype(G({ hpv18: true }))?.hpv18Or45).toBe(true);
    expect(normalizeHpvGenotype(G({ hpv45: true }))?.hpv18Or45).toBe(true);
    expect(normalizeHpvGenotype(G())).toEqual(G());
    expect(normalizeHpvGenotype(undefined)).toBeUndefined();
  });
  it('register labels are 16, 18 and other; the group alone gives none', () => {
    expect(hpvGenotypeLabels(G({ hpv16: true, hpv18: true, hpv45: true }))).toEqual(['HPV_16', 'HPV_18', 'HPV_OTHER']);
    expect(hpvGenotypeLabels(G({ hpv18Or45: true }))).toEqual([]);
    expect(hpvGenotypeLabels(undefined)).toEqual([]);
  });
});
