// src/services/cancerRegistry/cancerRegistryDefinitions.test.ts
import { describe, it, expect, vi } from 'vitest';
import { CANCER_REGISTRY_DEFINITIONS, cancerRegistryDefinition, cancerRegistriesFor } from './cancerRegistryDefinitions';
import { IDENTIFIER_FORMAT_LIBRARY } from '@/types/systemConfig';
import { saveEnterpriseCancerRegistry, saveFacilityCancerRegistry, type CancerRegistrySettingsDeps } from './saveCancerRegistrySettings';
import { buildCancerRegistryReportPayload } from './buildCancerRegistryReportPayload';
import en from '@/i18n/locales/en.json';

describe('cancer registry definitions (Batch 422)', () => {
  it('fourteen registries, the five the SRS found missing among them, each with its jurisdiction', () => {
    expect(CANCER_REGISTRY_DEFINITIONS).toHaveLength(14); // Batch 620 (part E): + epath_npcr_us
    for (const id of ['ncri_ireland', 'phs_scotland', 'nicr_northern_ireland', 'nkr_netherlands', 'bcr_belgium']) expect(cancerRegistryDefinition(id), id).toBeDefined();
    expect(cancerRegistriesFor('GB_SCT')[0].id).toBe('phs_scotland');
    expect(cancerRegistriesFor('IE')[0].id).toBe('ncri_ireland');
    expect(cancerRegistriesFor('NL')[0].id).toBe('nkr_netherlands');
    expect(cancerRegistriesFor('BE')[0].id).toBe('bcr_belgium');
    expect(cancerRegistriesFor('GB_NIR')[0].id).toBe('nicr_northern_ireland');
    // every jurisdiction PathScribe knows has a cancer registry
    const covered = new Set(CANCER_REGISTRY_DEFINITIONS.flatMap(d => d.jurisdictions));
    for (const j of ['US', 'CA', 'GB_EW', 'GB_SCT', 'GB_NIR', 'IE', 'AU', 'NZ', 'KR', 'BE', 'NL', 'DE', 'FR']) expect(covered.has(j as any), j).toBe(true);
  });
  it('identifiers are known formats; labels exist; nothing claims a verified specification yet', () => {
    const ids = new Set(IDENTIFIER_FORMAT_LIBRARY.map(f => f.id));
    for (const d of CANCER_REGISTRY_DEFINITIONS) {
      if (d.patientIdentifierFormatId) expect(ids.has(d.patientIdentifierFormatId), d.id).toBe(true);
      expect((en as any).cancerRegistrySection.registries[d.labelId], d.id).toBeTruthy();
      expect((en as any).cancerRegistrySection.wireFormats[d.wireFormat], d.wireFormat).toBeTruthy();
      expect(d.specStatus).toBe('configurable');
    }
  });
});

describe('the cancer payload carries the registry identifier and format (Batch 422)', () => {
  const caseData: any = { id: 'C1', accession: { accessionNumber: 'S1' }, patient: { id: 'P', firstName: 'A', lastName: 'B', mrn: '100',
    nationalIdentifiers: [{ system: 'mrn_chi', value: '1401740057', verificationStatus: 'verified' }] }, specimens: [] };
  it('PHS Scotland keys on the verified CHI', () => {
    const p = buildCancerRegistryReportPayload(caseData, 'phs_scotland', 'F', undefined);
    expect(p).toMatchObject({ wireFormat: 'hl7v2_oru', patientIdentifier: { formatId: 'mrn_chi', value: '1401740057', verification: 'verified', fromNationalIdentifier: true } });
  });
  it('NCRI with no IHI recorded: missing, but the report is not held (statutory)', () => {
    expect(buildCancerRegistryReportPayload({ ...caseData, patient: { ...caseData.patient, nationalIdentifiers: [], mrn: undefined } }, 'ncri_ireland', 'F', undefined).patientIdentifier)
      .toEqual({ formatId: 'id_ie_ihi', value: undefined, verification: 'missing', fromNationalIdentifier: false });
  });
  it('NAACCR matches on demographics: no identifier block', () => {
    expect(buildCancerRegistryReportPayload(caseData, 'naaccr_us', 'F', undefined).patientIdentifier).toBeUndefined();
  });
});

function deps(allowed = true) {
  const audits: any[] = [];
  const d: CancerRegistrySettingsDeps = {
    enforce: vi.fn(async () => ({ allowed })),
    updateEnterprise: vi.fn(async () => undefined),
    getFacilityOverride: vi.fn(async () => ({ ok: true, data: null })),
    createFacilityOverride: vi.fn(async () => undefined), updateFacilityOverride: vi.fn(async () => undefined), removeFacilityOverride: vi.fn(async () => undefined),
    logAudit: e => audits.push(e),
  };
  return { d, audits };
}
const u = { id: 'u1', name: 'Pete' };

describe('saveCancerRegistrySettings (Batch 422)', () => {
  it('needs config:cancer-registry:manage', async () => {
    const { d } = deps(false);
    expect(await saveEnterpriseCancerRegistry({ registryId: 'bcr_belgium' }, u, d)).toBe('notPermitted');
    expect(d.updateEnterprise).not.toHaveBeenCalled();
    expect(await saveFacilityCancerRegistry('F1', 'nkr_netherlands', u, d)).toBe('notPermitted');
    expect(d.enforce).toHaveBeenCalledWith('config:cancer-registry:manage', { facilityId: 'F1' });
  });
  it('saves the registry and opt-out rule, and audits them; never the environment (Batch 423: go-live is approved separately)', async () => {
    const { d, audits } = deps();
    expect(await saveEnterpriseCancerRegistry({ registryId: 'phs_scotland', environment: 'production', honoursPatientOptOut: false }, u, d)).toBe('saved');
    expect(d.updateEnterprise).toHaveBeenCalledWith({ registryId: 'phs_scotland', honoursPatientOptOut: false });
    expect(audits[0].detail).toBe('Enterprise cancer registry set to phs_scotland; patient opt-out overridden by statute');
    expect(await saveEnterpriseCancerRegistry({ registryId: 'nonsense' as any }, u, d)).toBe('unknownRegistry');
  });
  it('a facility override is created, updated or removed', async () => {
    const { d } = deps();
    await saveFacilityCancerRegistry('F1', 'ncri_ireland', u, d);
    expect(d.createFacilityOverride).toHaveBeenCalledWith('F1', 'ncri_ireland');
    (d.getFacilityOverride as any).mockResolvedValueOnce({ ok: true, data: { facilityId: 'F1' } });
    await saveFacilityCancerRegistry('F1', 'nicr_northern_ireland', u, d);
    expect(d.updateFacilityOverride).toHaveBeenCalledWith('F1', 'nicr_northern_ireland');
    await saveFacilityCancerRegistry('F1', null, u, d);
    expect(d.removeFacilityOverride).toHaveBeenCalledWith('F1');
  });
});
