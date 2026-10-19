// src/services/cytology/facilityCytologyRegistryOverrideServiceInstance.ts
// Batch 616 (PS-499): the app's facilityCytologyRegistryOverride service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFacilityCytologyRegistryOverrideService } from './httpFacilityCytologyRegistryOverrideService';
import { mockFacilityCytologyRegistryOverrideService } from './mockFacilityCytologyRegistryOverrideService';
import type { IFacilityCytologyRegistryOverrideService } from './IFacilityCytologyRegistryOverrideService';

export const facilityCytologyRegistryOverrideService: IFacilityCytologyRegistryOverrideService = chooseService<IFacilityCytologyRegistryOverrideService>('cytology', mockFacilityCytologyRegistryOverrideService, createHttpFacilityCytologyRegistryOverrideService);
