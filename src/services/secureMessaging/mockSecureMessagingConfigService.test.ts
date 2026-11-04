// @vitest-environment happy-dom
// src/services/secureMessaging/mockSecureMessagingConfigService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = vi.hoisted(() => ({ allowed: true, asked: [] as string[] }));
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: vi.fn(async (capability: string) => { auth.asked.push(capability); return { capability, allowed: auth.allowed, grantedBy: [], missingRequirements: [], context: {} }; }) },
}));
vi.mock('../index', () => ({
  facilityService: { getAll: vi.fn(async () => ({ ok: true, data: [
    { id: 'c-ent-dvmc', isEnterprise: true, legacyTenantIds: ['ORG-DVMC', 'HOSP-001'] },
    { id: 'c-ent-hfhs', isEnterprise: true, legacyTenantIds: ['ORG-HFHS'] },
  ] })) },
}));

const { mockSecureMessagingConfigService: svc, DEMO_SECURE_MESSAGING, SECURE_MESSAGING_STORAGE_KEY } = await import('./mockSecureMessagingConfigService');

beforeEach(() => { localStorage.clear(); auth.allowed = true; auth.asked = []; });

describe('mockSecureMessagingConfigService (Batch 517, PS-143)', () => {
  it('seeds the demo labs, including one gateway covered and one not', async () => {
    const dvmc = await svc.getForFacility('c-ent-dvmc');
    expect(dvmc.ok && dvmc.data?.gateways.map(g => [g.gatewayId, !!g.agreement])).toEqual([['PAUBOX', true], ['VIRTRU', false]]);
    expect(DEMO_SECURE_MESSAGING.map(c => c.facilityId)).toEqual(expect.arrayContaining(['c-ent-mft', 'c-au-sydney-cyto', 'c-nz-auckland-cyto', 'c-kr-seoul-general']));
    expect(localStorage.getItem(`pathscribe_mock_${SECURE_MESSAGING_STORAGE_KEY}`) ?? localStorage.getItem(SECURE_MESSAGING_STORAGE_KEY)).toBeTruthy();
  });

  it('finds a person\'s lab from their organisation', async () => {
    const r = await svc.forOrganisation('ORG-DVMC');
    expect(r.ok && r.data?.facilityId).toBe('c-ent-dvmc');
    expect(await svc.forOrganisation('ORG-HFHS')).toEqual({ ok: true, data: null });
    expect(await svc.forOrganisation(undefined)).toEqual({ ok: true, data: null });
  });

  it('saving needs config:secure-messaging:manage and a setup without problems', async () => {
    const config = { facilityId: 'c-ent-hfhs', defaultGatewayId: 'ZIX' as const, gateways: [{ gatewayId: 'ZIX' as const, enabled: true }] };
    auth.allowed = false;
    expect(await svc.save(config)).toEqual({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    expect(auth.asked).toEqual(['config:secure-messaging:manage']);
    auth.allowed = true;
    expect(await svc.save({ ...config, defaultGatewayId: 'PAUBOX' })).toEqual({ ok: false, error: 'defaultNotEnabled' });
    const saved = await svc.save(config, { userId: 'admin' });
    expect(saved.ok && saved.data.updatedBy).toBe('admin');
    const read = await svc.forOrganisation('ORG-HFHS');
    expect(read.ok && read.data?.gateways[0].gatewayId).toBe('ZIX');
  });
});
