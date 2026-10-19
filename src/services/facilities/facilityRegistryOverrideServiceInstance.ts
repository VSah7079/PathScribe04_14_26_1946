// src/services/facilities/facilityRegistryOverrideServiceInstance.ts
// Batch 616 (PS-484): the app's facilityRegistryOverrideService, exported from `@/services`.
// The mock in the demo; the API server's with an address (docs/architecture/HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFacilityRegistryOverrideService } from './httpRegistrySettingsService';
import { mockFacilityRegistryOverrideService } from './mockFacilityRegistryOverrideService';
import type { IFacilityRegistryOverrideService } from './IFacilityRegistryOverrideService';

export const facilityRegistryOverrideService: IFacilityRegistryOverrideService = chooseService<IFacilityRegistryOverrideService>('facilities', mockFacilityRegistryOverrideService, createHttpFacilityRegistryOverrideService);
