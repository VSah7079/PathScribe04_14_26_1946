// src/services/feedback/feedbackSettingsServiceInstance.ts
// Batch 617 (PS-514): the app's feedbackSettings service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFeedbackSettingsService } from './httpFeedbackSettingsService';
import { mockFeedbackSettingsService } from './mockFeedbackSettingsService';
import type { IFeedbackSettingsService } from './IFeedbackSettingsService';

export const feedbackSettingsService: IFeedbackSettingsService = chooseService<IFeedbackSettingsService>('feedback', mockFeedbackSettingsService, createHttpFeedbackSettingsService);
