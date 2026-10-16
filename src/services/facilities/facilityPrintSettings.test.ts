// src/services/facilities/facilityPrintSettings.test.ts
// Batch 517 (PS-337): report printing is saved only through setPrintSettings,
// checked against config:print-settings:manage.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = vi.hoisted(() => ({ refuse: new Set<string>(), asked: [] as string[] }));
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: vi.fn(async (capability: string) => {
      auth.asked.push(capability);
      return { capability, allowed: !auth.refuse.has(capability), grantedBy: [], missingRequirements: [], context: {} };
    }),
  },
}));

const { mockFacilityService: svc } = await import('./mockFacilityService');

const QZ = { printDeliveryConfig: { enabled: true, mode: 'NATIVE_QZ_TRAY' as const, printerName: 'Histology LaserJet' } };

beforeEach(() => { auth.refuse.clear(); auth.asked = []; });

describe('facilityService.setPrintSettings', () => {
  it('saves both blocks, checking config:print-settings:manage', async () => {
    const res = await svc.setPrintSettings('c1', { ...QZ, printPresentationPreference: { paperSource: 'TRAY_2_PLAIN' } });
    expect(res.ok).toBe(true);
    expect(auth.asked).toEqual(['config:print-settings:manage']);
    const got = await svc.getById('c1');
    expect(got.ok && got.data.printDeliveryConfig).toEqual(QZ.printDeliveryConfig);
    expect(got.ok && got.data.printPresentationPreference).toEqual({ paperSource: 'TRAY_2_PLAIN' });
    // clearing
    await svc.setPrintSettings('c1', {});
    const cleared = await svc.getById('c1');
    expect(cleared.ok && 'printDeliveryConfig' in cleared.data).toBe(false);
    expect(cleared.ok && 'printPresentationPreference' in cleared.data).toBe(false);
  });

  it('a refusal or a problem changes nothing', async () => {
    auth.refuse.add('config:print-settings:manage');
    expect(await svc.setPrintSettings('c2', QZ)).toEqual({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    auth.refuse.clear();
    expect(await svc.setPrintSettings('c2', { printDeliveryConfig: { enabled: true, mode: 'NATIVE_QZ_TRAY' } })).toEqual({ ok: false, error: 'printerNameRequired' });
    const got = await svc.getById('c2');
    expect(got.ok && got.data.printDeliveryConfig).toBeUndefined();
  });

  it('a facility edit never changes printing, so a stale form cannot overwrite it and config:facilities:manage alone cannot set it', async () => {
    await svc.setPrintSettings('c3', QZ);
    const before = await svc.getById('c3');
    if (!before.ok) throw new Error('seed');
    await svc.update('c3', { ...before.data, printDeliveryConfig: undefined, printPresentationPreference: { duplexMode: 'DUPLEX' } });
    const after = await svc.getById('c3');
    expect(after.ok && after.data.printDeliveryConfig).toEqual(QZ.printDeliveryConfig);
    expect(after.ok && after.data.printPresentationPreference).toBeUndefined();
    const { id: _id, ...input } = before.data;
    const added = await svc.add({ ...input, name: 'Copy site' });
    expect(added.ok && added.data.printDeliveryConfig).toBeUndefined();
  });
});
