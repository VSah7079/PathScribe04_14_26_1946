// src/services/cytology/cytologyWorkloadCapSettingsServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyWorkloadCapSettings service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyWorkloadCapSettingsService } from './httpCytologyWorkloadCapSettingsService';
import { mockCytologyWorkloadCapSettingsService } from './mockCytologyWorkloadCapSettingsService';
import type { ICytologyWorkloadCapSettingsService } from './ICytologyWorkloadCapSettingsService';

export const cytologyWorkloadCapSettingsService: ICytologyWorkloadCapSettingsService = chooseService<ICytologyWorkloadCapSettingsService>('cytology', mockCytologyWorkloadCapSettingsService, createHttpCytologyWorkloadCapSettingsService);
