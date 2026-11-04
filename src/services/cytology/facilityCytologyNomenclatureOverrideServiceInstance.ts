// src/services/cytology/facilityCytologyNomenclatureOverrideServiceInstance.ts
// Batch 616 (PS-499): the app's facilityCytologyNomenclatureOverride service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFacilityCytologyNomenclatureOverrideService } from './httpFacilityCytologyNomenclatureOverrideService';
import { mockFacilityCytologyNomenclatureOverrideService } from './mockFacilityCytologyNomenclatureOverrideService';
import type { IFacilityCytologyNomenclatureOverrideService } from './IFacilityCytologyNomenclatureOverrideService';

export const facilityCytologyNomenclatureOverrideService: IFacilityCytologyNomenclatureOverrideService = chooseService<IFacilityCytologyNomenclatureOverrideService>('cytology', mockFacilityCytologyNomenclatureOverrideService, createHttpFacilityCytologyNomenclatureOverrideService);
