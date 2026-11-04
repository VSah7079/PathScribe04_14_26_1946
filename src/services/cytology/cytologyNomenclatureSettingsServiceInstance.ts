// src/services/cytology/cytologyNomenclatureSettingsServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyNomenclatureSettings service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyNomenclatureSettingsService } from './httpCytologyNomenclatureSettingsService';
import { mockCytologyNomenclatureSettingsService } from './mockCytologyNomenclatureSettingsService';
import type { ICytologyNomenclatureSettingsService } from './ICytologyNomenclatureSettingsService';

export const cytologyNomenclatureSettingsService: ICytologyNomenclatureSettingsService = chooseService<ICytologyNomenclatureSettingsService>('cytology', mockCytologyNomenclatureSettingsService, createHttpCytologyNomenclatureSettingsService);
