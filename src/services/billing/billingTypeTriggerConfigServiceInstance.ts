// src/services/billing/billingTypeTriggerConfigServiceInstance.ts
// Batch 617 (PS-514): the app's billingTypeTriggerConfigService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpBillingTypeTriggerConfigService } from './httpBillingTypeTriggerConfigService';
import { mockBillingTypeTriggerConfigService } from './mockBillingTypeTriggerConfigService';
import type { IBillingTypeTriggerConfigService } from './mockBillingTypeTriggerConfigService';

export const billingTypeTriggerConfigService: IBillingTypeTriggerConfigService = chooseService<IBillingTypeTriggerConfigService>('billing', mockBillingTypeTriggerConfigService, createHttpBillingTypeTriggerConfigService);
