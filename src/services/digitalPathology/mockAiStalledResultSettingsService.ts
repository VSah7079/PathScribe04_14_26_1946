// src/services/digitalPathology/mockAiStalledResultSettingsService.ts
// Batch 610 (#78). The stalled-result timeout, kept like the other mock settings and guarded like the AI vendor list.
import type { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import type { IAiStalledResultSettingsService } from './IAiStalledResultSettingsService';
import { AI_STALLED_TIMEOUT_DEFAULT_HOURS, validateAiStalledTimeoutHours, type AiStalledResultSettings } from './aiStalledResultRule';

const KEY = 'ai_stalled_result_settings';
const DEFAULTS: AiStalledResultSettings = { timeoutHours: AI_STALLED_TIMEOUT_DEFAULT_HOURS };

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

const unchecked: IAiStalledResultSettingsService = {
  async get() { return ok({ ...DEFAULTS, ...storageGet<Partial<AiStalledResultSettings>>(KEY, {}) }); },
  async update(changes) {
    if (changes.timeoutHours !== undefined) {
      const problem = validateAiStalledTimeoutHours(changes.timeoutHours);
      if (problem) return { ok: false, error: problem };
    }
    const next: AiStalledResultSettings = { ...DEFAULTS, ...storageGet<Partial<AiStalledResultSettings>>(KEY, {}), ...changes };
    storageSet(KEY, next);
    return ok({ ...next });
  },
};

export const mockAiStalledResultSettingsService: IAiStalledResultSettingsService = guardConfigWrites(unchecked, [
  ['config:vendor-integrations:manage', ['update']],
]);
