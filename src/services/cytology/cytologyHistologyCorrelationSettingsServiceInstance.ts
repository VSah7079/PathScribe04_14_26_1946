// src/services/cytology/cytologyHistologyCorrelationSettingsServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyHistologyCorrelationSettings service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyHistologyCorrelationSettingsService } from './httpCytologyHistologyCorrelationSettingsService';
import { mockCytologyHistologyCorrelationSettingsService } from './mockCytologyHistologyCorrelationSettingsService';
import type { ICytologyHistologyCorrelationSettingsService } from './ICytologyHistologyCorrelationSettingsService';

export const cytologyHistologyCorrelationSettingsService: ICytologyHistologyCorrelationSettingsService = chooseService<ICytologyHistologyCorrelationSettingsService>('cytology', mockCytologyHistologyCorrelationSettingsService, createHttpCytologyHistologyCorrelationSettingsService);
