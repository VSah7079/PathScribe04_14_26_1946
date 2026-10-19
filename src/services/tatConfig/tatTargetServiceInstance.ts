// src/services/tatConfig/tatTargetServiceInstance.ts
// Batch 617 (PS-514): the app's tatTarget service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpTatTargetService } from './httpTatTargetService';
import { mockTatTargetService } from './mockTatTargetService';
import type { ITatTargetService } from './ITatTargetService';

export const tatTargetService: ITatTargetService = chooseService<ITatTargetService>('tatConfig', mockTatTargetService, createHttpTatTargetService);
