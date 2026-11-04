// @vitest-environment happy-dom
// Batch 452 (PS-156): the correlation settings are configuration, checked
// against config:cytology-histology-correlation:manage, and refuse bad rules.
import { beforeEach, describe, expect, it, vi } from 'vitest';
const enforce = vi.hoisted(() => vi.fn(async () => ({ allowed: true })));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce, evaluate: enforce, grantedCapabilities: async () => new Set<string>() },
}));
import { mockCytologyHistologyCorrelationSettingsService as settings, mockFacilityCytologyHistologyCorrelationOverrideService as overrides } from './mockCytologyHistologyCorrelationSettingsService';
import { getEffectiveHistologyCorrelationRule } from './cytologyHistologyCorrelationLive';

describe('correlation settings services (PS-156)', () => {
  beforeEach(() => { localStorage.clear(); enforce.mockClear(); enforce.mockImplementation(async () => ({ allowed: true })); });

  it('starts at 180 days from collection with no regional rules', async () => {
    expect(await settings.get()).toEqual({ ok: true, data: { windowDays: 180, anchor: 'collection', jurisdictionRules: {} } });
  });

  it('saves enterprise and jurisdiction rules, checking the capability', async () => {
    const res = await settings.update({ windowDays: 365, jurisdictionRules: { CA: { windowDays: 270, anchor: 'receipt' } } });
    expect(res.ok).toBe(true);
    expect((await settings.get())).toMatchObject({ data: { windowDays: 365, anchor: 'collection', jurisdictionRules: { CA: { windowDays: 270, anchor: 'receipt' } } } });
    expect(enforce).toHaveBeenCalledWith('config:cytology-histology-correlation:manage');
  });

  it('refuses an invalid rule and keeps what was there', async () => {
    expect(await settings.update({ windowDays: 0 })).toEqual({ ok: false, error: 'windowDaysInvalid' });
    expect(await settings.update({ jurisdictionRules: { US: { windowDays: 90, anchor: 'nope' as never } } })).toEqual({ ok: false, error: 'anchorInvalid' });
    expect((await settings.get())).toMatchObject({ data: { windowDays: 180, jurisdictionRules: {} } });
    expect(await overrides.set('F1', { windowDays: 99999 })).toEqual({ ok: false, error: 'windowDaysInvalid' });
  });

  it('without the capability nothing changes', async () => {
    enforce.mockImplementation(async () => ({ allowed: false }));
    const res = await settings.update({ windowDays: 30 });
    expect(res.ok).toBe(false);
    expect((await overrides.set('F1', { windowDays: 30 })).ok).toBe(false);
    enforce.mockImplementation(async () => ({ allowed: true }));
    expect((await settings.get())).toMatchObject({ data: { windowDays: 180 } });
    expect(await overrides.getForFacility('F1')).toEqual({ ok: true, data: null });
  });

  it('facility overrides are set, replaced and removed', async () => {
    await overrides.set('F1', { windowDays: 120 });
    await overrides.set('F1', { anchor: 'receipt' });
    expect((await overrides.getForFacility('F1'))).toMatchObject({ data: { facilityId: 'F1', overrides: { anchor: 'receipt' } } });
    expect((await overrides.getAll())).toMatchObject({ data: [{ facilityId: 'F1' }] });
    await overrides.remove('F1');
    expect(await overrides.getAll()).toEqual({ ok: true, data: [] });
  });

  it("the live rule for a real facility follows its jurisdiction's rule, then its own override", async () => {
    await settings.update({ jurisdictionRules: { GB_NIR: { windowDays: 365, anchor: 'receipt' } } });
    expect(await getEffectiveHistologyCorrelationRule('c-ni-lagan-valley')).toEqual({ windowDays: 365, anchor: 'receipt', source: 'jurisdiction' });
    await overrides.set('c-ni-lagan-valley', { windowDays: 200 });
    expect(await getEffectiveHistologyCorrelationRule('c-ni-lagan-valley')).toEqual({ windowDays: 200, anchor: 'receipt', source: 'facility' });
    expect(await getEffectiveHistologyCorrelationRule(undefined)).toEqual({ windowDays: 180, anchor: 'collection', source: 'enterprise' });
  });
});
