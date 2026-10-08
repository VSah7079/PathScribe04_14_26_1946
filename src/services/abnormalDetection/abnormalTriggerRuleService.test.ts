// src/services/abnormalDetection/abnormalTriggerRuleService.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 450 (PS-129): an admin adds, edits, deactivates and reactivates a
// trigger rule (field label + value → Abnormal/Critical/Malignant) through
// the Configuration service with no code change, and the rule then drives
// (or stops driving) a match at sign-out.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, vi } from 'vitest';

const auth = vi.hoisted(() => ({ allowed: true, checked: [] as string[] }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: async (capability: string) => { auth.checked.push(capability); return { allowed: auth.allowed }; },
    evaluate: async () => ({ allowed: auth.allowed }),
    grantedCapabilities: async () => new Set<string>(),
  },
}));

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

const { mockAbnormalTriggerRuleService: service } = await import('./mockAbnormalTriggerRuleService');
const { saveAbnormalTriggerRule, toggleAbnormalTriggerRule } = await import('./abnormalTriggerRuleEditing');
const { evaluateAbnormalTriggerRules, toCriticalFindingFlag } = await import('./evaluateAbnormalTriggerRules');
import type { AbnormalTriggerRule } from './IAbnormalTriggerRuleService';
import type { AbnormalTriggerRuleDraft } from './abnormalTriggerRuleEditing';
import type { ResolvedAnswer } from '@/orchestrator/contextBuilder';

const STORED_KEY = 'pathscribe_mock_pathscribe_abnormal_trigger_rules';
const stored = (): AbnormalTriggerRule[] => JSON.parse(store.get(STORED_KEY) ?? '[]');
const draft = (over: Partial<AbnormalTriggerRuleDraft> = {}): AbnormalTriggerRuleDraft => ({
  fieldLabel: 'Tumor Budding', triggerValues: 'High, Intermediate', severity: 'Abnormal', description: '', active: true, performingLabFacilityId: '', ...over,
});
const answer = (fieldLabel: string, displayValue: string): ResolvedAnswer =>
  ({ fieldId: 'f', fieldLabel, fieldType: 'select', value: 'opt', displayValue } as ResolvedAnswer);

beforeEach(() => { auth.allowed = true; auth.checked.length = 0; });

describe('PS-129 abnormal trigger rule service — admin add, edit, deactivate, reactivate', () => {
  it('adds a rule, which is then listed and stored', async () => {
    const res = await service.add({ fieldLabel: 'Extranodal Extension', triggerValues: ['Present'], severity: 'Malignant', status: 'Active' });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('service call failed');
    expect(res.data.id).toMatch(/^atr-/);
    const all = await service.getAll();
    expect(all.ok && all.data.find(r => r.id === res.data.id)).toMatchObject({ fieldLabel: 'Extranodal Extension', triggerValues: ['Present'], severity: 'Malignant', status: 'Active' });
    expect(stored().some(r => r.id === res.data.id)).toBe(true);
    expect(auth.checked).toEqual(['config:abnormal-triggers:manage']);
  });

  it('edits a rule\'s field, values and severity', async () => {
    const res = await service.update('atr-perineural-present', { triggerValues: ['Present', 'Extensive'], severity: 'Critical' });
    expect(res.ok && res.data).toMatchObject({ id: 'atr-perineural-present', fieldLabel: 'Perineural Invasion', triggerValues: ['Present', 'Extensive'], severity: 'Critical' });
    expect(stored().find(r => r.id === 'atr-perineural-present')).toMatchObject({ triggerValues: ['Present', 'Extensive'], severity: 'Critical' });
  });

  it('deactivates and reactivates a rule', async () => {
    const off = await service.deactivate('atr-margin-positive');
    expect(off.ok && off.data.status).toBe('Inactive');
    expect(stored().find(r => r.id === 'atr-margin-positive')?.status).toBe('Inactive');
    const on = await service.reactivate('atr-margin-positive');
    expect(on.ok && on.data.status).toBe('Active');
    expect(stored().find(r => r.id === 'atr-margin-positive')?.status).toBe('Active');
  });

  it('editing an unknown rule fails and changes nothing', async () => {
    const before = (await service.getAll());
    const res = await service.update('atr-missing', { severity: 'Malignant' });
    expect(res.ok).toBe(false);
    expect(await service.getAll()).toEqual(before);
  });

  it('without config:abnormal-triggers:manage, every change is refused and nothing is written', async () => {
    auth.allowed = false;
    const before = await service.getAll();
    for (const res of [
      await service.add({ fieldLabel: 'X', triggerValues: ['Y'], severity: 'Abnormal', status: 'Active' }),
      await service.update('atr-margin-positive', { severity: 'Abnormal' }),
      await service.deactivate('atr-margin-positive'),
      await service.reactivate('atr-margin-positive'),
    ]) expect(res).toEqual({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    expect(await service.getAll()).toEqual(before);
  });
});

describe('PS-129 Configuration save rules (saveAbnormalTriggerRule / toggleAbnormalTriggerRule)', () => {
  const rules: AbnormalTriggerRule[] = [
    { id: 'r-global', fieldLabel: 'Margin Status', triggerValues: ['Positive'], severity: 'Critical', status: 'Active' },
    { id: 'r-lab', fieldLabel: 'Grade', triggerValues: ['3'], severity: 'Abnormal', status: 'Active', performingLabFacilityId: 'LAB-1' },
  ];
  const fakeService = () => ({
    add: vi.fn(async (r: Omit<AbnormalTriggerRule, 'id'>) => ({ ok: true as const, data: { ...r, id: 'new' } })),
    update: vi.fn(async (id: string, c: Partial<AbnormalTriggerRule>) => ({ ok: true as const, data: { ...rules[0], ...c, id } })),
  });

  it('requires a field label and at least one trigger value, writing nothing otherwise', async () => {
    const svc = fakeService();
    expect(await saveAbnormalTriggerRule(draft({ fieldLabel: '  ' }), { mode: 'add' }, rules, svc)).toEqual({ kind: 'invalid', error: 'fieldLabelRequired' });
    expect(await saveAbnormalTriggerRule(draft({ triggerValues: ' , ,' }), { mode: 'add' }, rules, svc)).toEqual({ kind: 'invalid', error: 'triggerValueRequired' });
    expect(svc.add).not.toHaveBeenCalled();
  });

  it('adds a trimmed rule with its comma-separated values; inactive when the form says so', async () => {
    const svc = fakeService();
    const out = await saveAbnormalTriggerRule(draft({ fieldLabel: ' Tumor Budding ', triggerValues: ' High , ,Intermediate ', description: '  ', active: false }), { mode: 'add' }, rules, svc);
    expect(svc.add).toHaveBeenCalledWith({
      fieldLabel: 'Tumor Budding', triggerValues: ['High', 'Intermediate'], severity: 'Abnormal',
      description: undefined, status: 'Inactive', performingLabFacilityId: undefined, syntheticCoding: undefined,
    });
    expect(out).toMatchObject({ kind: 'saved', mode: 'add', rule: { id: 'new' } });
  });

  it('a duplicated rule carries its synthetic coding into the Add', async () => {
    const svc = fakeService();
    const coding = [{ system: 'TEST-SNOMED' as const, code: 'TEST-1', display: 'x' }];
    await saveAbnormalTriggerRule(draft(), { mode: 'add', item: { ...rules[0], syntheticCoding: coding } }, [], svc);
    expect(svc.add.mock.calls[0][0].syntheticCoding).toEqual(coding);
  });

  it('blocks a second rule for the same field label in the same scope, but not in another scope', async () => {
    const svc = fakeService();
    expect(await saveAbnormalTriggerRule(draft({ fieldLabel: 'Margin Status' }), { mode: 'add' }, rules, svc)).toEqual({ kind: 'duplicate', scope: 'global', label: 'Margin Status' });
    expect(await saveAbnormalTriggerRule(draft({ fieldLabel: 'Grade', performingLabFacilityId: 'LAB-1' }), { mode: 'add' }, rules, svc)).toEqual({ kind: 'duplicate', scope: 'lab', label: 'Grade' });
    expect(svc.add).not.toHaveBeenCalled();
    expect((await saveAbnormalTriggerRule(draft({ fieldLabel: 'Margin Status', performingLabFacilityId: 'LAB-1' }), { mode: 'add' }, rules, svc)).kind).toBe('saved');
  });

  it('an edit updates the rule by id and does not collide with itself', async () => {
    const svc = fakeService();
    const out = await saveAbnormalTriggerRule(draft({ fieldLabel: 'Margin Status', triggerValues: 'Positive, Close', severity: 'Malignant' }), { mode: 'edit', item: rules[0] }, rules, svc);
    expect(svc.update).toHaveBeenCalledWith('r-global', expect.objectContaining({ triggerValues: ['Positive', 'Close'], severity: 'Malignant', status: 'Active' }));
    expect(out).toMatchObject({ kind: 'saved', mode: 'edit', rule: { id: 'r-global', severity: 'Malignant' } });
  });

  it('a refused write is reported as saved with no rule (the list is not changed)', async () => {
    const out = await saveAbnormalTriggerRule(draft(), { mode: 'add' }, rules, {
      add: async () => ({ ok: false as const, error: 'CONFIG_NOT_PERMITTED' }), update: async () => ({ ok: false as const, error: 'x' }),
    });
    expect(out).toEqual({ kind: 'saved', mode: 'add', rule: undefined });
  });

  it('toggle deactivates an active rule and reactivates an inactive one', async () => {
    const svc = {
      deactivate: vi.fn(async (id: string) => ({ ok: true as const, data: { ...rules[0], id, status: 'Inactive' as const } })),
      reactivate: vi.fn(async (id: string) => ({ ok: true as const, data: { ...rules[0], id, status: 'Active' as const } })),
    };
    expect((await toggleAbnormalTriggerRule(rules[0], svc))?.status).toBe('Inactive');
    expect(svc.deactivate).toHaveBeenCalledWith('r-global');
    expect((await toggleAbnormalTriggerRule({ ...rules[0], status: 'Inactive' }, svc))?.status).toBe('Active');
    expect(svc.reactivate).toHaveBeenCalledWith('r-global');
  });
});

describe('PS-129 a rule configured through the service drives the sign-out finding', () => {
  const activeFrom = async () => {
    const res = await service.getAll();
    if (!res.ok) throw new Error('service call failed');
    return res.data.filter(r => r.status === 'Active');
  };

  it('an added rule matches a synoptic answer and becomes a discrete (synoptic) finding for the confirm step; deactivated it stops matching; reactivated it matches again', async () => {
    const out = await saveAbnormalTriggerRule(draft({ fieldLabel: 'Tumor Deposits', triggerValues: 'Present', severity: 'Critical' }), { mode: 'add' }, (await service.getAll() as any).data, service);
    expect(out.kind).toBe('saved');
    const rule = (out as { rule?: AbnormalTriggerRule }).rule!;
    const answers = [answer('Tumor Deposits', 'Present')];

    const matches = evaluateAbnormalTriggerRules('SP-1', answers, await activeFrom());
    expect(matches).toHaveLength(1);
    expect(toCriticalFindingFlag(matches[0])).toMatchObject({ sourceField: 'synoptic', severity: 'Critical', sourceQuote: 'Tumor Deposits: Present', confidence: 100 });

    await toggleAbnormalTriggerRule(rule, service);
    expect(evaluateAbnormalTriggerRules('SP-1', answers, await activeFrom())).toEqual([]);

    await toggleAbnormalTriggerRule({ ...rule, status: 'Inactive' }, service);
    expect(evaluateAbnormalTriggerRules('SP-1', answers, await activeFrom())).toHaveLength(1);
  });
});
