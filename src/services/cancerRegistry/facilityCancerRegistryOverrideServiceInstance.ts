// src/services/cancerRegistry/facilityCancerRegistryOverrideServiceInstance.ts
// Batch 616 (PS-504): the app's facilityCancerRegistryOverride service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFacilityCancerRegistryOverrideService } from './httpFacilityCancerRegistryOverrideService';
import { mockFacilityCancerRegistryOverrideService } from './mockFacilityCancerRegistryOverrideService';
import type { IFacilityCancerRegistryOverrideService } from './IFacilityCancerRegistryOverrideService';

export const facilityCancerRegistryOverrideService: IFacilityCancerRegistryOverrideService = chooseService<IFacilityCancerRegistryOverrideService>('cancerRegistry', mockFacilityCancerRegistryOverrideService, createHttpFacilityCancerRegistryOverrideService);
