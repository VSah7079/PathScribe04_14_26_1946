// src/services/cytology/facilityCytologyHistologyCorrelationOverrideServiceInstance.ts
// Batch 616 (PS-499): the app's facilityCytologyHistologyCorrelationOverride service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFacilityCytologyHistologyCorrelationOverrideService } from './httpFacilityCytologyHistologyCorrelationOverrideService';
import { mockFacilityCytologyHistologyCorrelationOverrideService } from './mockCytologyHistologyCorrelationSettingsService';
import type { IFacilityCytologyHistologyCorrelationOverrideService } from './ICytologyHistologyCorrelationSettingsService';

export const facilityCytologyHistologyCorrelationOverrideService: IFacilityCytologyHistologyCorrelationOverrideService = chooseService<IFacilityCytologyHistologyCorrelationOverrideService>('cytology', mockFacilityCytologyHistologyCorrelationOverrideService, createHttpFacilityCytologyHistologyCorrelationOverrideService);
