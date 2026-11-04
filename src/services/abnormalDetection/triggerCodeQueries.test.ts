// src/services/abnormalDetection/triggerCodeQueries.test.ts
import { describe, it, expect } from 'vitest';
import { triggerCodeQueries } from './triggerCodeQueries';
import type { AbnormalTriggerRule } from './IAbnormalTriggerRuleService';
import type { ResolvedAnswer } from '@/orchestrator/contextBuilder';

const ans = (o: Partial<ResolvedAnswer> = {}): ResolvedAnswer =>
  ({ fieldId: 'f1', fieldLabel: 'Margin Status', fieldType: 'select', value: 'x', displayValue: 'Positive', ...o });
const rule = (o: Partial<AbnormalTriggerRule> = {}): AbnormalTriggerRule =>
  ({ id: 'r1', fieldLabel: 'Margin Status', triggerValues: ['Positive'], severity: 'Critical', status: 'Active', ...o });

describe('triggerCodeQueries (PS-138)', () => {
  it('offers one search per matched finding, built from the field and the matched value', () => {
    expect(triggerCodeQueries('sp1', [ans()], [rule()])).toEqual([
      { ruleId: 'r1', specimenId: 'sp1', fieldLabel: 'Margin Status', matchedValue: 'Positive', query: 'Margin Status Positive', severity: 'Critical' },
    ]);
  });
  it('offers nothing when no rule matches', () => {
    expect(triggerCodeQueries('sp1', [ans({ displayValue: 'Negative' })], [rule()])).toEqual([]);
  });
  it('offers nothing for an inactive rule', () => {
    expect(triggerCodeQueries('sp1', [ans()], [rule({ status: 'Inactive' } as Partial<AbnormalTriggerRule>)])).toEqual([]);
  });
  it('a multi-select that matches on two values gives two searches, and only for the matching values', () => {
    const r = rule({ triggerValues: ['Present', 'Focal'] });
    const out = triggerCodeQueries('sp1', [ans({ fieldLabel: 'Margin Status', displayValue: 'Present, Other, Focal' })], [r]);
    expect(out.map(o => o.matchedValue)).toEqual(['Present', 'Focal']);
  });
  it('does not repeat a search when the same rule value appears twice', () => {
    const out = triggerCodeQueries('sp1', [ans({ displayValue: 'Positive, positive' })], [rule()]);
    expect(out).toHaveLength(1);
  });
});
