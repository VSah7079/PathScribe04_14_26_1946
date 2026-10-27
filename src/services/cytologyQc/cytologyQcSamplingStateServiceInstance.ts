// src/services/cytologyQc/cytologyQcSamplingStateServiceInstance.ts
// Batch 672 (wiring step 3): the app's cytologyQcSamplingStateService. The mock in the demo; the API server's with an address.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyQcSamplingStateService } from './httpCytologyQcSamplingStateService';
import { mockCytologyQcSamplingStateService } from './mockCytologyQcSamplingStateService';
import type { ICytologyQcSamplingStateService } from './ICytologyQcSamplingStateService';

export const cytologyQcSamplingStateService: ICytologyQcSamplingStateService = chooseService<ICytologyQcSamplingStateService>('cytology-qc', mockCytologyQcSamplingStateService, createHttpCytologyQcSamplingStateService);
