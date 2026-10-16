// src/services/tumorBoardRules/tumorBoardRuleEvaluation.test.ts
import { describe, it, expect } from 'vitest';
import { resolveEffectiveTumorBoardRules, evaluateMarginRules, buildMarginTriggerReason } from './tumorBoardRuleEvaluation';
import { DEFAULT_TUMOR_BOARD_RULES } from './ITumorBoardRuleService';
import type { MarginShadowAttribute } from '../marginExtraction/IMarginExtractionService';
import type { FacilityTumorBoardRuleOverride } from './ITumorBoardRuleService';

const attr = (overrides: Partial<MarginShadowAttribute> = {}): MarginShadowAttribute => ({
  id: 'msa-1', caseId: 'c1', instanceId: 'i1', fieldId: 'distance_to_closest_margin_mm',
  fieldLabel: 'Distance to closest margin', valueMm: 0.6, approx: 'exact', rawText: '0.6 mm', extractedAt: '2026-10-08T00:00:00Z',
  ...overrides,
});

describe('resolveEffectiveTumorBoardRules', () => {
  it('uses the enterprise baseline when there is no override', () => {
    const resolved = resolveEffectiveTumorBoardRules(DEFAULT_TUMOR_BOARD_RULES, []);
    expect(resolved).toHaveLength(4);
    expect(resolved.every(r => r.source === 'enterprise')).toBe(true);
    expect(resolved.find(r => r.id === 'margin-breast-mdt')?.marginThresholdMm).toBe(1);
  });

  it('a facility override replaces only the fields it sets', () => {
    const overrides: FacilityTumorBoardRuleOverride[] = [
      { id: 'o1', facilityId: 'fac-1', ruleId: 'margin-breast-mdt', marginThresholdMm: 2, updatedAt: 'x' },
    ];
    const resolved = resolveEffectiveTumorBoardRules(DEFAULT_TUMOR_BOARD_RULES, overrides);
    const breast = resolved.find(r => r.id === 'margin-breast-mdt')!;
    expect(breast.marginThresholdMm).toBe(2);
    expect(breast.active).toBe(true); // unset by the override, falls back to enterprise
    expect(breast.source).toBe('facility');
    // Other boards are untouched.
    expect(resolved.find(r => r.id === 'margin-gi-mdt')?.source).toBe('enterprise');
  });

  it('an override with neither field set is treated as no override', () => {
    const overrides: FacilityTumorBoardRuleOverride[] = [{ id: 'o1', facilityId: 'fac-1', ruleId: 'margin-breast-mdt', updatedAt: 'x' }];
    const resolved = resolveEffectiveTumorBoardRules(DEFAULT_TUMOR_BOARD_RULES, overrides);
    expect(resolved.find(r => r.id === 'margin-breast-mdt')?.source).toBe('enterprise');
  });

  it('active: false on an override turns the rule off for that facility', () => {
    const overrides: FacilityTumorBoardRuleOverride[] = [{ id: 'o1', facilityId: 'fac-1', ruleId: 'margin-gi-mdt', active: false, updatedAt: 'x' }];
    const resolved = resolveEffectiveTumorBoardRules(DEFAULT_TUMOR_BOARD_RULES, overrides);
    expect(resolved.find(r => r.id === 'margin-gi-mdt')?.active).toBe(false);
  });
});

describe('evaluateMarginRules', () => {
  const rules = resolveEffectiveTumorBoardRules(DEFAULT_TUMOR_BOARD_RULES, []);

  it('matches an attribute under the threshold', () => {
    const matches = evaluateMarginRules([attr({ valueMm: 0.6 })], rules);
    expect(matches.length).toBe(4); // one per board — all four boards share the same 1mm baseline rule
    expect(matches[0].attribute.valueMm).toBe(0.6);
  });

  it('does not match an attribute at or above the threshold', () => {
    expect(evaluateMarginRules([attr({ valueMm: 1 })], rules)).toEqual([]);
    expect(evaluateMarginRules([attr({ valueMm: 1.5 })], rules)).toEqual([]);
  });

  it('an inactive rule never matches', () => {
    const inactive = rules.map(r => ({ ...r, active: false }));
    expect(evaluateMarginRules([attr({ valueMm: 0.1 })], inactive)).toEqual([]);
  });

  it('no attributes means no matches', () => {
    expect(evaluateMarginRules([], rules)).toEqual([]);
  });
});

describe('buildMarginTriggerReason', () => {
  const rule = resolveEffectiveTumorBoardRules(DEFAULT_TUMOR_BOARD_RULES, [])[0];

  it('renders the field, value and threshold', () => {
    expect(buildMarginTriggerReason(attr({ valueMm: 0.6, approx: 'exact' }), rule))
      .toBe('Margin: Distance to closest margin 0.6mm (threshold < 1mm)');
  });

  it('includes the approx prefix when the parser only bounded the value', () => {
    expect(buildMarginTriggerReason(attr({ valueMm: 1, approx: 'lessThan' }), rule))
      .toContain('< 1mm (threshold < 1mm)');
    expect(buildMarginTriggerReason(attr({ valueMm: 1, approx: 'greaterThan' }), rule))
      .toContain('> 1mm (threshold < 1mm)');
  });
});
