// src/services/cytology/nonGynCytologyCategoryServiceInstance.ts
// Batch 616 (PS-499): the app's nonGynCytologyCategory service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpNonGynCytologyCategoryService } from './httpNonGynCytologyCategoryService';
import { mockNonGynCytologyCategoryService } from './mockNonGynCytologyCategoryService';
import type { INonGynCytologyCategoryService } from './INonGynCytologyCategoryService';

export const nonGynCytologyCategoryService: INonGynCytologyCategoryService = chooseService<INonGynCytologyCategoryService>('cytology', mockNonGynCytologyCategoryService, createHttpNonGynCytologyCategoryService);
