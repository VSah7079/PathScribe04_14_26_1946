// src/services/cytology/mockCytologyScreeningStrategyService.ts
import { ICytologyScreeningStrategyService, CytologyScreeningStrategyConfig, DEFAULT_CYTOLOGY_SCREENING_STRATEGY } from './ICytologyScreeningStrategyService';
import { storageGet, storageSet } from '../mockStorage';
import { ServiceResult } from '../types';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

const STORAGE_KEY = 'cytologyScreeningStrategy';

const load    = () => storageGet<CytologyScreeningStrategyConfig>(STORAGE_KEY, DEFAULT_CYTOLOGY_SCREENING_STRATEGY);
const persist = (d: CytologyScreeningStrategyConfig) => storageSet(STORAGE_KEY, d);
let MOCK_CONFIG: CytologyScreeningStrategyConfig = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const delay = () => new Promise(r => setTimeout(r, 60));

const cytologyScreeningStrategyServiceUnchecked: ICytologyScreeningStrategyService = {
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
    MOCK_CONFIG = { ...DEFAULT_CYTOLOGY_SCREENING_STRATEGY };
    persist(MOCK_CONFIG);
    return ok({ ...MOCK_CONFIG });
  },
};

/** Batch 428: every change needs its Configuration capability (guardConfigWrites). */
export const mockCytologyScreeningStrategyService: ICytologyScreeningStrategyService = guardConfigWrites(cytologyScreeningStrategyServiceUnchecked, [
  ['config:cytology-screening-strategy:manage', ['update', 'reset']],
]);
