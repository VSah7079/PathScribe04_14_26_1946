// src/components/Config/System/billingReleaseForm.ts
// Batch 619 (PS-800): the billing release editor's draft of a rule and back. Pure, so it is tested without the screen.
import {
  ANY_CRITERIA, DEFAULT_ACTION, type BillingReleaseAction, type BillingReleaseCriteria, type BillingReleaseRule, type BillingReleaseRuleInput, type ReleaseMode,
} from '@/services/billingRelease/billingRelease';
import { IMMEDIATE_SCHEDULE, type DeliverySchedule } from '@/services/deliverySchedules/deliverySchedule';

export const defaultBatch = (): DeliverySchedule => ({
  ...IMMEDIATE_SCHEDULE, kind: 'batch', batchFrequency: 'weekly', batchDays: [1, 2, 3, 4, 5], batchTimes: ['22:00'], timeZone: 'America/New_York',
});

export interface RuleDraft { id?: string; facilityId: string | null; criteria: BillingReleaseCriteria; action: BillingReleaseAction; caseTypesText: string; timesText: string }

export function draftFromRule(rule: BillingReleaseRule | null, facilityId: string | null): RuleDraft {
  const criteria = rule ? { ...rule.criteria, caseTypes: [...rule.criteria.caseTypes] } : { ...ANY_CRITERIA };
  const action = rule ? { ...rule.action, batchSchedule: rule.action.batchSchedule ? { ...rule.action.batchSchedule, batchTimes: [...rule.action.batchSchedule.batchTimes], batchDays: [...rule.action.batchSchedule.batchDays] } : null } : { ...DEFAULT_ACTION };
  return { id: rule?.id, facilityId, criteria, action, caseTypesText: criteria.caseTypes.join(', '), timesText: (action.batchSchedule ?? defaultBatch()).batchTimes.join(', ') };
}

/** Switching the mode supplies the batch a batch rule needs and drops it when the rule holds instead. */
export function withMode(d: RuleDraft, mode: ReleaseMode): RuleDraft {
  const batchSchedule = mode === 'SCHEDULED_BATCH' ? d.action.batchSchedule ?? defaultBatch() : null;
  return { ...d, action: { ...d.action, releaseMode: mode, batchSchedule }, timesText: (batchSchedule ?? defaultBatch()).batchTimes.join(', ') };
}

export const parseList = (text: string): string[] => Array.from(new Set(text.split(/[\s,;]+/).filter(Boolean)));

/** The draft as the service takes it: the text boxes parsed, and a hold kept only for a rule that holds. */
export function toInput(d: RuleDraft): BillingReleaseRuleInput {
  const batch = d.action.releaseMode === 'SCHEDULED_BATCH' && d.action.batchSchedule ? { ...d.action.batchSchedule, batchTimes: parseList(d.timesText).sort() } : null;
  return {
    ...(d.id ? { id: d.id } : {}), facilityId: d.facilityId,
    criteria: { ...d.criteria, caseTypes: parseList(d.caseTypesText) },
    action: { ...d.action, batchSchedule: batch, holdDurationMinutes: d.action.releaseMode === 'DYNAMIC_WITH_HOLD' ? d.action.holdDurationMinutes : 0 },
  };
}
