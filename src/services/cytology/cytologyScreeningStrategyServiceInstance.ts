// src/services/cytology/cytologyScreeningStrategyServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyScreeningStrategy service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyScreeningStrategyService } from './httpCytologyScreeningStrategyService';
import { mockCytologyScreeningStrategyService } from './mockCytologyScreeningStrategyService';
import type { ICytologyScreeningStrategyService } from './ICytologyScreeningStrategyService';

export const cytologyScreeningStrategyService: ICytologyScreeningStrategyService = chooseService<ICytologyScreeningStrategyService>('cytology', mockCytologyScreeningStrategyService, createHttpCytologyScreeningStrategyService);
