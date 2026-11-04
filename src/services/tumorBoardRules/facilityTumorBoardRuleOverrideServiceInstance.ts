// src/services/tumorBoardRules/facilityTumorBoardRuleOverrideServiceInstance.ts
// Batch 617 (PS-514): the app's facilityTumorBoardRuleOverride service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFacilityTumorBoardRuleOverrideService } from './httpFacilityTumorBoardRuleOverrideService';
import { mockFacilityTumorBoardRuleOverrideService } from './mockTumorBoardRuleService';
import type { IFacilityTumorBoardRuleOverrideService } from './ITumorBoardRuleService';

export const facilityTumorBoardRuleOverrideService: IFacilityTumorBoardRuleOverrideService = chooseService<IFacilityTumorBoardRuleOverrideService>('tumorBoardRules', mockFacilityTumorBoardRuleOverrideService, createHttpFacilityTumorBoardRuleOverrideService);
