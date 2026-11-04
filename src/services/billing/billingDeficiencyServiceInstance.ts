// src/services/billing/billingDeficiencyServiceInstance.ts
// Batch 616 (PS-498): the app's billingDeficiency service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpBillingDeficiencyService } from './httpBillingDeficiencyService';
import { mockBillingDeficiencyService } from './mockBillingDeficiencyService';
import type { IBillingDeficiencyService } from './IBillingDeficiencyService';

export const billingDeficiencyService: IBillingDeficiencyService = chooseService<IBillingDeficiencyService>('billing', mockBillingDeficiencyService, createHttpBillingDeficiencyService);
