// src/services/cytologyQc/cytologyQcRuleServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyQcRule service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyQcRuleService } from './httpCytologyQcRuleService';
import { mockCytologyQcRuleService } from './mockCytologyQcRuleService';
import type { ICytologyQcRuleService } from './ICytologyQcRuleService';

export const cytologyQcRuleService: ICytologyQcRuleService = chooseService<ICytologyQcRuleService>('cytologyQc', mockCytologyQcRuleService, createHttpCytologyQcRuleService);
