// src/services/tumorBoardRules/tumorBoardRuleServiceInstance.ts
// Batch 617 (PS-514): the app's tumorBoardRule service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpTumorBoardRuleService } from './httpTumorBoardRuleService';
import { mockTumorBoardRuleService } from './mockTumorBoardRuleService';
import type { ITumorBoardRuleService } from './ITumorBoardRuleService';

export const tumorBoardRuleService: ITumorBoardRuleService = chooseService<ITumorBoardRuleService>('tumorBoardRules', mockTumorBoardRuleService, createHttpTumorBoardRuleService);
