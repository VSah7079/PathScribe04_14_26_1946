// Batch 619 (PS-800): billing release rules: validation, matching and precedence, the decision, cron view, amendment plan.
import { describe, it, expect } from 'vitest';
import {
  ANY_CRITERIA, DEFAULT_ACTION, batchToCron, decideRelease, planAmendment, releaseStatusFor, resolveReleaseRule, seedRules, toReleaseSchedule, validateRule,
  type BillingChargeFacts, type BillingReleaseAction, type BillingReleaseRule,
} from './billingRelease';
import { IMMEDIATE_SCHEDULE } from '../deliverySchedules/deliverySchedule';

const facts = (o: Partial<BillingChargeFacts> = {}): BillingChargeFacts => ({
  billingType: '26', amended: false, amendmentDelta: false, cptMapped: true, technicalFacilityMissing: false,
  generatedAt: '2026-10-19T08:00:00.000Z', signedOutAt: '2026-10-19T09:00:00.000Z', ...o,
});
const rule = (id: string, facilityId: string | null, criteria: Partial<typeof ANY_CRITERIA>, action: Partial<BillingReleaseAction> = {}): BillingReleaseRule =>
  ({ id, facilityId, criteria: { ...ANY_CRITERIA, ...criteria }, action: { ...DEFAULT_ACTION, ...action }, updatedAt: '' });
const batch = { ...IMMEDIATE_SCHEDULE, kind: 'batch' as const, batchFrequency: 'weekly' as const, batchDays: [1, 2, 3, 4, 5], batchTimes: ['22:00'], timeZone: 'UTC' };
const at = (s: string) => new Date(s);

describe('validateRule', () => {
  const ok = { facilityId: null, criteria: ANY_CRITERIA, action: DEFAULT_ACTION };
  it('accepts the defaults and refuses bad holds, modes and batches', () => {
    expect(validateRule(ok)).toEqual([]);
    expect(validateRule({ ...ok, action: { ...DEFAULT_ACTION, holdDurationMinutes: -1 } })).toContain('holdInvalid');
    expect(validateRule({ ...ok, action: { ...DEFAULT_ACTION, holdDurationMinutes: 1.5 } })).toContain('holdInvalid');
    expect(validateRule({ ...ok, action: { ...DEFAULT_ACTION, releaseMode: 'SCHEDULED_BATCH' } })).toContain('batchRequired');
    expect(validateRule({ ...ok, action: { ...DEFAULT_ACTION, releaseMode: 'SCHEDULED_BATCH', batchSchedule: { ...batch, batchTimes: [] } } })).toContain('batchTimesRequired');
    expect(validateRule({ ...ok, criteria: { ...ANY_CRITERIA, caseTypes: [' '] } })).toContain('caseTypesInvalid');
    expect(validateRule({ ...ok, action: { ...DEFAULT_ACTION, releaseMode: 'NOPE' as never } })).toContain('modeInvalid');
  });
});

describe('cron view', () => {
  it('writes a plain daily or weekly batch as a cron line, and nothing for what a cron line cannot say', () => {
    expect(batchToCron(batch)).toBe('0 22 * * 1,2,3,4,5');
    expect(batchToCron({ ...batch, batchFrequency: 'daily' })).toBe('0 22 * * *');
    expect(batchToCron({ ...batch, batchTimes: ['06:30', '22:00'] })).toBe('');
    expect(batchToCron({ ...batch, batchFrequency: 'monthly', batchMonthDays: [1] })).toBe('');
    expect(batchToCron(null)).toBe('');
  });
  it('is the spec\'s schedule shape', () => {
    const r = rule('x', 'fac-a', { billingType: 'TC' }, { releaseMode: 'SCHEDULED_BATCH', batchSchedule: batch });
    expect(toReleaseSchedule(r)).toEqual({ siteId: 'fac-a', billingType: 'TC', releaseMode: 'SCHEDULED_BATCH', holdDurationMinutes: 0, batchScheduleCron: '0 22 * * 1,2,3,4,5' });
  });
});

describe('resolveReleaseRule', () => {
  const rules = [
    rule('ent-26', null, { billingType: '26' }, { holdDurationMinutes: 60 }),
    rule('ent-any', null, {}, { holdDurationMinutes: 5 }),
    rule('fac-26', 'fac-a', { billingType: '26' }, { holdDurationMinutes: 240 }),
    rule('ent-cyto', null, { billingType: '26', caseTypes: ['cytology'] }, { holdDurationMinutes: 15 }),
    rule('ent-amended', null, { amendment: 'amended' }, { holdDurationMinutes: 0 }),
  ];
  it('a performing facility\'s own rule beats every enterprise rule', () => {
    const r = resolveReleaseRule(rules, facts({ performingFacilityId: 'fac-a', caseType: 'cytology' }));
    expect([r.rule?.id, r.source]).toEqual(['fac-26', 'facility']);
  });
  it('other facilities follow the enterprise, the most specific rule winning', () => {
    expect(resolveReleaseRule(rules, facts({ performingFacilityId: 'fac-b' })).rule?.id).toBe('ent-26');
    expect(resolveReleaseRule(rules, facts({ performingFacilityId: 'fac-b', caseType: 'cytology' })).rule?.id).toBe('ent-cyto');
    expect(resolveReleaseRule(rules, facts({ billingType: 'TC' })).rule?.id).toBe('ent-any');
    expect(resolveReleaseRule(rules, facts({ billingType: 'TC', amended: true })).rule?.id).toBe('ent-amended');
  });
  it('a rule naming a pathologist or ordering site matches only those', () => {
    const rs = [rule('p', null, { primaryPathologistId: 'u1' }), rule('s', null, { orderingSiteId: 'site-1' })];
    expect(resolveReleaseRule(rs, facts({ primaryPathologistId: 'u1' })).rule?.id).toBe('p');
    expect(resolveReleaseRule(rs, facts({ primaryPathologistId: 'u2' })).source).toBe('default');
    expect(resolveReleaseRule(rs, facts({ orderingSiteId: 'site-1' })).rule?.id).toBe('s');
  });
  it('with no rule the built-in default applies', () => {
    expect(resolveReleaseRule([], facts())).toMatchObject({ source: 'default', rule: null, action: DEFAULT_ACTION });
  });
});

describe('decideRelease', () => {
  const now = at('2026-10-19T10:00:00.000Z');
  const seed = seedRules('');
  it('PS-336 defaults: a technical charge is not held; a professional charge goes at final sign-out', () => {
    expect(decideRelease(seed, facts({ billingType: 'TC', signedOutAt: undefined }), now)).toMatchObject({ state: 'due', scheduledReleaseAt: '2026-10-19T08:00:00.000Z' });
    expect(decideRelease(seed, facts({ billingType: '26', signedOutAt: undefined }), now)).toMatchObject({ state: 'waiting', reason: 'awaitingSignOut' });
    expect(decideRelease(seed, facts({ billingType: '26' }), now)).toMatchObject({ state: 'due', reason: 'due' });
    expect(decideRelease(seed, facts({ billingType: 'Global' }), now).state).toBe('due');
  });
  it('a hold counts from the milestone and the charge is due once it has passed', () => {
    const r = [rule('h', null, { billingType: '26' }, { holdDurationMinutes: 120 })];
    expect(decideRelease(r, facts(), now)).toMatchObject({ state: 'waiting', reason: 'holdWindow', scheduledReleaseAt: '2026-10-19T11:00:00.000Z' });
    expect(decideRelease(r, facts(), at('2026-10-19T11:00:00.000Z')).state).toBe('due');
    const tc = [rule('h', null, { billingType: 'TC' }, { holdDurationMinutes: 30 })];
    expect(decideRelease(tc, facts({ billingType: 'TC' }), at('2026-10-19T08:10:00.000Z')).scheduledReleaseAt).toBe('2026-10-19T08:30:00.000Z');
  });
  it('a batch rule releases in the first batch after the milestone', () => {
    const r = [rule('b', null, { billingType: '26' }, { releaseMode: 'SCHEDULED_BATCH', batchSchedule: batch })];
    expect(decideRelease(r, facts(), now)).toMatchObject({ state: 'waiting', reason: 'batchWaiting', scheduledReleaseAt: '2026-10-19T22:00:00.000Z' });
    expect(decideRelease(r, facts(), at('2026-10-19T22:05:00.000Z')).state).toBe('due');
  });
  it('autoReleaseOnComplete off waits for a person', () => {
    expect(decideRelease([rule('m', null, {}, { autoReleaseOnComplete: false })], facts(), now)).toMatchObject({ state: 'manual', reason: 'manualRelease' });
  });
  it('an unmapped CPT or a missing technical facility parks the charge when the rule asks; an amendment delta always does', () => {
    expect(decideRelease(seed, facts({ cptMapped: false }), now)).toMatchObject({ state: 'review', needsReview: 'unmappedCpt' });
    expect(decideRelease(seed, facts({ technicalFacilityMissing: true }), now)).toMatchObject({ state: 'review', needsReview: 'missingTechnicalFacility' });
    const off = [rule('o', null, {}, { manualReviewRequired: false })];
    expect(decideRelease(off, facts({ cptMapped: false }), now).state).toBe('due');
    expect(decideRelease(off, facts({ amendmentDelta: true, amended: true }), now)).toMatchObject({ state: 'review', needsReview: 'amendmentDelta' });
  });
  it('says where the rule came from', () => {
    expect(decideRelease(seed, facts(), now)).toMatchObject({ source: 'enterprise', ruleId: 'brr-ent-26' });
    expect(decideRelease([], facts(), now)).toMatchObject({ source: 'default', ruleId: null });
  });
});

describe('releaseStatusFor and planAmendment', () => {
  const due = decideRelease(seedRules(''), facts(), at('2026-10-19T10:00:00.000Z'));
  const waiting = decideRelease(seedRules(''), facts({ signedOutAt: undefined }), at('2026-10-19T10:00:00.000Z'));
  it('maps the charge queue status and the decision to the five release statuses', () => {
    expect(releaseStatusFor('QUEUED', false, due)).toBe('QUEUED');
    expect(releaseStatusFor('QUEUED', false, waiting)).toBe('HELD');
    expect(releaseStatusFor('QUEUED', false, waiting, true)).toBe('QUEUED');
    expect(releaseStatusFor('SENT', false, due)).toBe('RELEASED');
    expect(releaseStatusFor('FAILED', false, due)).toBe('FAILED');
    expect(releaseStatusFor('QUEUED', true, due)).toBe('RETRACTED');
  });
  it('an amendment retracts what has not gone and names what has', () => {
    const plan = planAmendment('c1', [
      { id: 'a', caseId: 'c1', status: 'QUEUED' }, { id: 'b', caseId: 'c1', status: 'FAILED' }, { id: 'c', caseId: 'c1', status: 'SENT' },
      { id: 'd', caseId: 'c2', status: 'QUEUED' }, { id: 'e', caseId: 'c1', status: 'QUEUED', retracted: true },
    ]);
    expect(plan).toEqual({ retract: ['a', 'b'], alreadySent: ['c'] });
  });
  it('seeds one enterprise rule per billing type', () => {
    expect(seedRules('x').map(r => [r.id, r.facilityId, r.criteria.billingType])).toEqual([['brr-ent-TC', null, 'TC'], ['brr-ent-26', null, '26'], ['brr-ent-Global', null, 'Global']]);
  });
});
