// Batch 619 (PS-800): the stored billing release rules: seed, enterprise and facility rules, validation, capability check.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const auth = vi.hoisted(() => ({ allowed: true, asked: [] as string[] }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: async (cap: string) => { auth.asked.push(cap); return { allowed: auth.allowed }; },
    evaluate: async () => ({ allowed: auth.allowed }),
    grantedCapabilities: async () => new Set<string>(),
  },
}));
import { mockBillingReleaseService as svc } from './mockBillingReleaseService';
import { ANY_CRITERIA, DEFAULT_ACTION } from './billingRelease';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; },
  };
  auth.allowed = true;
  auth.asked = [];
});

const facilityRule = { facilityId: 'fac-a', criteria: { ...ANY_CRITERIA, billingType: '26' as const }, action: { ...DEFAULT_ACTION, holdDurationMinutes: 240 } };

describe('billing release rules (mock)', () => {
  it('starts with the three enterprise defaults', async () => {
    const r = await svc.getAll();
    expect(r.ok && r.data.map(x => [x.facilityId, x.criteria.billingType, x.action.holdDurationMinutes])).toEqual([[null, 'TC', 0], [null, '26', 0], [null, 'Global', 0]]);
  });
  it('adding a rule needs config:billing-release:manage and a facility rule sits beside the enterprise ones', async () => {
    const r = await svc.set(facilityRule);
    expect(r.ok).toBe(true);
    expect(auth.asked).toContain('config:billing-release:manage');
    const own = await svc.getForFacility('fac-a');
    expect(own.ok && own.data).toHaveLength(1);
    const all = await svc.getAll();
    expect(all.ok && all.data).toHaveLength(4);
  });
  it('replacing a rule by id keeps one rule; an unknown id is not found', async () => {
    const made = await svc.set(facilityRule);
    const id = made.ok ? made.data.id : '';
    const again = await svc.set({ ...facilityRule, id, action: { ...DEFAULT_ACTION, holdDurationMinutes: 10 } });
    expect(again.ok && again.data.action.holdDurationMinutes).toBe(10);
    const own = await svc.getForFacility('fac-a');
    expect(own.ok && own.data).toHaveLength(1);
    expect(await svc.set({ ...facilityRule, id: 'nope' })).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
  it('refuses an invalid rule with a fixed code, saving nothing', async () => {
    const r = await svc.set({ ...facilityRule, action: { ...DEFAULT_ACTION, holdDurationMinutes: -5 } });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain('holdInvalid');
    const all = await svc.getAll();
    expect(all.ok && all.data).toHaveLength(3);
  });
  it('removes a rule, and removing it twice is not found', async () => {
    expect((await svc.remove('brr-ent-TC')).ok).toBe(true);
    expect(await svc.remove('brr-ent-TC')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
  it('without the capability nothing changes', async () => {
    auth.allowed = false;
    const r = await svc.set(facilityRule);
    expect(r.ok).toBe(false);
    const all = await svc.getAll();
    expect(all.ok && all.data).toHaveLength(3);
  });
});
