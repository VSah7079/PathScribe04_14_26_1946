// src/services/historyExtraction/mockHistoryExtractionSettingsService.ts
// Batch 621: browser-storage backed setting. Every change needs config:history-extraction:manage (guardConfigWrites, audited).
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import type { IHistoryExtractionSettingsService } from './IHistoryExtractionSettingsService';
import { validateSetting, type HistoryExtractionSetting } from './historyExtraction';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

export const HISTORY_EXTRACTION_SETTINGS_KEY = 'history_extraction_settings_v1';

const load = () => storageGet<HistoryExtractionSetting[]>(HISTORY_EXTRACTION_SETTINGS_KEY, []);
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });

const unchecked: IHistoryExtractionSettingsService = {
  async getAll() { return ok(load()); },
  async getForFacility(facilityId) { return ok(load().find(s => s.facilityId === facilityId) ?? null); },
  async set(input) {
    const problems = validateSetting(input);
    if (problems.length) return err(`Setting refused: ${problems.join(', ')}`);
    const all = load();
    const existing = all.find(s => s.facilityId === input.facilityId);
    const saved: HistoryExtractionSetting = {
      id: existing?.id ?? `hx-${input.facilityId ?? 'enterprise'}`, facilityId: input.facilityId, enabled: input.enabled, updatedAt: new Date().toISOString(),
    };
    storageSet(HISTORY_EXTRACTION_SETTINGS_KEY, existing ? all.map(s => (s.id === saved.id ? saved : s)) : [...all, saved]);
    return ok(saved);
  },
  async remove(facilityId) {
    const all = load();
    if (!all.some(s => s.facilityId === facilityId)) return err('NOT_FOUND');
    storageSet(HISTORY_EXTRACTION_SETTINGS_KEY, all.filter(s => s.facilityId !== facilityId));
    return ok(undefined as void);
  },
};

export const mockHistoryExtractionSettingsService: IHistoryExtractionSettingsService = guardConfigWrites(unchecked, [
  ['config:history-extraction:manage', ['set', 'remove']],
]);
