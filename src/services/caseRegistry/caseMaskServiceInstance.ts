// src/services/caseRegistry/caseMaskServiceInstance.ts
// Batch 617 (PS-514): the app's caseMaskService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCaseMaskService } from './httpCaseMaskService';
import { mockCaseMaskService } from './mockCaseMaskService';
import type { ICaseMaskService } from './ICaseMaskService';

export const caseMaskService: ICaseMaskService = chooseService<ICaseMaskService>('caseRegistry', mockCaseMaskService, createHttpCaseMaskService);
