// src/services/cytology/cytologyInstrumentationServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyInstrumentation service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyInstrumentationService } from './httpCytologyInstrumentationService';
import { mockCytologyInstrumentationService } from './mockCytologyInstrumentationService';
import type { ICytologyInstrumentationService } from './ICytologyInstrumentationService';

export const cytologyInstrumentationService: ICytologyInstrumentationService = chooseService<ICytologyInstrumentationService>('cytology', mockCytologyInstrumentationService, createHttpCytologyInstrumentationService);
