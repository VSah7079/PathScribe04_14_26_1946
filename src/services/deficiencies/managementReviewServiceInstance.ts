// src/services/deficiencies/managementReviewServiceInstance.ts
// Batch 616: the app's management reviews, exported from `@/services` as `managementReviewService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpManagementReviewService } from './httpManagementReviewService';
import { mockManagementReviewService } from './mockManagementReviewService';
import type { IManagementReviewService } from './IDeficiencyService';

export const managementReviewService: IManagementReviewService = chooseService<IManagementReviewService>('deficiencies', mockManagementReviewService, createHttpManagementReviewService);
