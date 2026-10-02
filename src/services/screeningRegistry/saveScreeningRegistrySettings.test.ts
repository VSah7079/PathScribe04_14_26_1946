// Batch 414: registry settings need config:screening-registry:manage and are audited.
import { describe, it, expect, vi } from 'vitest';
import { saveEnterpriseScreeningRegistry, saveFacilityScreeningRegistry, saveScreeningRegistryConfig, type ScreeningRegistrySettingsDeps } from './saveScreeningRegistrySettings';

function makeDeps(allowed = true, existingOverride = false) {
  const audit: any[] = [];
  const deps: ScreeningRegistrySettingsDeps = {
    enforce: vi.fn(async () => ({ allowed })),
    updateEnterprise: vi.fn(async () => undefined),
    getFacilityOverride: async () => ({ ok: true, data: existingOverride ? { facilityId: 'F1' } : null }),
    createFacilityOverride: vi.fn(async () => undefined),
    updateFacilityOverride: vi.fn(async () => undefined),
    removeFacilityOverride: vi.fn(async () => undefined),
    saveConfig: vi.fn(async () => undefined),
    getConfig: async () => ({ registryId: 'sccrs_scotland', requireMappedCodes: true, codeMappings: [], environment: 'production' }),
    logAudit: vi.fn(e => { audit.push(e); }),
    now: () => new Date('2026-09-30T18:00:00Z'),
  };
  return { deps, audit };
}
const user = { id: 'A1', name: 'Admin' };

describe('saveScreeningRegistrySettings', () => {
  it('each save needs config:screening-registry:manage', async () => {
    const { deps } = makeDeps(false);
    expect(await saveEnterpriseScreeningRegistry('sccrs_scotland', user, deps)).toBe('notPermitted');
    expect(await saveFacilityScreeningRegistry('F1', 'csms_uk', user, deps)).toBe('notPermitted');
    expect(await saveScreeningRegistryConfig({ registryId: 'sccrs_scotland', requireMappedCodes: true, codeMappings: [] }, user, deps)).toBe('notPermitted');
    expect(deps.enforce).toHaveBeenCalledWith('config:screening-registry:manage');
    expect(deps.updateEnterprise).not.toHaveBeenCalled();
  });
  it('the enterprise registry is saved and audited; an unknown one is refused', async () => {
    const { deps, audit } = makeDeps();
    expect(await saveEnterpriseScreeningRegistry('bogus' as never, user, deps)).toBe('unknownRegistry');
    expect(await saveEnterpriseScreeningRegistry('ncsp_new_zealand', user, deps)).toBe('saved');
    expect(deps.updateEnterprise).toHaveBeenCalledWith('ncsp_new_zealand');
    expect(audit[0].detail).toContain('ncsp_new_zealand');
  });
  it('a facility override is created, updated, or removed', async () => {
    const fresh = makeDeps();
    await saveFacilityScreeningRegistry('F1', 'canada_provincial', user, fresh.deps);
    expect(fresh.deps.createFacilityOverride).toHaveBeenCalledWith('F1', 'canada_provincial');
    const existing = makeDeps(true, true);
    await saveFacilityScreeningRegistry('F1', 'canada_provincial', user, existing.deps);
    expect(existing.deps.updateFacilityOverride).toHaveBeenCalledWith('F1', 'canada_provincial');
    await saveFacilityScreeningRegistry('F1', null, user, existing.deps);
    expect(existing.deps.removeFacilityOverride).toHaveBeenCalledWith('F1');
  });
  it('blank codes are dropped, who changed it is recorded, and the stored environment is kept (Batch 423)', async () => {
    const { deps } = makeDeps();
    await saveScreeningRegistryConfig({ registryId: 'sccrs_scotland', requireMappedCodes: true, environment: 'test', codeMappings: [
      { field: 'adequacy', categoryId: 'sat', code: ' A1 ', display: ' ' }, { field: 'primaryInterpretation', categoryId: 'nilm', code: '  ' },
    ] }, user, deps);
    expect(deps.saveConfig).toHaveBeenCalledWith({ registryId: 'sccrs_scotland', requireMappedCodes: true, environment: 'production',
      codeMappings: [{ field: 'adequacy', categoryId: 'sat', code: 'A1', display: undefined, baselineVersion: 'v2026.4.1' }], updatedAt: '2026-09-30T18:00:00.000Z', updatedBy: 'Admin' });
  });
  it('Batch 424: a new mapping is stamped with the template version; the identifier hold too when turned on', async () => {
    const { deps } = makeDeps();
    await saveScreeningRegistryConfig({ registryId: 'sccrs_scotland', requireMappedCodes: true, requirePatientIdentifier: true, codeMappings: [{ field: 'adequacy', categoryId: 'sat', code: 'A1' }] }, user, deps);
    expect(deps.saveConfig).toHaveBeenCalledWith(expect.objectContaining({ identifierHoldBaselineVersion: 'v2026.4.1', codeMappings: [expect.objectContaining({ baselineVersion: 'v2026.4.1' })] }));
  });
});
