// src/services/qualitySettings/concordanceReviewSettingsServiceInstance.ts
// Batch 617 (PS-514): the app's concordanceReviewSettings service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpConcordanceReviewSettingsService } from './httpConcordanceReviewSettingsService';
import { mockConcordanceReviewSettingsService } from './mockConcordanceReviewSettingsService';
import type { IConcordanceReviewSettingsService } from './IConcordanceReviewSettingsService';

export const concordanceReviewSettingsService: IConcordanceReviewSettingsService = chooseService<IConcordanceReviewSettingsService>('qualitySettings', mockConcordanceReviewSettingsService, createHttpConcordanceReviewSettingsService);
