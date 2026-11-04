// src/services/aiIntegration/aiVendorPolicyServiceInstance.ts
// Batch 616: the app's ai vendor policy (allowed services and regions per jurisdiction) service, exported from `@/services` as `aiVendorPolicyService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpAiVendorPolicyService } from './httpAiVendorPolicyService';
import { mockAiVendorPolicyService } from './mockAiVendorPolicyService';
import type { IAiVendorPolicyService } from './aiVendorPolicyService';

export const aiVendorPolicyService: IAiVendorPolicyService = chooseService<IAiVendorPolicyService>('ai-vendor-policy', mockAiVendorPolicyService, createHttpAiVendorPolicyService);
