// src/services/referral/referralOutboundQueueServiceInstance.ts
// Batch 672 (wiring step 3): the app's referralOutboundQueueService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpReferralOutboundQueueService } from './httpReferralOutboundQueueService';
import { mockReferralOutboundQueueService } from './mockReferralOutboundQueueService';
import type { IReferralOutboundQueueService } from './IReferralOutboundQueueService';

export const referralOutboundQueueService: IReferralOutboundQueueService = chooseService<IReferralOutboundQueueService>('referral', mockReferralOutboundQueueService, createHttpReferralOutboundQueueService);
