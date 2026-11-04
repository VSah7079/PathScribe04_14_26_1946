// src/services/delivery/deliveryRetryServiceInstance.ts
// Batch 617 (PS-514): the app's deliveryRetry service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpDeliveryRetryService } from './httpDeliveryRetryService';
import { mockDeliveryRetryService } from './mockDeliveryRetryService';
import type { IDeliveryRetryService } from './IDeliveryRetryService';

export const deliveryRetryService: IDeliveryRetryService = chooseService<IDeliveryRetryService>('delivery', mockDeliveryRetryService, createHttpDeliveryRetryService);
