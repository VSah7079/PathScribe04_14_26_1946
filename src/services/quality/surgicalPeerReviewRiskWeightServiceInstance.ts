// src/services/quality/surgicalPeerReviewRiskWeightServiceInstance.ts
// Batch 616: the app's surgical peer review risk weights, exported from `@/services` as `surgicalPeerReviewRiskWeightService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSurgicalPeerReviewRiskWeightService } from './httpSurgicalPeerReviewRiskWeightService';
import { mockSurgicalPeerReviewRiskWeightService } from './mockSurgicalPeerReviewRiskWeightService';
import type { ISurgicalPeerReviewRiskWeightService } from './ISurgicalPeerReviewRiskWeightService';

export const surgicalPeerReviewRiskWeightService: ISurgicalPeerReviewRiskWeightService = chooseService<ISurgicalPeerReviewRiskWeightService>('qa', mockSurgicalPeerReviewRiskWeightService, createHttpSurgicalPeerReviewRiskWeightService);
