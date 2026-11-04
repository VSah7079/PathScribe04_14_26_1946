// @vitest-environment happy-dom
// Batch 450 (PS-201, PS-180, PS-192, PS-195, PS-196, PS-200): each demo
// screening facility resolves to the registry, nomenclature and screening
// strategy its ticket set up, through the same services and resolvers that
// cytology sign-out uses (signOutCytologyCaseDeps.getRegistrySettings). These
// tickets were seed-data changes that shipped without a test.
import { describe, expect, it } from 'vitest';
import { mockFacilityService } from '../facilities/mockFacilityService';
import { mockRegistrySettingsService } from '../facilities/mockRegistrySettingsService';
import { mockFacilityRegistryOverrideService } from '../facilities/mockFacilityRegistryOverrideService';
import { resolveEffectiveRegistrySettings } from '../facilities/resolveEffectiveRegistrySettings';
import { mockCytologyNomenclatureSettingsService } from '../cytology/mockCytologyNomenclatureSettingsService';
import { mockFacilityCytologyNomenclatureOverrideService } from '../cytology/mockFacilityCytologyNomenclatureOverrideService';
import { resolveEffectiveCytologyNomenclatureSettings } from '../cytology/resolveEffectiveCytologyNomenclatureSettings';
import { mockCytologyScreeningStrategyService } from '../cytology/mockCytologyScreeningStrategyService';
import { mockFacilityCytologyScreeningStrategyOverrideService } from '../cytology/mockFacilityCytologyScreeningStrategyOverrideService';
import { resolveEffectiveCytologyScreeningStrategy } from '../cytology/resolveEffectiveCytologyScreeningStrategy';

const data = <T,>(r: { ok: true; data: T } | { ok: false }): T => { if (!r.ok) throw new Error('service call failed'); return r.data; };

async function effectiveFor(facilityId: string) {
  const registry = resolveEffectiveRegistrySettings(
    data(await mockRegistrySettingsService.get()),
    data(await mockFacilityRegistryOverrideService.getForFacility(facilityId)) ?? null);
  const nomenclature = resolveEffectiveCytologyNomenclatureSettings(
    data(await mockCytologyNomenclatureSettingsService.get()),
    data(await mockFacilityCytologyNomenclatureOverrideService.getForFacility(facilityId)) ?? null);
  const strategy = resolveEffectiveCytologyScreeningStrategy(
    data(await mockCytologyScreeningStrategyService.get()),
    data(await mockFacilityCytologyScreeningStrategyOverrideService.getForFacility(facilityId)) ?? null);
  return { registryId: registry.registryId, nomenclatureSystem: nomenclature.nomenclatureSystem, screeningStrategy: strategy.screeningStrategy };
}

describe('demo screening facilities resolve to their configured programme', () => {
  it('PS-201: Lagan Valley (Northern Ireland, GB_NIR) → NICSP registry, BSCC/RCPath, primary HPV with reflex cytology', async () => {
    const facility = data(await mockFacilityService.getById('c-ni-lagan-valley'));
    expect(facility?.jurisdiction).toBe('GB_NIR');
    expect(await effectiveFor('c-ni-lagan-valley')).toEqual({ registryId: 'nicsp_northern_ireland', nomenclatureSystem: 'bscc_rcpath', screeningStrategy: 'primary_hpv_reflex' });
  });

  it("PS-192: Fenwick Women's Hospital (England) → CSMS registry, BSCC/RCPath, primary HPV with reflex", async () => {
    expect(await effectiveFor('c-fenwick-womens')).toEqual({ registryId: 'csms_uk', nomenclatureSystem: 'bscc_rcpath', screeningStrategy: 'primary_hpv_reflex' });
  });

  it('PS-195: National Cervical Screening Laboratory, Dublin → CervicalCheck registry, primary HPV with reflex', async () => {
    const e = await effectiveFor('c-ie-ncsl-dublin');
    expect(e.registryId).toBe('cervicalcheck_ireland');
    expect(e.screeningStrategy).toBe('primary_hpv_reflex');
  });

  it("PS-195: Cork Women's Health Clinic exists as an Irish facility but has no registry override of its own (falls back to the enterprise default)", async () => {
    const facility = data(await mockFacilityService.getById('c-ie-cork-clinic'));
    expect(facility?.name).toBe("Cork Women's Health Clinic");
    expect(data(await mockFacilityRegistryOverrideService.getForFacility('c-ie-cork-clinic'))).toBeNull();
  });

  it('PS-196: Amsterdam Cytologie Centrum → PALGA registry, CISOE-A nomenclature, primary HPV with reflex', async () => {
    expect(await effectiveFor('c-nl-amsterdam-cyto')).toEqual({ registryId: 'palga_netherlands', nomenclatureSystem: 'palga_cisoea', screeningStrategy: 'primary_hpv_reflex' });
  });

  it('PS-180/PS-197: Sydney Cytology & Pathology → NCSR registry, primary HPV with reflex', async () => {
    const e = await effectiveFor('c-au-sydney-cyto');
    expect(e.registryId).toBe('ncsr_australia');
    expect(e.screeningStrategy).toBe('primary_hpv_reflex');
  });

  it('PS-200: Ardgowan NHS Health Board (Scotland) → BSCC/RCPath nomenclature instead of the Bethesda default', async () => {
    const enterprise = data(await mockCytologyNomenclatureSettingsService.get());
    expect(enterprise.nomenclatureSystem).not.toBe('bscc_rcpath');
    expect((await effectiveFor('c-ardgowan-hb')).nomenclatureSystem).toBe('bscc_rcpath');
  });

  it('a facility with no overrides gets the enterprise defaults (no registry obligation)', async () => {
    const enterprise = data(await mockRegistrySettingsService.get());
    expect(enterprise.registryId).toBe('none');
    expect((await effectiveFor('c-no-such-facility')).registryId).toBe('none');
  });
});
