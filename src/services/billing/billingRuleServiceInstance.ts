// src/services/billing/billingRuleServiceInstance.ts
// Batch 616 (PS-498): the app's billingRule service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpBillingRuleService } from './httpBillingRuleService';
import { mockBillingRuleService } from './mockBillingRuleService';
import type { IBillingRuleService } from './IBillingRuleService';

export const billingRuleService: IBillingRuleService = chooseService<IBillingRuleService>('billing', mockBillingRuleService, createHttpBillingRuleService);
