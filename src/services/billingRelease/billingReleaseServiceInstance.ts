// src/services/billingRelease/billingReleaseServiceInstance.ts
// Batch 619 (PS-800): the app's billing release rules, exported from `@/services` as `billingReleaseService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpBillingReleaseService } from './httpBillingReleaseService';
import { mockBillingReleaseService } from './mockBillingReleaseService';
import type { IBillingReleaseService } from './IBillingReleaseService';

export const billingReleaseService: IBillingReleaseService = chooseService<IBillingReleaseService>('billingRelease', mockBillingReleaseService, createHttpBillingReleaseService);
