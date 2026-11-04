// src/services/cytology/cytologyRegistrySettingsServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyRegistrySettings service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyRegistrySettingsService } from './httpCytologyRegistrySettingsService';
import { mockCytologyRegistrySettingsService } from './mockCytologyRegistrySettingsService';
import type { ICytologyRegistrySettingsService } from './ICytologyRegistrySettingsService';

export const cytologyRegistrySettingsService: ICytologyRegistrySettingsService = chooseService<ICytologyRegistrySettingsService>('cytology', mockCytologyRegistrySettingsService, createHttpCytologyRegistrySettingsService);
