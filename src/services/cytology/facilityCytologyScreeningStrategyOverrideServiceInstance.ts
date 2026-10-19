// src/services/cytology/facilityCytologyScreeningStrategyOverrideServiceInstance.ts
// Batch 616 (PS-499): the app's facilityCytologyScreeningStrategyOverride service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFacilityCytologyScreeningStrategyOverrideService } from './httpFacilityCytologyScreeningStrategyOverrideService';
import { mockFacilityCytologyScreeningStrategyOverrideService } from './mockFacilityCytologyScreeningStrategyOverrideService';
import type { IFacilityCytologyScreeningStrategyOverrideService } from './IFacilityCytologyScreeningStrategyOverrideService';

export const facilityCytologyScreeningStrategyOverrideService: IFacilityCytologyScreeningStrategyOverrideService = chooseService<IFacilityCytologyScreeningStrategyOverrideService>('cytology', mockFacilityCytologyScreeningStrategyOverrideService, createHttpFacilityCytologyScreeningStrategyOverrideService);
