// src/services/locations/locationServiceInstance.ts
// Batch 616 (PS-507): the app's locationService, exported from `@/services`.
// The mock in the demo; the API server's with an address (docs/architecture/HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpLocationService } from './httpLocationService';
import { mockLocationService } from './mockLocationService';
import type { ILocationService } from './ILocationService';

export const locationService: ILocationService = chooseService<ILocationService>('locations', mockLocationService, createHttpLocationService);
