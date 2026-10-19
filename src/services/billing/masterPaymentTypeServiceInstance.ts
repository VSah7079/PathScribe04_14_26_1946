// src/services/billing/masterPaymentTypeServiceInstance.ts
// Batch 616 (PS-498): the app's masterPaymentType service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpMasterPaymentTypeService } from './httpMasterPaymentTypeService';
import { mockMasterPaymentTypeService } from './mockMasterPaymentTypeService';
import type { IMasterPaymentTypeService } from './IMasterPaymentTypeService';

export const masterPaymentTypeService: IMasterPaymentTypeService = chooseService<IMasterPaymentTypeService>('billing', mockMasterPaymentTypeService, createHttpMasterPaymentTypeService);
