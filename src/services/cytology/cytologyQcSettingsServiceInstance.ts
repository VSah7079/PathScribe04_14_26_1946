// src/services/cytology/cytologyQcSettingsServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyQcSettings service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyQcSettingsService } from './httpCytologyQcSettingsService';
import { mockCytologyQcSettingsService } from './mockCytologyQcSettingsService';
import type { ICytologyQcSettingsService } from './ICytologyQcSettingsService';

export const cytologyQcSettingsService: ICytologyQcSettingsService = chooseService<ICytologyQcSettingsService>('cytology', mockCytologyQcSettingsService, createHttpCytologyQcSettingsService);
