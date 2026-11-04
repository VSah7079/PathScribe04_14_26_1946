// src/services/quality/qaTrendPolicyServiceInstance.ts
// Batch 617 (PS-514): the app's qaTrendPolicy service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpQaTrendPolicyService } from './httpQaTrendPolicyService';
import { mockQaTrendPolicyService } from './mockQaTrendPolicyService';
import type { IQaTrendPolicyService } from './IQaTrendPolicyService';

export const qaTrendPolicyService: IQaTrendPolicyService = chooseService<IQaTrendPolicyService>('quality', mockQaTrendPolicyService, createHttpQaTrendPolicyService);
