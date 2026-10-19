// src/services/marginExtraction/marginExtractionServiceInstance.ts
// Batch 617 (PS-514): the app's marginExtraction service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpMarginExtractionService } from './httpMarginExtractionService';
import { mockMarginExtractionService } from './mockMarginExtractionService';
import type { IMarginExtractionService } from './IMarginExtractionService';

export const marginExtractionService: IMarginExtractionService = chooseService<IMarginExtractionService>('marginExtraction', mockMarginExtractionService, createHttpMarginExtractionService);
