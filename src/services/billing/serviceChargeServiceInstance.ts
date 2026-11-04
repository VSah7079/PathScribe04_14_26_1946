// src/services/billing/serviceChargeServiceInstance.ts
// Batch 616 (PS-498): the app's serviceCharge service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpServiceChargeService } from './httpServiceChargeService';
import { mockServiceChargeService } from './mockServiceChargeService';
import type { IServiceChargeService } from './IServiceChargeService';

export const serviceChargeService: IServiceChargeService = chooseService<IServiceChargeService>('billing', mockServiceChargeService, createHttpServiceChargeService);
