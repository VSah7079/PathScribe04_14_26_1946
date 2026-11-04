// src/services/tumorBoardRules/criteriaRuleValidation.test.ts
// Batch 610 (#71): what a criteria rule must contain.
import { describe, it, expect } from 'vitest';
import { validateCriteriaRule, validateCriterion, normaliseCriteria } from './criteriaRuleValidation';

const good = {
  label: 'Triple negative', board: 'Breast MDT' as const,
  criteria: [{ kind: 'diagnosis' as const, text: 'ductal carcinoma' }, { kind: 'biomarker' as const, marker: 'ER', result: 'Negative' }],
};

describe('validateCriteriaRule', () => {
  it('accepts a complete rule', () => { expect(validateCriteriaRule(good, true)).toBeNull(); });
  it('needs a label of 1 to 80 characters', () => {
    expect(validateCriteriaRule({ ...good, label: '  ' }, true)).toBe('ruleLabelInvalid');
    expect(validateCriteriaRule({ ...good, label: 'x'.repeat(81) }, true)).toBe('ruleLabelInvalid');
  });
  it('needs one of the four boards', () => {
    expect(validateCriteriaRule({ ...good, board: 'Skin MDT' as never }, true)).toBe('boardInvalid');
  });
  it('needs 1 to 6 criteria, at least one a diagnosis or biomarker', () => {
    expect(validateCriteriaRule({ ...good, criteria: [] }, true)).toBe('criteriaCountInvalid');
    expect(validateCriteriaRule({ ...good, criteria: Array.from({ length: 7 }, () => good.criteria[0]) }, true)).toBe('criteriaCountInvalid');
    expect(validateCriteriaRule({ ...good, criteria: [{ kind: 'margin', belowMm: 1 }] }, true)).toBe('criteriaNeedDiagnosisOrBiomarker');
  });
  it('an update only checks the fields it carries', () => {
    expect(validateCriteriaRule({ active: false }, false)).toBeNull();
    expect(validateCriteriaRule({ label: '' }, false)).toBe('ruleLabelInvalid');
  });
});

describe('validateCriterion', () => {
  it('diagnosis text is 2 to 60 characters', () => {
    expect(validateCriterion({ kind: 'diagnosis', text: 'a' })).toBe('criterionTextInvalid');
    expect(validateCriterion({ kind: 'diagnosis', text: 'ab' })).toBeNull();
  });
  it('a biomarker needs both parts', () => {
    expect(validateCriterion({ kind: 'biomarker', marker: 'ER', result: ' ' })).toBe('criterionBiomarkerInvalid');
    expect(validateCriterion({ kind: 'biomarker', marker: '', result: 'Negative' })).toBe('criterionBiomarkerInvalid');
  });
  it('a margin limit is a number above 0 and at most 100', () => {
    expect(validateCriterion({ kind: 'margin', belowMm: 0 })).toBe('marginThresholdMmInvalid');
    expect(validateCriterion({ kind: 'margin', belowMm: Number.NaN })).toBe('marginThresholdMmInvalid');
    expect(validateCriterion({ kind: 'margin', belowMm: 101 })).toBe('marginThresholdMmInvalid');
    expect(validateCriterion({ kind: 'margin', belowMm: 2 })).toBeNull();
  });
});

describe('normaliseCriteria', () => {
  it('trims the text that is stored and matched', () => {
    expect(normaliseCriteria([{ kind: 'diagnosis', text: '  duct  ' }, { kind: 'biomarker', marker: ' ER ', result: ' Neg ' }]))
      .toEqual([{ kind: 'diagnosis', text: 'duct' }, { kind: 'biomarker', marker: 'ER', result: 'Neg' }]);
  });
});
