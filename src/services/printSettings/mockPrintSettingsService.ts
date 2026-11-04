// src/services/printSettings/mockPrintSettingsService.ts
import { IPrintSettingsService, PrintSettingsConfig, DEFAULT_PRINT_SETTINGS_CONFIG } from './IPrintSettingsService';
import { storageGet, storageSet } from '../mockStorage';
import { ServiceResult } from '../types';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

// Batch 738 (Pete, Demo Seed Data S3): the demo prints labels with a GS1 restricted-circulation GTIN (GS1 prefix 02,
// numbers a GS1 Member Organisation reserves for use inside one organisation, never in the open supply chain), so a
// cassette or slide label is not refused with "No GS1 GTIN configured". It is not ForMedrixAI's GTIN and not a
// registered one; the product default (IPrintSettingsService) stays empty, and a lab enters its own in Print Settings.
export const DEMO_RESTRICTED_CIRCULATION_GTIN = '0299990000101';
const DEMO_DEFAULTS: PrintSettingsConfig = { ...DEFAULT_PRINT_SETTINGS_CONFIG, gs1Gtin: DEMO_RESTRICTED_CIRCULATION_GTIN };

const load    = () => ({ ...DEMO_DEFAULTS, ...storageGet<PrintSettingsConfig>('printSettings', DEMO_DEFAULTS) });
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
    MOCK_CONFIG = { ...DEMO_DEFAULTS };
    persist(MOCK_CONFIG);
    return ok({ ...MOCK_CONFIG });
  },
};

/** Batch 428: every change needs its Configuration capability (guardConfigWrites). */
export const mockPrintSettingsService: IPrintSettingsService = guardConfigWrites(printSettingsServiceUnchecked, [
  ['config:print-settings:manage', ['update', 'reset']],
]);
