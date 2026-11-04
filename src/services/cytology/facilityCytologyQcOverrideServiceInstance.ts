// src/services/cytology/facilityCytologyQcOverrideServiceInstance.ts
// Batch 616 (PS-499): the app's facilityCytologyQcOverride service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFacilityCytologyQcOverrideService } from './httpFacilityCytologyQcOverrideService';
import { mockFacilityCytologyQcOverrideService } from './mockFacilityCytologyQcOverrideService';
import type { IFacilityCytologyQcOverrideService } from './IFacilityCytologyQcOverrideService';

export const facilityCytologyQcOverrideService: IFacilityCytologyQcOverrideService = chooseService<IFacilityCytologyQcOverrideService>('cytology', mockFacilityCytologyQcOverrideService, createHttpFacilityCytologyQcOverrideService);
