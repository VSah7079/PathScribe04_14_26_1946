// src/services/cytology/mockFacilityCytologyWorkloadCapOverrideService.ts
import type { IFacilityCytologyWorkloadCapOverrideService, FacilityCytologyWorkloadCapOverride } from './IFacilityCytologyWorkloadCapOverrideService';
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import { CYTOLOGY_WORKLOAD_CAP_OUT_OF_RANGE, cytologyWorkloadCapProblem } from './cytologyWorkloadCapRules';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

const STORAGE_KEY = 'facilityCytologyWorkloadCapOverrides';

const load    = (): FacilityCytologyWorkloadCapOverride[] => storageGet<FacilityCytologyWorkloadCapOverride[]>(STORAGE_KEY, []);
const persist = (data: FacilityCytologyWorkloadCapOverride[]) => storageSet(STORAGE_KEY, data);

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 60));

const facilityCytologyWorkloadCapOverrideServiceUnchecked: IFacilityCytologyWorkloadCapOverrideService = {
  async getAll() {
    await delay();
    return ok(load().map(r => ({ ...r })));
  },
  async getForFacility(facilityId) {
    await delay();
    const record = load().find(r => r.facilityId === facilityId);
    return ok(record ? { ...record } : null);
  },
  async create(facilityId, overrides) {
    await delay();
    // Batch 576: a cap is a whole number of slides from 1 to 100.
    if (cytologyWorkloadCapProblem(overrides.dailySlideCap)) return err(CYTOLOGY_WORKLOAD_CAP_OUT_OF_RANGE);
    const records = load();
    if (records.some(r => r.facilityId === facilityId)) {
      return err(`Facility ${facilityId} already has a Cytology workload cap override — update it instead.`);
    }
    const now = new Date().toISOString();
    const newRecord: FacilityCytologyWorkloadCapOverride = {
      id: 'fac-workload-cap-' + Date.now(), facilityId, overrides: { ...overrides }, createdAt: now, updatedAt: now,
    };
    persist([...records, newRecord]);
    return ok({ ...newRecord });
  },
  async update(facilityId, changes) {
    await delay();
    if ('dailySlideCap' in changes && cytologyWorkloadCapProblem(changes.dailySlideCap)) return err(CYTOLOGY_WORKLOAD_CAP_OUT_OF_RANGE);
    const records = load();
    const idx = records.findIndex(r => r.facilityId === facilityId);
    if (idx === -1) return err(`Facility ${facilityId} has no Cytology workload cap override to update — create one first.`);
    const updated: FacilityCytologyWorkloadCapOverride = {
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

/** Batch 428: every change needs its Configuration capability (guardConfigWrites). */
export const mockFacilityCytologyWorkloadCapOverrideService: IFacilityCytologyWorkloadCapOverrideService = guardConfigWrites(facilityCytologyWorkloadCapOverrideServiceUnchecked, [
  ['config:cytology-workload-cap:manage', ['create', 'update', 'remove']],
]);
