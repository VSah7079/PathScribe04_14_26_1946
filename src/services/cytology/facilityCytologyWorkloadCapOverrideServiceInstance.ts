// src/services/cytology/facilityCytologyWorkloadCapOverrideServiceInstance.ts
// Batch 616 (PS-499): the app's facilityCytologyWorkloadCapOverride service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFacilityCytologyWorkloadCapOverrideService } from './httpFacilityCytologyWorkloadCapOverrideService';
import { mockFacilityCytologyWorkloadCapOverrideService } from './mockFacilityCytologyWorkloadCapOverrideService';
import type { IFacilityCytologyWorkloadCapOverrideService } from './IFacilityCytologyWorkloadCapOverrideService';

export const facilityCytologyWorkloadCapOverrideService: IFacilityCytologyWorkloadCapOverrideService = chooseService<IFacilityCytologyWorkloadCapOverrideService>('cytology', mockFacilityCytologyWorkloadCapOverrideService, createHttpFacilityCytologyWorkloadCapOverrideService);
