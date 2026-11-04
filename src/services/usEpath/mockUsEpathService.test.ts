// Batch 620 (part E, PS-800): the stored ePath profiles and assignments: seed, validation, capability check.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const auth = vi.hoisted(() => ({ allowed: true, asked: [] as string[] }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: async (cap: string) => { auth.asked.push(cap); return { allowed: auth.allowed }; },
    evaluate: async () => ({ allowed: auth.allowed }),
    grantedCapabilities: async () => new Set<string>(),
  },
}));
import { mockUsEpathService as svc } from './mockUsEpathService';
import { EXAMPLE_PROFILE_ID } from './epathProfile';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; },
  };
  auth.allowed = true;
  auth.asked = [];
});

const input = { state: 'az', name: 'Arizona', requiredFields: ['pid-3', 'PID-3'], optionalFields: [], transport: 'sftp' as const, validationRules: [], extensions: [], facilityBasis: 'reading' as const };

describe('ePath profiles (mock)', () => {
  it('starts with the example only', async () => {
    const r = await svc.getProfiles();
    expect(r.ok && r.data.map(p => [p.id, p.example])).toEqual([[EXAMPLE_PROFILE_ID, true]]);
  });
  it('saves a normalised profile and needs config:us-epath:manage', async () => {
    const r = await svc.saveProfile(input);
    expect(r.ok && r.data).toMatchObject({ state: 'AZ', requiredFields: ['PID-3'], example: false });
    expect(auth.asked).toContain('config:us-epath:manage');
  });
  it('refuses an invalid profile, and stores nothing without the capability', async () => {
    expect((await svc.saveProfile({ ...input, state: 'Q' })).ok).toBe(false);
    auth.allowed = false;
    expect((await svc.saveProfile(input)).ok).toBe(false);
    auth.allowed = true;
    const all = await svc.getProfiles();
    expect(all.ok && all.data).toHaveLength(1);
  });
  it('replaces by id; the example and unknown ids are refused', async () => {
    const a = await svc.saveProfile(input);
    if (!a.ok) throw new Error('save');
    const b = await svc.saveProfile({ ...input, id: a.data.id, name: 'AZ 2' });
    expect(b.ok && b.data.name).toBe('AZ 2');
    expect(await svc.saveProfile({ ...input, id: EXAMPLE_PROFILE_ID })).toEqual({ ok: false, error: 'EXAMPLE_READ_ONLY' });
    expect(await svc.saveProfile({ ...input, id: 'nope' })).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
  it('assignments replace the earlier choice, need a real profile, and block removing a profile in use', async () => {
    const a = await svc.saveProfile(input);
    if (!a.ok) throw new Error('save');
    expect(await svc.setAssignment({ facilityId: 'f1', profileId: 'nope' })).toEqual({ ok: false, error: 'PROFILE_NOT_FOUND' });
    await svc.setAssignment({ facilityId: 'f1', profileId: a.data.id });
    await svc.setAssignment({ facilityId: 'f1', profileId: EXAMPLE_PROFILE_ID });
    await svc.setAssignment({ facilityId: null, profileId: a.data.id });
    const all = await svc.getAssignments();
    expect(all.ok && all.data.map(x => [x.facilityId, x.profileId])).toEqual([['f1', EXAMPLE_PROFILE_ID], [null, a.data.id]]);
    expect(await svc.removeProfile(a.data.id)).toEqual({ ok: false, error: 'IN_USE' });
    expect(await svc.removeProfile(EXAMPLE_PROFILE_ID)).toEqual({ ok: false, error: 'EXAMPLE_READ_ONLY' });
    expect((await svc.removeAssignment('f1')).ok).toBe(true);
    expect(await svc.removeAssignment('f1')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
