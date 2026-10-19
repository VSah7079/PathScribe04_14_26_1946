// src/services/specimenCategories/specimenCategoryServiceInstance.ts
// Batch 617 (PS-514): the app's specimenCategory service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSpecimenCategoryService } from './httpSpecimenCategoryService';
import { mockSpecimenCategoryService } from './mockSpecimenCategoryService';
import type { ISpecimenCategoryService } from './ISpecimenCategoryService';

export const specimenCategoryService: ISpecimenCategoryService = chooseService<ISpecimenCategoryService>('specimenCategories', mockSpecimenCategoryService, createHttpSpecimenCategoryService);
