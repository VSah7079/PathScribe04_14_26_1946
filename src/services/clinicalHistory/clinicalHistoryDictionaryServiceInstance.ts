// src/services/clinicalHistory/clinicalHistoryDictionaryServiceInstance.ts
// Batch 617 (PS-514): the app's clinicalHistoryDictionaryService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpClinicalHistoryDictionaryService } from './httpClinicalHistoryDictionaryService';
import { mockClinicalHistoryDictionaryService } from './mockClinicalHistoryDictionaryService';
import type { IClinicalHistoryDictionaryService } from './IClinicalHistoryDictionaryService';

export const clinicalHistoryDictionaryService: IClinicalHistoryDictionaryService = chooseService<IClinicalHistoryDictionaryService>('clinicalHistory', mockClinicalHistoryDictionaryService, createHttpClinicalHistoryDictionaryService);
