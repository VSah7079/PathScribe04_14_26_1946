// src/services/coding/codeSystemPolicyServiceInstance.ts
// Batch 617 (PS-514): the app's codeSystemPolicyService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCodeSystemPolicyService } from './httpCodeSystemPolicyService';
import { mockCodeSystemPolicyService } from './mockCodeSystemPolicyService';
import type { ICodeSystemPolicyService } from './codeSystemPolicyService';

export const codeSystemPolicyService: ICodeSystemPolicyService = chooseService<ICodeSystemPolicyService>('coding', mockCodeSystemPolicyService, createHttpCodeSystemPolicyService);
