// src/services/referral/referralTrackingServiceInstance.ts
// Batch 617 (PS-514): the app's referralTracking service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpReferralTrackingService } from './httpReferralTrackingService';
import { mockReferralTrackingService } from './mockReferralTrackingService';
import type { IReferralTrackingService } from './IReferralTrackingService';

export const referralTrackingService: IReferralTrackingService = chooseService<IReferralTrackingService>('referral', mockReferralTrackingService, createHttpReferralTrackingService);
