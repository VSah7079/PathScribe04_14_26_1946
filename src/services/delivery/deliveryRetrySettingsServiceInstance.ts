// src/services/delivery/deliveryRetrySettingsServiceInstance.ts
// Batch 617 (PS-514): the app's deliveryRetrySettings service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpDeliveryRetrySettingsService } from './httpDeliveryRetrySettingsService';
import { mockDeliveryRetrySettingsService } from './mockDeliveryRetrySettingsService';
import type { IDeliveryRetrySettingsService } from './IDeliveryRetrySettingsService';

export const deliveryRetrySettingsService: IDeliveryRetrySettingsService = chooseService<IDeliveryRetrySettingsService>('delivery', mockDeliveryRetrySettingsService, createHttpDeliveryRetrySettingsService);
