// src/services/cytology/facilityCytologyRoutingOverrideServiceInstance.ts
// Batch 616 (PS-499): the app's facilityCytologyRoutingOverride service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFacilityCytologyRoutingOverrideService } from './httpFacilityCytologyRoutingOverrideService';
import { mockFacilityCytologyRoutingOverrideService } from './mockFacilityCytologyRoutingOverrideService';
import type { IFacilityCytologyRoutingOverrideService } from './IFacilityCytologyRoutingOverrideService';

export const facilityCytologyRoutingOverrideService: IFacilityCytologyRoutingOverrideService = chooseService<IFacilityCytologyRoutingOverrideService>('cytology', mockFacilityCytologyRoutingOverrideService, createHttpFacilityCytologyRoutingOverrideService);
