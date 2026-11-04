// src/services/cytology/facilityCytologyInstrumentationOverrideServiceInstance.ts
// Batch 616 (PS-499): the app's facilityCytologyInstrumentationOverride service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFacilityCytologyInstrumentationOverrideService } from './httpFacilityCytologyInstrumentationOverrideService';
import { mockFacilityCytologyInstrumentationOverrideService } from './mockFacilityCytologyInstrumentationOverrideService';
import type { IFacilityCytologyInstrumentationOverrideService } from './IFacilityCytologyInstrumentationOverrideService';

export const facilityCytologyInstrumentationOverrideService: IFacilityCytologyInstrumentationOverrideService = chooseService<IFacilityCytologyInstrumentationOverrideService>('cytology', mockFacilityCytologyInstrumentationOverrideService, createHttpFacilityCytologyInstrumentationOverrideService);
