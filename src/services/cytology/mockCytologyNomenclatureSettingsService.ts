// src/services/cytology/mockCytologyNomenclatureSettingsService.ts
import { ICytologyNomenclatureSettingsService, CytologyNomenclatureSettingsConfig, DEFAULT_CYTOLOGY_NOMENCLATURE_SETTINGS } from './ICytologyNomenclatureSettingsService';
import { storageGet, storageSet } from '../mockStorage';
import { ServiceResult } from '../types';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

const STORAGE_KEY = 'cytologyNomenclatureSettings';

const load    = () => storageGet<CytologyNomenclatureSettingsConfig>(STORAGE_KEY, DEFAULT_CYTOLOGY_NOMENCLATURE_SETTINGS);
const persist = (d: CytologyNomenclatureSettingsConfig) => storageSet(STORAGE_KEY, d);
let MOCK_CONFIG: CytologyNomenclatureSettingsConfig = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const delay = () => new Promise(r => setTimeout(r, 60));

const cytologyNomenclatureSettingsServiceUnchecked: ICytologyNomenclatureSettingsService = {
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
    MOCK_CONFIG = { ...DEFAULT_CYTOLOGY_NOMENCLATURE_SETTINGS };
    persist(MOCK_CONFIG);
    return ok({ ...MOCK_CONFIG });
  },
};

/** Batch 428: every change needs its Configuration capability (guardConfigWrites). */
export const mockCytologyNomenclatureSettingsService: ICytologyNomenclatureSettingsService = guardConfigWrites(cytologyNomenclatureSettingsServiceUnchecked, [
  ['config:cytology-nomenclature:manage', ['update', 'reset']],
]);
