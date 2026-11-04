// src/services/tumorBoardRules/tumorBoardCriteriaRuleServiceInstance.ts
// Batch 617 (PS-514): the app's tumorBoardCriteriaRule service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpTumorBoardCriteriaRuleService } from './httpTumorBoardCriteriaRuleService';
import { mockTumorBoardCriteriaRuleService } from './mockTumorBoardRuleService';
import type { ITumorBoardCriteriaRuleService } from './ITumorBoardRuleService';

export const tumorBoardCriteriaRuleService: ITumorBoardCriteriaRuleService = chooseService<ITumorBoardCriteriaRuleService>('tumorBoardRules', mockTumorBoardCriteriaRuleService, createHttpTumorBoardCriteriaRuleService);
