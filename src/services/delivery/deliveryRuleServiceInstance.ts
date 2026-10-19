// src/services/delivery/deliveryRuleServiceInstance.ts
// Batch 617 (PS-514): the app's deliveryRule service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpDeliveryRuleService } from './httpDeliveryRuleService';
import { mockDeliveryRuleService } from './mockDeliveryRuleService';
import type { IDeliveryRuleService } from './IDeliveryRuleService';

export const deliveryRuleService: IDeliveryRuleService = chooseService<IDeliveryRuleService>('delivery', mockDeliveryRuleService, createHttpDeliveryRuleService);
