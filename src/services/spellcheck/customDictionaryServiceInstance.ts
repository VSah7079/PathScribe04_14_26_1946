// src/services/spellcheck/customDictionaryServiceInstance.ts
// Batch 617 (PS-514): the app's customDictionary service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCustomDictionaryService } from './httpCustomDictionaryService';
import { mockCustomDictionaryService } from './mockCustomDictionaryService';
import type { ICustomDictionaryService } from './ICustomDictionaryService';

export const customDictionaryService: ICustomDictionaryService = chooseService<ICustomDictionaryService>('spellcheck', mockCustomDictionaryService, createHttpCustomDictionaryService);
