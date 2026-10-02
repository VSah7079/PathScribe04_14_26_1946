// src/services/cytology/mockCytologyRoutingSettingsService.ts
import { ICytologyRoutingSettingsService, CytologyRoutingSettingsConfig, DEFAULT_CYTOLOGY_ROUTING_SETTINGS } from './ICytologyRoutingSettingsService';
import { storageGet, storageSet } from '../mockStorage';
import { ServiceResult } from '../types';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

const load    = () => storageGet<CytologyRoutingSettingsConfig>('cytologyRoutingSettings', DEFAULT_CYTOLOGY_ROUTING_SETTINGS);
const persist = (d: CytologyRoutingSettingsConfig) => storageSet('cytologyRoutingSettings', d);
let MOCK_CONFIG: CytologyRoutingSettingsConfig = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const delay = () => new Promise(r => setTimeout(r, 60));

const cytologyRoutingSettingsServiceUnchecked: ICytologyRoutingSettingsService = {
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
    MOCK_CONFIG = { ...DEFAULT_CYTOLOGY_ROUTING_SETTINGS };
    persist(MOCK_CONFIG);
    return ok({ ...MOCK_CONFIG });
  },
};

/** Batch 428: every change needs its Configuration capability (guardConfigWrites). */
export const mockCytologyRoutingSettingsService: ICytologyRoutingSettingsService = guardConfigWrites(cytologyRoutingSettingsServiceUnchecked, [
  ['config:cytology-routing:manage', ['update', 'reset']],
]);
