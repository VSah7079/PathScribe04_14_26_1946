// src/services/quality/peerReviewSettingsServiceInstance.ts
// Batch 617 (PS-514): the app's peerReviewSettings service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpPeerReviewSettingsService } from './httpPeerReviewSettingsService';
import { mockPeerReviewSettingsService } from './mockPeerReviewSettingsService';
import type { IPeerReviewSettingsService } from './IPeerReviewSettingsService';

export const peerReviewSettingsService: IPeerReviewSettingsService = chooseService<IPeerReviewSettingsService>('quality', mockPeerReviewSettingsService, createHttpPeerReviewSettingsService);
