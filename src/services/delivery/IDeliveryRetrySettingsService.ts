// src/services/delivery/IDeliveryRetrySettingsService.ts
// Batch 521 (PS-281): the lab's delivery retry delays (deliveryRetryPolicy.ts).
import type { ServiceResult } from '../types';
import type { DeliveryRetrySettings } from './deliveryRetryPolicy';

export interface IDeliveryRetrySettingsService {
  get(): Promise<ServiceResult<DeliveryRetrySettings>>;
  /** Needs config:delivery-rules:manage. Refuses delays retrySettingsProblem() rejects. */
  save(settings: DeliveryRetrySettings): Promise<ServiceResult<DeliveryRetrySettings>>;
}
