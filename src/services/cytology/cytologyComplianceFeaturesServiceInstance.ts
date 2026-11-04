// src/services/cytology/cytologyComplianceFeaturesServiceInstance.ts
// Batch 617 (PS-514): the app's cytologyComplianceFeaturesService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyComplianceFeaturesService } from './httpCytologyComplianceFeaturesService';
import { mockCytologyComplianceFeaturesService } from './mockCytologyComplianceFeaturesService';
import type { ICytologyComplianceFeaturesService } from './ICytologyComplianceFeaturesService';

export const cytologyComplianceFeaturesService: ICytologyComplianceFeaturesService = chooseService<ICytologyComplianceFeaturesService>('cytology', mockCytologyComplianceFeaturesService, createHttpCytologyComplianceFeaturesService);
