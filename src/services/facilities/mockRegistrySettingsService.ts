// src/services/facilities/mockRegistrySettingsService.ts
import { IRegistrySettingsService, RegistrySettingsConfig, DEFAULT_REGISTRY_SETTINGS } from './IRegistrySettingsService';
import { storageGet, storageSet } from '../mockStorage';
import { ServiceResult } from '../types';

const STORAGE_KEY = 'registrySettings';

// Batch 414: the Cytology Registry settings screen used to save to the old
// 'cytologyRegistrySettings' store, which sign-out never read. A lab that
// chose its registry there keeps it: adopted here when this store is empty.
const load    = () => storageGet<RegistrySettingsConfig | null>(STORAGE_KEY, null)
  ?? storageGet<RegistrySettingsConfig | null>('cytologyRegistrySettings', null)
  ?? DEFAULT_REGISTRY_SETTINGS;
const persist = (d: RegistrySettingsConfig) => storageSet(STORAGE_KEY, d);
let MOCK_CONFIG: RegistrySettingsConfig = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const delay = () => new Promise(r => setTimeout(r, 60));

export const mockRegistrySettingsService: IRegistrySettingsService = {
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
    MOCK_CONFIG = { ...DEFAULT_REGISTRY_SETTINGS };
    persist(MOCK_CONFIG);
    return ok({ ...MOCK_CONFIG });
  },
};
