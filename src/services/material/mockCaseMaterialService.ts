// src/services/material/mockCaseMaterialService.ts
// Batch 618 (PS-482): the demo's version of ICaseMaterialService: the atomic change runs against the app's own
// (browser-side) case, stain and authorization services.
import { applyDecantChangeInBrowser } from './caseMaterialService';
import type { ICaseMaterialService } from './ICaseMaterialService';

export const mockCaseMaterialService: ICaseMaterialService = {
  applyDecantChange: (caseId, change, expectedVersion) => applyDecantChangeInBrowser(caseId, change, expectedVersion),
};
