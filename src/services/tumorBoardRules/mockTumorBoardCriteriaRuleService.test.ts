// @vitest-environment happy-dom
// src/services/tumorBoardRules/mockTumorBoardCriteriaRuleService.test.ts
// Batch 610 (#71): the admin-added rules and the facility routing override.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { allowed } = vi.hoisted(() => ({ allowed: { current: true } }));
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: vi.fn(async (capability: string) => ({ capability, allowed: allowed.current, grantedBy: [], missingRequirements: [], context: {} })),
  },
}));

const { mockTumorBoardCriteriaRuleService: svc, mockFacilityTumorBoardRuleOverrideService: overrides } = await import('./mockTumorBoardRuleService');
const { CONFIG_NOT_PERMITTED } = await import('../authorization/guardConfigWrites');

const input = {
  label: 'Triple negative', board: 'Breast MDT' as const,
  criteria: [{ kind: 'diagnosis' as const, text: 'ductal carcinoma' }, { kind: 'biomarker' as const, marker: 'ER', result: 'Negative' }],
};

describe('mockTumorBoardCriteriaRuleService', () => {
  beforeEach(() => { localStorage.clear(); allowed.current = true; });

  it('creates a rule that is active, listed and trimmed', async () => {
    const created = await svc.create({ ...input, label: '  Triple negative ' });
    expect(created.ok).toBe(true);
    const all = await svc.getAll();
    expect(all.ok && all.data).toHaveLength(1);
    if (all.ok) { expect(all.data[0].label).toBe('Triple negative'); expect(all.data[0].active).toBe(true); }
  });

  it('refuses an invalid rule and stores nothing', async () => {
    const res = await svc.create({ ...input, criteria: [] });
    expect(res).toEqual({ ok: false, error: 'criteriaCountInvalid' });
    const all = await svc.getAll();
    expect(all.ok && all.data).toHaveLength(0);
  });

  it('stops at 25 rules', async () => {
    for (let i = 0; i < 25; i++) expect((await svc.create({ ...input, label: `r${i}` })).ok).toBe(true);
    expect(await svc.create(input)).toEqual({ ok: false, error: 'tooManyRules' });
  });

  it('updates and removes a rule; a removed rule takes its facility overrides with it', async () => {
    const created = await svc.create(input);
    if (!created.ok) throw new Error('create failed');
    const id = created.data.id;
    expect((await svc.update(id, { active: false })).ok).toBe(true);
    expect(await overrides.set('fac-1', id, { board: 'GI MDT' })).toMatchObject({ ok: true });
    await svc.remove(id);
    const all = await svc.getAll();
    expect(all.ok && all.data).toHaveLength(0);
    const ov = await overrides.getAll();
    expect(ov.ok && ov.data).toHaveLength(0);
  });

  it('is refused without the manage capability', async () => {
    allowed.current = false;
    expect(await svc.create(input)).toEqual({ ok: false, error: CONFIG_NOT_PERMITTED });
  });
});

describe('facility routing override', () => {
  beforeEach(() => { localStorage.clear(); allowed.current = true; });

  it('stores a board for a criteria rule and for a margin rule', async () => {
    const created = await svc.create(input);
    if (!created.ok) throw new Error('create failed');
    expect(await overrides.set('fac-1', created.data.id, { board: 'GI MDT' })).toMatchObject({ ok: true, data: { board: 'GI MDT' } });
    expect(await overrides.set('fac-1', 'margin-breast-mdt', { board: 'Gyn-Onc' })).toMatchObject({ ok: true, data: { board: 'Gyn-Onc' } });
  });

  it('refuses an unknown board and an unknown rule', async () => {
    expect(await overrides.set('fac-1', 'margin-breast-mdt', { board: 'Skin MDT' as never })).toEqual({ ok: false, error: 'boardInvalid' });
    const res = await overrides.set('fac-1', 'nope', { board: 'GI MDT' });
    expect(res.ok).toBe(false);
  });
});
