// src/services/cytology/mockCytologyWorkloadCapSettingsService.ts
import { ICytologyWorkloadCapSettingsService, CytologyWorkloadCapSettingsConfig, DEFAULT_CYTOLOGY_WORKLOAD_CAP_SETTINGS } from './ICytologyWorkloadCapSettingsService';
import { storageGet, storageSet } from '../mockStorage';
import { ServiceResult } from '../types';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

const STORAGE_KEY = 'cytologyWorkloadCapSettings';

const load    = () => storageGet<CytologyWorkloadCapSettingsConfig>(STORAGE_KEY, DEFAULT_CYTOLOGY_WORKLOAD_CAP_SETTINGS);
const persist = (d: CytologyWorkloadCapSettingsConfig) => storageSet(STORAGE_KEY, d);
let MOCK_CONFIG: CytologyWorkloadCapSettingsConfig = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const delay = () => new Promise(r => setTimeout(r, 60));

const cytologyWorkloadCapSettingsServiceUnchecked: ICytologyWorkloadCapSettingsService = {
  async get() {
    await delay();
    return ok({ ...MOCK_CONFIG });
  },
  async update(patch) {
    await delay();
    MOCK_CONFIG = { ...MOCK_CONFIG, ...patch };
    persist(MOCK_CONFIG);
    return ok({ ...MOCK_CONFIG });
  },
  async reset() {
    await delay();
    MOCK_CONFIG = { ...DEFAULT_CYTOLOGY_WORKLOAD_CAP_SETTINGS };
    persist(MOCK_CONFIG);
    return ok({ ...MOCK_CONFIG });
  },
};

/** Batch 428: every change needs its Configuration capability (guardConfigWrites). */
export const mockCytologyWorkloadCapSettingsService: ICytologyWorkloadCapSettingsService = guardConfigWrites(cytologyWorkloadCapSettingsServiceUnchecked, [
  ['config:cytology-workload-cap:manage', ['update', 'reset']],
]);
