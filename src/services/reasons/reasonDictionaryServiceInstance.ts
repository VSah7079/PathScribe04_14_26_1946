// src/services/reasons/reasonDictionaryServiceInstance.ts
// Batch 616 (PS-507): the app's reasonDictionaryService, exported from `@/services`.
// The mock in the demo; the API server's with an address (docs/architecture/HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpReasonDictionaryService } from './httpReasonDictionaryService';
import { mockReasonDictionaryService } from './mockReasonDictionaryService';
import type { IReasonDictionaryService } from '@/types/reasons/ReasonDictionaryEntry';

export const reasonDictionaryService: IReasonDictionaryService = chooseService<IReasonDictionaryService>('reasons', mockReasonDictionaryService, createHttpReasonDictionaryService);
