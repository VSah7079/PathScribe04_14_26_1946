// src/services/delivery/mockDeliveryRetrySettingsService.ts
// Batch 521 (PS-281): the lab's delivery retry delays, browser-storage backed. Saving needs
// config:delivery-rules:manage (guardConfigWrites, audited), like the delivery rules.
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import type { IDeliveryRetrySettingsService } from './IDeliveryRetrySettingsService';
import { DEFAULT_RETRY_DELAYS_MINUTES, retrySettingsProblem, type DeliveryRetrySettings } from './deliveryRetryPolicy';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

export const DELIVERY_RETRY_SETTINGS_KEY = 'delivery_retry_settings_v1';

const unchecked: IDeliveryRetrySettingsService = {
  async get(): Promise<ServiceResult<DeliveryRetrySettings>> {
    const stored = storageGet<DeliveryRetrySettings | null>(DELIVERY_RETRY_SETTINGS_KEY, null);
    const delays = stored && Array.isArray(stored.delaysMinutes) && !retrySettingsProblem(stored.delaysMinutes) ? stored.delaysMinutes : [...DEFAULT_RETRY_DELAYS_MINUTES];
    return { ok: true, data: { delaysMinutes: delays } };
  },
  async save(settings) {
    const problem = retrySettingsProblem(settings.delaysMinutes);
    if (problem) return { ok: false, error: `Retry delays refused: ${problem}` };
    const data = { delaysMinutes: [...settings.delaysMinutes] };
    storageSet(DELIVERY_RETRY_SETTINGS_KEY, data);
    return { ok: true, data };
  },
};

export const mockDeliveryRetrySettingsService: IDeliveryRetrySettingsService = guardConfigWrites(unchecked, [
  ['config:delivery-rules:manage', ['save']],
]);
