// src/services/tumorBoard/tumorBoardServiceInstance.ts
// Batch 617 (PS-514): the app's tumorBoard service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpTumorBoardService } from './httpTumorBoardService';
import { mockTumorBoardService } from './mockTumorBoardService';
import type { ITumorBoardService } from './ITumorBoardService';

export const tumorBoardService: ITumorBoardService = chooseService<ITumorBoardService>('tumorBoard', mockTumorBoardService, createHttpTumorBoardService);
