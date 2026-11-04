// Batch 621: the stored AI history extraction settings: enterprise and facility entries, validation, capability check.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const auth = vi.hoisted(() => ({ allowed: true, asked: [] as string[] }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: async (cap: string) => { auth.asked.push(cap); return { allowed: auth.allowed }; },
    evaluate: async () => ({ allowed: auth.allowed }),
    grantedCapabilities: async () => new Set<string>(),
  },
}));
import { mockHistoryExtractionSettingsService as svc } from './mockHistoryExtractionSettingsService';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; },
  };
  auth.allowed = true;
  auth.asked = [];
});

describe('AI history extraction settings (mock)', () => {
  it('starts with none stored, so the extraction is off', async () => {
    expect(await svc.getAll()).toEqual({ ok: true, data: [] });
  });
  it('saving needs config:history-extraction:manage', async () => {
    const r = await svc.set({ facilityId: null, enabled: true });
    expect(r.ok && r.data.enabled).toBe(true);
    expect(auth.asked).toContain('config:history-extraction:manage');
  });
  it('saving again for the same scope replaces it; a facility entry sits beside the enterprise one', async () => {
    await svc.set({ facilityId: null, enabled: true });
    await svc.set({ facilityId: null, enabled: false });
    await svc.set({ facilityId: 'fac-a', enabled: true });
    const all = await svc.getAll();
    expect(all.ok && all.data.map(d => [d.facilityId, d.enabled])).toEqual([[null, false], ['fac-a', true]]);
    const own = await svc.getForFacility('fac-a');
    expect(own.ok && own.data?.enabled).toBe(true);
    const none = await svc.getForFacility('fac-b');
    expect(none.ok && none.data).toBeNull();
  });
  it('refuses a setting that is not true or false, and stores nothing', async () => {
    const r = await svc.set({ facilityId: null, enabled: 'yes' as unknown as boolean });
    expect(r).toEqual({ ok: false, error: 'Setting refused: enabledInvalid' });
    expect(await svc.getAll()).toEqual({ ok: true, data: [] });
  });
  it('removes a facility entry; an unknown one is not found', async () => {
    await svc.set({ facilityId: 'fac-a', enabled: true });
    expect((await svc.remove('fac-a')).ok).toBe(true);
    expect(await svc.remove('fac-a')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
  it('without the capability nothing is changed', async () => {
    auth.allowed = false;
    expect((await svc.set({ facilityId: null, enabled: true })).ok).toBe(false);
    auth.allowed = true;
    expect(await svc.getAll()).toEqual({ ok: true, data: [] });
  });
});
