// src/services/quality/capaRecommendationServiceInstance.ts
// Batch 617 (PS-514): the app's capaRecommendation service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCapaRecommendationService } from './httpCapaRecommendationService';
import { mockCapaRecommendationService } from './mockCapaRecommendationService';
import type { ICapaRecommendationService } from './capaRecommendationService';

export const capaRecommendationService: ICapaRecommendationService = chooseService<ICapaRecommendationService>('quality', mockCapaRecommendationService, createHttpCapaRecommendationService);
