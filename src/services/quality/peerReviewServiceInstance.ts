// src/services/quality/peerReviewServiceInstance.ts
// Batch 617 (PS-514): the app's peerReview service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpPeerReviewService } from './httpPeerReviewService';
import { mockPeerReviewService } from './mockPeerReviewService';
import type { IPeerReviewService } from './peerReviewService';

export const peerReviewService: IPeerReviewService = chooseService<IPeerReviewService>('quality', mockPeerReviewService, createHttpPeerReviewService);
