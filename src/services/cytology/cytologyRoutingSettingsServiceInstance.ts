// src/services/cytology/cytologyRoutingSettingsServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyRoutingSettings service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyRoutingSettingsService } from './httpCytologyRoutingSettingsService';
import { mockCytologyRoutingSettingsService } from './mockCytologyRoutingSettingsService';
import type { ICytologyRoutingSettingsService } from './ICytologyRoutingSettingsService';

export const cytologyRoutingSettingsService: ICytologyRoutingSettingsService = chooseService<ICytologyRoutingSettingsService>('cytology', mockCytologyRoutingSettingsService, createHttpCytologyRoutingSettingsService);
