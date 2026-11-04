// src/services/facilities/facilityServiceInstance.ts
// Batch 616 (PS-484): the app's facilityService, exported from `@/services`.
// The mock in the demo; the API server's with an address (docs/architecture/HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFacilityService } from './httpFacilityService';
import { mockFacilityService } from './mockFacilityService';
import type { IFacilityService } from './IFacilityService';

export const facilityService: IFacilityService = chooseService<IFacilityService>('facilities', mockFacilityService, createHttpFacilityService);
