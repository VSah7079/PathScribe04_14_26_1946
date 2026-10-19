// src/services/specimenDictionary/specimenDictionaryServiceInstance.ts
// Batch 616: the app's specimen dictionary, exported from `@/services` as `specimenDictionaryService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSpecimenDictionaryService } from './httpSpecimenDictionaryService';
import { mockSpecimenDictionaryService } from './mockSpecimenDictionaryService';
import type { ISpecimenDictionaryService } from './ISpecimenDictionaryService';

export const specimenDictionaryService: ISpecimenDictionaryService = chooseService<ISpecimenDictionaryService>('dictionaries', mockSpecimenDictionaryService, createHttpSpecimenDictionaryService);
