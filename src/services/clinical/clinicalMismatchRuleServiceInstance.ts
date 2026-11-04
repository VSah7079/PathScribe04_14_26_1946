// src/services/clinical/clinicalMismatchRuleServiceInstance.ts
// Batch 617 (PS-514): the app's clinicalMismatchRuleService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpClinicalMismatchRuleService } from './httpClinicalMismatchRuleService';
import { mockClinicalMismatchRuleService } from './mockClinicalMismatchRuleService';
import type { IClinicalMismatchRuleService } from './clinicalMismatchRuleService';

export const clinicalMismatchRuleService: IClinicalMismatchRuleService = chooseService<IClinicalMismatchRuleService>('clinical', mockClinicalMismatchRuleService, createHttpClinicalMismatchRuleService);
