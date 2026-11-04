// src/services/cancerRegistry/mockFacilityCancerRegistryOverrideService.ts
// Real, per direct guidance's own established pattern — mirrors
// mockFacilityCytologyRegistryOverrideService.ts's exact CRUD shape.
// Batch 457 (Pete: yes, give Metro General a cancer registry): the demo
// facility Metro General Hospital (c1, a US facility) reports to the
// NAACCR-format US cancer registry, so the seeded Registry Exceptions can be
// resent. Superseded: the earlier decision to seed no facility here. Other
// facilities still have no override (the enterprise setting applies).
import type { IFacilityCancerRegistryOverrideService, FacilityCancerRegistryOverride } from './IFacilityCancerRegistryOverrideService';
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';

const STORAGE_KEY = 'facilityCancerRegistryOverrides';

export const CANCER_REGISTRY_DEMO_OVERRIDES: FacilityCancerRegistryOverride[] = [
  { id: 'fac-cancer-registry-demo-c1', facilityId: 'c1', overrides: { registryId: 'naaccr_us' }, createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z' },
];

const load = (): FacilityCancerRegistryOverride[] => storageGet<FacilityCancerRegistryOverride[]>(STORAGE_KEY, CANCER_REGISTRY_DEMO_OVERRIDES);
const persist = (data: FacilityCancerRegistryOverride[]) => storageSet(STORAGE_KEY, data);

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 60));

export const mockFacilityCancerRegistryOverrideService: IFacilityCancerRegistryOverrideService = {
  async getForFacility(facilityId) {
    await delay();
    const record = load().find(r => r.facilityId === facilityId);
    return ok(record ? { ...record } : null);
  },
  async create(facilityId, overrides) {
    await delay();
    const records = load();
    if (records.some(r => r.facilityId === facilityId)) {
      return err(`Facility ${facilityId} already has a Cancer Registry settings override — update it instead.`);
    }
    const now = new Date().toISOString();
    const newRecord: FacilityCancerRegistryOverride = {
      id: 'fac-cancer-registry-' + Date.now(), facilityId, overrides: { ...overrides }, createdAt: now, updatedAt: now,
    };
    persist([...records, newRecord]);
    return ok({ ...newRecord });
  },
  async update(facilityId, changes) {
    await delay();
    const records = load();
    const idx = records.findIndex(r => r.facilityId === facilityId);
    if (idx === -1) return err(`Facility ${facilityId} has no Cancer Registry settings override to update — create one first.`);
    const updated: FacilityCancerRegistryOverride = {
      ...records[idx], overrides: { ...records[idx].overrides, ...changes }, updatedAt: new Date().toISOString(),
    };
    const withUpdate = [...records];
    withUpdate[idx] = updated;
    persist(withUpdate);
    return ok({ ...updated });
  },
  async remove(facilityId) {
    await delay();
    persist(load().filter(r => r.facilityId !== facilityId));
    return { ok: true, data: undefined };
  },
};
