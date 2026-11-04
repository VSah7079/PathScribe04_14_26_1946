// Batch 620 (part C, PS-800): the stored UK destinations: enterprise and facility entries, validation, capability check.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const auth = vi.hoisted(() => ({ allowed: true, asked: [] as string[] }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: async (cap: string) => { auth.asked.push(cap); return { allowed: auth.allowed }; },
    evaluate: async () => ({ allowed: auth.allowed }),
    grantedCapabilities: async () => new Set<string>(),
  },
}));
import { mockCosdDestinationService as svc } from './mockCosdDestinationService';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; },
  };
  auth.allowed = true;
  auth.asked = [];
});

const input = { facilityId: null, transport: 'restMtls' as const, correctionWorkingDays: 5, nonWorkingDates: ['2026-12-26', '2026-12-25', '2026-12-25'] };

describe('UK cancer registry destinations (mock)', () => {
  it('starts with none stored, so the built-in default applies', async () => {
    const r = await svc.getAll();
    expect(r.ok && r.data).toEqual([]);
  });
  it('saving needs config:cosd-destination:manage and keeps the dates sorted and unique', async () => {
    const r = await svc.set(input);
    expect(r.ok && r.data.nonWorkingDates).toEqual(['2026-12-25', '2026-12-26']);
    expect(auth.asked).toContain('config:cosd-destination:manage');
  });
  it('saving again for the same scope replaces it; a facility entry sits beside the enterprise one', async () => {
    await svc.set(input);
    await svc.set({ ...input, correctionWorkingDays: 4 });
    await svc.set({ ...input, facilityId: 'fac-a', transport: 'sftp' });
    const all = await svc.getAll();
    expect(all.ok && all.data.map(d => [d.facilityId, d.correctionWorkingDays])).toEqual([[null, 4], ['fac-a', 5]]);
    const own = await svc.getForFacility('fac-a');
    expect(own.ok && own.data?.transport).toBe('sftp');
    const none = await svc.getForFacility('fac-b');
    expect(none.ok && none.data).toBeNull();
  });
  it('refuses an invalid destination with the problems named, and stores nothing', async () => {
    const r = await svc.set({ ...input, correctionWorkingDays: 0 });
    expect(r).toEqual({ ok: false, error: 'Destination refused: daysInvalid' });
    expect((await svc.getAll())).toEqual({ ok: true, data: [] });
  });
  it('removes a facility entry; an unknown one is not found', async () => {
    await svc.set({ ...input, facilityId: 'fac-a' });
    expect((await svc.remove('fac-a')).ok).toBe(true);
    expect(await svc.remove('fac-a')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
  it('without the capability nothing is changed', async () => {
    auth.allowed = false;
    const r = await svc.set(input);
    expect(r.ok).toBe(false);
    auth.allowed = true;
    expect((await svc.getAll())).toEqual({ ok: true, data: [] });
  });
});
