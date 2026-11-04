// src/services/savedSearches/savedSearchServiceInstance.ts
// Batch 617 (PS-514): the app's savedSearch service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSavedSearchService } from './httpSavedSearchService';
import { mockSavedSearchService } from './mockSavedSearchService';
import type { ISavedSearchService } from './ISavedSearchService';

export const savedSearchService: ISavedSearchService = chooseService<ISavedSearchService>('savedSearches', mockSavedSearchService, createHttpSavedSearchService);
