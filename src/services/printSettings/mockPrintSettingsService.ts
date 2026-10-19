// src/services/printSettings/mockPrintSettingsService.ts
import { IPrintSettingsService, PrintSettingsConfig, DEFAULT_PRINT_SETTINGS_CONFIG } from './IPrintSettingsService';
import { storageGet, storageSet } from '../mockStorage';
import { ServiceResult } from '../types';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

const load    = () => ({ ...DEFAULT_PRINT_SETTINGS_CONFIG, ...storageGet<PrintSettingsConfig>('printSettings', DEFAULT_PRINT_SETTINGS_CONFIG) });
const persist = (d: PrintSettingsConfig) => storageSet('printSettings', d);
let MOCK_CONFIG: PrintSettingsConfig = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const delay = () => new Promise(r => setTimeout(r, 80));

const printSettingsServiceUnchecked: IPrintSettingsService = {
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
    MOCK_CONFIG = { ...DEFAULT_PRINT_SETTINGS_CONFIG };
    persist(MOCK_CONFIG);
    return ok({ ...MOCK_CONFIG });
  },
};

/** Batch 428: every change needs its Configuration capability (guardConfigWrites). */
export const mockPrintSettingsService: IPrintSettingsService = guardConfigWrites(printSettingsServiceUnchecked, [
  ['config:print-settings:manage', ['update', 'reset']],
]);
