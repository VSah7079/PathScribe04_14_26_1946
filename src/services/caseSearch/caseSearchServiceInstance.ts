// src/services/caseSearch/caseSearchServiceInstance.ts
// Batch 617 (PS-514): the app's caseSearchService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCaseSearchService } from './httpCaseSearchService';
import { mockCaseSearchService } from './mockCaseSearchService';
import type { ICaseSearchService } from './ICaseSearchService';

export const caseSearchService: ICaseSearchService = chooseService<ICaseSearchService>('caseSearch', mockCaseSearchService, createHttpCaseSearchService);
