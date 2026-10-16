// src/services/delivery/deliveryPlan.test.ts
// Batch 520 (PS-280): delivery channels by role (primary / secondary / fallback), the fax
// recipient and the delivered document's name.
import { describe, expect, it } from 'vitest';
import {
  actionFromPlan, channelRole, deliveryDocumentName, deliveryPlanProblem, fallbackChannels, faxRecipient, immediateChannels,
  normalizeFaxNumber, planFromAction, planSummary, ruleDeliveryFields, rulePlan, withChannelRole,
} from './deliveryPlan';
import { resolveDeliveryAction } from './resolveDeliveryAction';
import type { DeliveryRule } from '@/types/delivery/DeliveryRule';

describe('plans and actions', () => {
  it('a rule saved before Batch 520 keeps its behaviour: its plan follows its action', () => {
    expect(planFromAction('ELECTRONIC_ONLY')).toEqual({ primary: ['ELECTRONIC'], secondary: [], fallback: [] });
    expect(planFromAction('PRINT_ONLY')).toEqual({ primary: ['PRINT'], secondary: [], fallback: [] });
    expect(planFromAction('DUAL')).toEqual({ primary: ['ELECTRONIC', 'PRINT'], secondary: [], fallback: [] });
    expect(planFromAction('SUPPRESS')).toEqual({ primary: [], secondary: [], fallback: [] });
    expect(rulePlan({ action: 'PRINT_ONLY' })).toEqual(planFromAction('PRINT_ONLY'));
    expect(rulePlan({ action: 'PRINT_ONLY', channels: { primary: ['FAX'], secondary: [], fallback: [] } }).primary).toEqual(['FAX']);
  });
  it('the action kept on the rule matches the plan\'s electronic and print sending', () => {
    expect(actionFromPlan({ primary: ['ELECTRONIC'], secondary: ['FAX'], fallback: ['PRINT'] })).toBe('ELECTRONIC_ONLY');
    expect(actionFromPlan({ primary: ['ELECTRONIC'], secondary: ['PRINT'], fallback: [] })).toBe('DUAL');
    expect(actionFromPlan({ primary: ['FAX'], secondary: [], fallback: [] })).toBe('SUPPRESS');
  });
  it('the spec\'s example: primary HL7, secondary auto-fax, fallback batch print', () => {
    let plan = planFromAction('ELECTRONIC_ONLY');
    plan = withChannelRole(plan, 'FAX', 'secondary');
    plan = withChannelRole(plan, 'PRINT', 'fallback');
    expect(plan).toEqual({ primary: ['ELECTRONIC'], secondary: ['FAX'], fallback: ['PRINT'] });
    expect(immediateChannels(plan)).toEqual(['ELECTRONIC', 'FAX']);
    expect([channelRole(plan, 'PRINT'), channelRole(plan, 'FILE_DROP')]).toEqual(['fallback', 'off']);
    expect(planSummary(plan)).toEqual([{ role: 'primary', channels: ['ELECTRONIC'] }, { role: 'secondary', channels: ['FAX'] }, { role: 'fallback', channels: ['PRINT'] }]);
    // A channel has one role: moving it removes it from the other.
    expect(withChannelRole(plan, 'FAX', 'primary')).toEqual({ primary: ['ELECTRONIC', 'FAX'], secondary: [], fallback: ['PRINT'] });
    expect(withChannelRole(plan, 'FAX', 'off').secondary).toEqual([]);
  });
});

describe('fallback at once (Batch 521: a failed channel waits for its retries)', () => {
  const plan = { primary: ['PRINT' as const, 'ELECTRONIC' as const], secondary: ['FILE_DROP' as const], fallback: ['FAX' as const] };
  it('goes at once only when a primary channel had nowhere to go', () => {
    expect(fallbackChannels(plan, { PRINT: 'not_configured', ELECTRONIC: 'queued' })).toEqual(['FAX']);
    expect(fallbackChannels(plan, { PRINT: 'failed', ELECTRONIC: 'queued' })).toEqual([]);
    expect(fallbackChannels(plan, { PRINT: 'sent', ELECTRONIC: 'queued' })).toEqual([]);
  });
  it('a secondary with nowhere to go does not trigger it; a fallback channel that already went is not sent twice', () => {
    expect(fallbackChannels(plan, { PRINT: 'sent', ELECTRONIC: 'queued', FILE_DROP: 'not_configured' })).toEqual([]);
    expect(fallbackChannels({ primary: ['PRINT'], secondary: [], fallback: ['FAX'] }, { PRINT: 'not_configured', FAX: 'sent' })).toEqual([]);
  });
});

describe('what a rule needs before it is saved', () => {
  it('a fallback needs a primary; a file drop needs a target; a fax number must be one', () => {
    expect(deliveryPlanProblem({ primary: [], secondary: ['ELECTRONIC'], fallback: ['PRINT'] }, {})).toBe('fallbackWithoutPrimary');
    expect(deliveryPlanProblem({ primary: ['FILE_DROP'], secondary: [], fallback: [] }, { fileDropTargetId: ' ' })).toBe('fileDropNeedsTarget');
    expect(deliveryPlanProblem({ primary: ['FAX'], secondary: [], fallback: [] }, { faxNumber: 'call me' })).toBe('faxNumberInvalid');
    expect(deliveryPlanProblem({ primary: ['FAX'], secondary: [], fallback: [] }, { faxNumber: '' })).toBeNull();
    expect(deliveryPlanProblem({ primary: ['ELECTRONIC'], secondary: [], fallback: [] }, { faxNumber: 'call me' })).toBeNull();
  });
  it('saving keeps the fax number and target only where their channel is used, and the action in step', () => {
    expect(ruleDeliveryFields({ primary: ['ELECTRONIC'], secondary: ['FAX'], fallback: [] }, ' +1 520 555 0100 ', 'client-a')).toEqual({
      channels: { primary: ['ELECTRONIC'], secondary: ['FAX'], fallback: [] }, action: 'ELECTRONIC_ONLY', faxNumber: '+1 520 555 0100', fileDropTargetId: undefined,
    });
  });
  it('the resolver hands back the winning rule\'s plan, fax number and target; the default is electronic', () => {
    const rule: DeliveryRule = { id: 'r', providerId: 'DR-1', action: 'ELECTRONIC_ONLY', channels: { primary: ['ELECTRONIC'], secondary: ['FILE_DROP'], fallback: [] }, fileDropTargetId: 'client-a', active: true, createdAt: '', updatedAt: '' };
    expect(resolveDeliveryAction({ providerId: 'DR-1' }, [rule])).toMatchObject({ matchedRuleId: 'r', plan: rule.channels, fileDropTargetId: 'client-a' });
    expect(resolveDeliveryAction({ providerId: 'DR-2' }, [rule])).toEqual({ action: 'ELECTRONIC_ONLY', plan: planFromAction('ELECTRONIC_ONLY') });
  });
});

describe('who a fax goes to, and the document name', () => {
  it('a fax number is 7–15 digits with an optional +, punctuation dropped', () => {
    expect(normalizeFaxNumber('+1 (520) 555-0100')).toBe('+15205550100');
    expect(normalizeFaxNumber('020 7946 0018')).toBe('02079460018');
    expect([normalizeFaxNumber('123'), normalizeFaxNumber('555-FAX-NOW'), normalizeFaxNumber(undefined)]).toEqual([null, null, null]);
  });
  it('the rule\'s number, else the ordering physician\'s, else the ordering facility\'s; none is null', () => {
    const doctor = { fax: '520-555-0101', firstName: 'Ana', lastName: 'Ruiz' };
    const clinic = { fax: '520-555-0199', name: 'Desert Clinic' };
    expect(faxRecipient('+1 520 555 0100', doctor, clinic)).toEqual({ number: '+15205550100', from: 'rule' });
    expect(faxRecipient(undefined, doctor, clinic)).toEqual({ number: '5205550101', name: 'Ana Ruiz', from: 'physician' });
    expect(faxRecipient(undefined, { fax: '' }, clinic)).toEqual({ number: '5205550199', name: 'Desert Clinic', from: 'facility' });
    expect(faxRecipient(undefined, { fax: 'n/a' }, { fax: '' })).toBeNull();
  });
  it('the document name: accession, report type and UTC release time, file-safe', () => {
    expect(deliveryDocumentName('S26-0001', 'FINAL', '2026-10-10T20:00:00.123Z')).toBe('S26-0001_FINAL_20261010T200000Z');
    expect(deliveryDocumentName('../S26/0001', 'CORRECTED', '2026-10-10T20:00:00Z')).toBe('S26_0001_CORRECTED_20261010T200000Z');
  });
});
