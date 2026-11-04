// src/services/billing/jurisdictionPaymentMappingServiceInstance.ts
// Batch 616 (PS-498): the app's jurisdictionPaymentMapping service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpJurisdictionPaymentMappingService } from './httpJurisdictionPaymentMappingService';
import { mockJurisdictionPaymentMappingService } from './mockJurisdictionPaymentMappingService';
import type { IJurisdictionPaymentMappingService } from './IJurisdictionPaymentMappingService';

export const jurisdictionPaymentMappingService: IJurisdictionPaymentMappingService = chooseService<IJurisdictionPaymentMappingService>('billing', mockJurisdictionPaymentMappingService, createHttpJurisdictionPaymentMappingService);
