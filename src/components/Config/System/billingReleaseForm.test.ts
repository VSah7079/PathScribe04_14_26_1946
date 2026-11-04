import { describe, it, expect } from 'vitest';
import { DEFAULT_ACTION, ANY_CRITERIA, validateRule, type BillingReleaseRule } from '@/services/billingRelease/billingRelease';
import { draftFromRule, parseList, toInput, withMode } from './billingReleaseForm';

// Batch 619 (PS-800): the billing release editor's draft and back.
const rule: BillingReleaseRule = { id: 'r1', facilityId: 'fac-a', criteria: { ...ANY_CRITERIA, billingType: '26', caseTypes: ['surgical'] }, action: { ...DEFAULT_ACTION, holdDurationMinutes: 30 }, updatedAt: '' };

describe('billing release form', () => {
  it('a new draft starts from the defaults for the scope; an existing one is a copy', () => {
    const fresh = draftFromRule(null, 'fac-a');
    expect(fresh).toMatchObject({ facilityId: 'fac-a', action: DEFAULT_ACTION });
    const copy = draftFromRule(rule, 'fac-a');
    copy.criteria.caseTypes.push('x');
    expect(rule.criteria.caseTypes).toEqual(['surgical']);
    expect(copy.caseTypesText).toBe('surgical');
  });
  it('switching to batch supplies a valid batch and back drops it and the hold', () => {
    const batch = withMode(draftFromRule(rule, null), 'SCHEDULED_BATCH');
    expect(batch.action.batchSchedule?.kind).toBe('batch');
    expect(validateRule(toInput(batch))).toEqual([]);
    const back = toInput(withMode(batch, 'DYNAMIC_WITH_HOLD'));
    expect(back.action.batchSchedule).toBeNull();
    expect(toInput(batch).action.holdDurationMinutes).toBe(0);
  });
  it('parses the text boxes', () => {
    expect(parseList('a, b;c  a')).toEqual(['a', 'b', 'c']);
    const d = { ...draftFromRule(null, null), caseTypesText: 'cytology, surgical' };
    expect(toInput(d).criteria.caseTypes).toEqual(['cytology', 'surgical']);
    const b = withMode(draftFromRule(null, null), 'SCHEDULED_BATCH');
    expect(toInput({ ...b, timesText: '22:00, 06:00' }).action.batchSchedule?.batchTimes).toEqual(['06:00', '22:00']);
  });
});
