// src/services/tumorBoardRules/tumorBoardBatchSettingsServiceInstance.ts
// Batch 617 (PS-514): the app's tumorBoardBatchSettings service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpTumorBoardBatchSettingsService } from './httpTumorBoardBatchSettingsService';
import { mockTumorBoardBatchSettingsService } from './mockTumorBoardRuleService';
import type { ITumorBoardBatchSettingsService } from './ITumorBoardRuleService';

export const tumorBoardBatchSettingsService: ITumorBoardBatchSettingsService = chooseService<ITumorBoardBatchSettingsService>('tumorBoardRules', mockTumorBoardBatchSettingsService, createHttpTumorBoardBatchSettingsService);
