// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import { mockClientSLAService } from './mockClientSLAService';
import { mockFacilityService } from '../facilities/mockFacilityService';
import { loadOpenSlaBreaches } from './loadOpenSlaBreaches';

describe('loadOpenSlaBreaches', () => {
  beforeEach(() => localStorage.clear());

  it('is empty when no client has an SLA', async () => {
    const m = await loadOpenSlaBreaches([{ id: 'c1', order: { facilityId: 'x', receivedDate: '2020-01-01T00:00:00Z' } }]);
    expect(m.size).toBe(0);
  });

  it('flags an open case of a client that has an SLA and has waited too long', async () => {
    const facilities = await mockFacilityService.getAll();
    expect(facilities.ok).toBe(true);
    const f = facilities.ok ? facilities.data.find(x => x.assigningAuthority) : undefined;
    expect(f).toBeDefined();
    const added = await mockClientSLAService.add({ assigningAuthority: f!.assigningAuthority, clientName: f!.name, firstTouchTargetHrs: 1, totalTatTargetHrs: 2, active: true });
    expect(added.ok).toBe(true);
    const now = new Date('2026-10-18T12:00:00Z');
    const m = await loadOpenSlaBreaches([
      { id: 'late', order: { facilityId: f!.id, receivedDate: '2026-10-18T06:00:00Z' } },
      { id: 'fresh', order: { facilityId: f!.id, receivedDate: '2026-10-18T11:30:00Z' } },
    ], now);
    expect(m.get('late')).toBe('total');
    expect(m.has('fresh')).toBe(false);
  });
});
