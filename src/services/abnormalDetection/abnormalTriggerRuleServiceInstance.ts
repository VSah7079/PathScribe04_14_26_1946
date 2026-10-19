// src/services/abnormalDetection/abnormalTriggerRuleServiceInstance.ts
// Batch 617 (PS-514): the app's abnormalTriggerRuleService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpAbnormalTriggerRuleService } from './httpAbnormalTriggerRuleService';
import { mockAbnormalTriggerRuleService } from './mockAbnormalTriggerRuleService';
import type { IAbnormalTriggerRuleService } from './IAbnormalTriggerRuleService';

export const abnormalTriggerRuleService: IAbnormalTriggerRuleService = chooseService<IAbnormalTriggerRuleService>('abnormalDetection', mockAbnormalTriggerRuleService, createHttpAbnormalTriggerRuleService);
