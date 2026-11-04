// src/services/cytology/cytologyReviewRecordServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyReviewRecord service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyReviewRecordService } from './httpCytologyReviewRecordService';
import { mockCytologyReviewRecordService } from './mockCytologyReviewRecordService';
import type { ICytologyReviewRecordService } from './ICytologyReviewRecordService';

export const cytologyReviewRecordService: ICytologyReviewRecordService = chooseService<ICytologyReviewRecordService>('cytology', mockCytologyReviewRecordService, createHttpCytologyReviewRecordService);
