// Batch 619 (PS-800): the stored delivery schedules: seed, enterprise and facility entries, validation, capability check.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const auth = vi.hoisted(() => ({ allowed: true, asked: [] as string[] }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: async (cap: string) => { auth.asked.push(cap); return { allowed: auth.allowed }; },
    evaluate: async () => ({ allowed: auth.allowed }),
    grantedCapabilities: async () => new Set<string>(),
  },
}));
import { mockDeliveryScheduleService as svc } from './mockDeliveryScheduleService';
import { IMMEDIATE_SCHEDULE, type DeliverySchedule } from './deliverySchedule';

const windows: DeliverySchedule = { ...IMMEDIATE_SCHEDULE, kind: 'windows', timeZone: 'America/Chicago', windows: [{ days: [1, 2, 3, 4, 5], start: '09:00', end: '16:00' }] };

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; },
  };
  auth.allowed = true;
  auth.asked = [];
});

describe('delivery schedule service (mock)', () => {
  it('starts with enterprise schedules for report and billing delivery', async () => {
    const r = await svc.getAll();
    expect(r.ok && r.data.map(e => [e.feed, e.facilityId, e.schedule.kind])).toEqual([['report_delivery', null, 'hold_until_sign_out'], ['billing_delivery', null, 'batch']]);
  });
  it('setting needs config:delivery-schedules:manage; a facility override sits beside the enterprise entry', async () => {
    const set = await svc.set({ feed: 'billing_delivery', facilityId: 'fac-a', schedule: windows });
    expect(set.ok).toBe(true);
    expect(auth.asked).toContain('config:delivery-schedules:manage');
    const all = await svc.getAll();
    expect(all.ok && all.data.filter(e => e.feed === 'billing_delivery')).toHaveLength(2);
    const own = await svc.getForFacility('fac-a');
    expect(own.ok && own.data.map(e => e.feed)).toEqual(['billing_delivery']);
  });
  it('setting the same feed and scope again replaces it', async () => {
    await svc.set({ feed: 'results', facilityId: null, schedule: windows });
    await svc.set({ feed: 'results', facilityId: null, schedule: IMMEDIATE_SCHEDULE });
    const all = await svc.getAll();
    expect(all.ok && all.data.filter(e => e.feed === 'results').map(e => e.schedule.kind)).toEqual(['immediate']);
  });
  it('a schedule that can\'t be used is refused and nothing changes', async () => {
    const r = await svc.set({ feed: 'adt', facilityId: null, schedule: { ...windows, windows: [] } });
    expect(r.ok).toBe(false);
    const all = await svc.getAll();
    expect(all.ok && all.data.some(e => e.feed === 'adt')).toBe(false);
  });
  it('removing an override returns the facility to the enterprise; a missing one is NOT_FOUND', async () => {
    await svc.set({ feed: 'billing_delivery', facilityId: 'fac-a', schedule: windows });
    expect((await svc.remove('billing_delivery', 'fac-a')).ok).toBe(true);
    expect(await svc.remove('billing_delivery', 'fac-a')).toEqual({ ok: false, error: 'NOT_FOUND' });
    const own = await svc.getForFacility('fac-a');
    expect(own.ok && own.data).toEqual([]);
  });
  it('without the permission nothing changes', async () => {
    auth.allowed = false;
    expect((await svc.set({ feed: 'adt', facilityId: null, schedule: windows })).ok).toBe(false);
    expect((await svc.remove('billing_delivery', 'x')).ok).toBe(false);
    auth.allowed = true;
    const all = await svc.getAll();
    expect(all.ok && all.data).toHaveLength(2);
  });
});

describe('registry schedules (mock)', () => {
  it('a registry schedule needs a registry, and only the registry feed takes one', async () => {
    expect((await svc.set({ feed: 'registry', facilityId: null, schedule: IMMEDIATE_SCHEDULE })).ok).toBe(false);
    expect((await svc.set({ feed: 'results', facilityId: null, registryKey: 'cancer:x', schedule: IMMEDIATE_SCHEDULE })).ok).toBe(false);
  });
  it('each registry keeps its own entry, and a facility override is per registry', async () => {
    const hold: DeliverySchedule = { ...IMMEDIATE_SCHEDULE, kind: 'review_hold', reviewHoldMinutes: 120, amendmentRequeues: true, reportingDeadlineDays: 30 };
    await svc.set({ feed: 'registry', facilityId: null, registryKey: 'cancer:a', schedule: hold });
    await svc.set({ feed: 'registry', facilityId: null, registryKey: 'cancer:b', schedule: hold });
    await svc.set({ feed: 'registry', facilityId: 'fac-a', registryKey: 'cancer:a', schedule: { ...hold, reviewHoldMinutes: 480 } });
    await svc.set({ feed: 'registry', facilityId: null, registryKey: 'cancer:a', schedule: { ...hold, reviewHoldMinutes: 60 } });
    const all = await svc.getAll();
    expect(all.ok && all.data.filter(e => e.feed === 'registry')).toHaveLength(3);
    expect((await svc.remove('registry', 'fac-a', 'cancer:b')).ok).toBe(false);
    expect((await svc.remove('registry', 'fac-a', 'cancer:a')).ok).toBe(true);
    const own = await svc.getForFacility('fac-a');
    expect(own.ok && own.data).toEqual([]);
  });
});
