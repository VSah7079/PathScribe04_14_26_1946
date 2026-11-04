// src/services/billing/codeReviewPoolServiceInstance.ts
// Batch 616 (PS-498): the app's codeReviewPool service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCodeReviewPoolService } from './httpCodeReviewPoolService';
import { mockCodeReviewPoolService } from './mockCodeReviewPoolService';
import type { ICodeReviewPoolService } from './ICodeReviewPoolService';

export const codeReviewPoolService: ICodeReviewPoolService = chooseService<ICodeReviewPoolService>('billing', mockCodeReviewPoolService, createHttpCodeReviewPoolService);
