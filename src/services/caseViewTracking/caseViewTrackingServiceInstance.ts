// src/services/caseViewTracking/caseViewTrackingServiceInstance.ts
// Batch 617 (PS-514): the app's caseViewTrackingService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCaseViewTrackingService } from './httpCaseViewTrackingService';
import { mockCaseViewTrackingService } from './mockCaseViewTrackingService';
import type { ICaseViewTrackingService } from './ICaseViewTrackingService';

export const caseViewTrackingService: ICaseViewTrackingService = chooseService<ICaseViewTrackingService>('caseViewTracking', mockCaseViewTrackingService, createHttpCaseViewTrackingService);
