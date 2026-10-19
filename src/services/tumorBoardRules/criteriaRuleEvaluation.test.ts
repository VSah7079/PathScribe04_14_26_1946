// src/services/tumorBoardRules/criteriaRuleEvaluation.test.ts
// Batch 610 (#71): the pure matching of admin-added diagnosis / biomarker rules.
import { describe, it, expect } from 'vitest';
import {
  flattenAnswersForCriteria,
  containsWholeWord,
  diagnosisTextOf,
  matchesCriterion,
  resolveEffectiveCriteriaRules,
  evaluateCriteriaRules,
  buildCriteriaTriggerReason,
  type CriteriaAnswerValue,
} from './criteriaRuleEvaluation';
import type { TumorBoardCriteriaRule, FacilityTumorBoardRuleOverride } from './ITumorBoardRuleService';
import type { MarginShadowAttribute } from '../marginExtraction/IMarginExtractionService';

const FIELDS = [
  { id: 'dx', label: 'Final Diagnosis', type: 'text' },
  { id: 'er', label: 'ER Status', type: 'select' },
  { id: 'her2', label: 'HER2 Result', type: 'select' },
  { id: 'note', label: 'Comment', type: 'text' },
];

const values = (answers: Record<string, string | string[]>) => flattenAnswersForCriteria(FIELDS, answers);

const rule = (over: Partial<TumorBoardCriteriaRule> = {}): TumorBoardCriteriaRule => ({
  id: 'r1', label: 'Triple negative', board: 'Breast MDT', active: true, createdAt: 'x', updatedAt: 'x',
  criteria: [{ kind: 'diagnosis', text: 'ductal carcinoma' }, { kind: 'biomarker', marker: 'ER', result: 'Negative' }],
  ...over,
});

const margin = (valueMm: number): MarginShadowAttribute => ({
  id: 'm1', caseId: 'c', instanceId: 'i', fieldId: 'f', fieldLabel: 'Margin', valueMm, approx: 'exact', rawText: `${valueMm}`, extractedAt: 'x',
} as MarginShadowAttribute);

describe('flattenAnswersForCriteria', () => {
  it('pairs answers with their field label, drops empty answers and joins multi-select answers', () => {
    const v = flattenAnswersForCriteria(FIELDS, { dx: 'Invasive ductal carcinoma', er: '', her2: ['Negative', 'Equivocal'] });
    expect(v).toEqual([
      { fieldId: 'dx', fieldLabel: 'Final Diagnosis', text: 'Invasive ductal carcinoma' },
      { fieldId: 'her2', fieldLabel: 'HER2 Result', text: 'Negative; Equivocal' },
    ]);
  });
});

describe('containsWholeWord', () => {
  it('matches whole words in any case, and not parts of longer words', () => {
    expect(containsWholeWord('ER Status', 'er')).toBe(true);
    expect(containsWholeWord('Serial number', 'ER')).toBe(false);
    expect(containsWholeWord('Negative (0%)', 'negative')).toBe(true);
    expect(containsWholeWord('Not negative', 'positive')).toBe(false);
    expect(containsWholeWord('Ki-67 30 %', 'Ki-67')).toBe(true);
  });
  it('treats an empty needle as no match', () => {
    expect(containsWholeWord('anything', '  ')).toBe(false);
  });
  it('escapes characters that mean something in a pattern', () => {
    expect(containsWholeWord('HER2 (3+)', '3+')).toBe(true);
    expect(containsWholeWord('HER2 (3+)', '3.')).toBe(false); // "." is literal, not "any character"
  });
});

describe('diagnosisTextOf', () => {
  it('uses the fields labelled as a diagnosis when there are any', () => {
    expect(diagnosisTextOf(values({ dx: 'Invasive ductal carcinoma', note: 'ductal artefact' }))).toBe('Invasive ductal carcinoma');
  });
  it('falls back to every answer when no field is labelled as a diagnosis', () => {
    const v: CriteriaAnswerValue[] = [{ fieldId: 'a', fieldLabel: 'Specimen', text: 'Breast, lumpectomy' }];
    expect(diagnosisTextOf(v)).toBe('Breast, lumpectomy');
  });
});

describe('matchesCriterion', () => {
  const v = values({ dx: 'Invasive Ductal Carcinoma, grade 2', er: 'Negative', her2: 'Positive (3+)' });
  it('diagnosis: contains the text, any case', () => {
    expect(matchesCriterion({ kind: 'diagnosis', text: 'ductal carcinoma' }, v, [])).toBe(true);
    expect(matchesCriterion({ kind: 'diagnosis', text: 'lobular' }, v, [])).toBe(false);
  });
  it('biomarker: the marker is in the field label and the result is a whole word of the answer', () => {
    expect(matchesCriterion({ kind: 'biomarker', marker: 'ER', result: 'Negative' }, v, [])).toBe(true);
    expect(matchesCriterion({ kind: 'biomarker', marker: 'ER', result: 'Positive' }, v, [])).toBe(false);
    expect(matchesCriterion({ kind: 'biomarker', marker: 'HER2', result: 'Positive' }, v, [])).toBe(true);
    expect(matchesCriterion({ kind: 'biomarker', marker: 'PR', result: 'Negative' }, v, [])).toBe(false);
  });
  it('margin: any recorded distance below the limit', () => {
    expect(matchesCriterion({ kind: 'margin', belowMm: 1 }, v, [margin(0.5)])).toBe(true);
    expect(matchesCriterion({ kind: 'margin', belowMm: 1 }, v, [margin(2)])).toBe(false);
    expect(matchesCriterion({ kind: 'margin', belowMm: 1 }, v, [])).toBe(false);
  });
});

describe('evaluateCriteriaRules', () => {
  const v = values({ dx: 'Invasive ductal carcinoma', er: 'Negative' });
  const eff = (r: TumorBoardCriteriaRule) => resolveEffectiveCriteriaRules([r], [])[0];

  it('flags only when every criterion matches', () => {
    expect(evaluateCriteriaRules(v, [], [eff(rule())])).toHaveLength(1);
    expect(evaluateCriteriaRules(values({ dx: 'Invasive ductal carcinoma', er: 'Positive' }), [], [eff(rule())])).toHaveLength(0);
  });
  it('a margin criterion joins the others (Pete\'s "IDC, ER negative, margin < 1mm")', () => {
    const r = rule({ criteria: [...rule().criteria, { kind: 'margin', belowMm: 1 }] });
    expect(evaluateCriteriaRules(v, [margin(0.4)], [eff(r)])).toHaveLength(1);
    expect(evaluateCriteriaRules(v, [margin(3)], [eff(r)])).toHaveLength(0);
  });
  it('skips an inactive rule', () => {
    expect(evaluateCriteriaRules(v, [], [eff(rule({ active: false }))])).toHaveLength(0);
  });
  it('keeps the order of the rules', () => {
    const a = eff(rule({ id: 'a', board: 'GI MDT' }));
    const b = eff(rule({ id: 'b', board: 'Gyn-Onc' }));
    expect(evaluateCriteriaRules(v, [], [a, b]).map(m => m.board)).toEqual(['GI MDT', 'Gyn-Onc']);
  });
  it('the trigger reason names the rule and its criteria and carries no answer text', () => {
    const reason = buildCriteriaTriggerReason(rule());
    expect(reason).toBe('Rule "Triple negative": Diagnosis contains "ductal carcinoma", ER Negative');
    expect(reason).not.toContain('Invasive');
  });
});

describe('resolveEffectiveCriteriaRules (facility routing override)', () => {
  const override = (over: Partial<FacilityTumorBoardRuleOverride>): FacilityTumorBoardRuleOverride => ({
    id: 'o1', facilityId: 'f1', ruleId: 'r1', updatedAt: 'x', ...over,
  });
  it('routes to the facility\'s board and reports the facility as the source', () => {
    const [e] = resolveEffectiveCriteriaRules([rule()], [override({ board: 'Thoracic MDM' })]);
    expect(e.board).toBe('Thoracic MDM');
    expect(e.source).toBe('facility');
  });
  it('a facility may switch a rule off', () => {
    const [e] = resolveEffectiveCriteriaRules([rule()], [override({ active: false })]);
    expect(e.active).toBe(false);
    expect(e.board).toBe('Breast MDT');
  });
  it('an override for another rule changes nothing', () => {
    const [e] = resolveEffectiveCriteriaRules([rule()], [override({ ruleId: 'other', board: 'GI MDT' })]);
    expect(e.board).toBe('Breast MDT');
    expect(e.source).toBe('enterprise');
  });
});
