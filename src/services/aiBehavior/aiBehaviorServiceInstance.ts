// src/services/aiBehavior/aiBehaviorServiceInstance.ts
// Batch 617 (PS-514): the app's aiBehaviorService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpAiBehaviorService } from './httpAiBehaviorService';
import { mockAIBehaviorService } from './mockAIBehaviorService';
import type { IAIBehaviorService } from './IAIBehaviorService';

export const aiBehaviorService: IAIBehaviorService = chooseService<IAIBehaviorService>('aiBehavior', mockAIBehaviorService, createHttpAiBehaviorService);
