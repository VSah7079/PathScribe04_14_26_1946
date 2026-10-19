// src/services/cytology/cytologyCategoryServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyCategory service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyCategoryService } from './httpCytologyCategoryService';
import { mockCytologyCategoryService } from './mockCytologyCategoryService';
import type { ICytologyCategoryService } from './ICytologyCategoryService';

export const cytologyCategoryService: ICytologyCategoryService = chooseService<ICytologyCategoryService>('cytology', mockCytologyCategoryService, createHttpCytologyCategoryService);
