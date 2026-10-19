// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import { mockClientSLAService as svc, CLIENT_SLA_STORAGE_KEY } from './mockClientSLAService';

const base = { assigningAuthority: 'NCL', clientName: 'North Clinic', firstTouchTargetHrs: 4, totalTatTargetHrs: 48, active: true };

describe('mockClientSLAService', () => {
  beforeEach(() => localStorage.removeItem('pathscribe_mock_' + CLIENT_SLA_STORAGE_KEY));

  it('starts empty, adds, finds by authority in any case, updates and removes', async () => {
    expect((await svc.getAll()).ok && (await svc.getAll() as { data: unknown[] }).data).toEqual([]);
    const added = await svc.add(base);
    expect(added.ok).toBe(true);
    const found = await svc.getByAssigningAuthority('ncl');
    expect(found.ok && found.data?.clientName).toBe('North Clinic');
    const id = added.ok ? added.data.id : '';
    const upd = await svc.update(id, { totalTatTargetHrs: 72, statTotalTatTargetHrs: 12 });
    expect(upd.ok && upd.data).toMatchObject({ totalTatTargetHrs: 72, statTotalTatTargetHrs: 12 });
    expect((await svc.delete(id)).ok).toBe(true);
    expect(await svc.delete(id)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('refuses a duplicate authority and bad hours, and keeps what it stored', async () => {
    await svc.add(base);
    expect(await svc.add({ ...base, clientName: 'Other' })).toEqual({ ok: false, error: 'duplicateAuthority' });
    expect(await svc.add({ ...base, assigningAuthority: 'XYZ', firstTouchTargetHrs: 60 })).toEqual({ ok: false, error: 'firstTouchExceedsTotal' });
    const raw = localStorage.getItem('pathscribe_mock_' + CLIENT_SLA_STORAGE_KEY);
    expect(JSON.parse(raw!)).toHaveLength(1);
  });
});
