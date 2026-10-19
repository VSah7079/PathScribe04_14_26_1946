// src/services/protocols/processingFormatDictionaryServiceInstance.ts
// Batch 616: the app's processing format dictionary service, exported from `@/services` as `processingFormatDictionaryService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpProcessingFormatDictionaryService } from './httpProcessingFormatDictionaryService';
import { mockProcessingFormatDictionaryService } from './mockPathwayMaterialDictionaryService';
import type { IProcessingFormatDictionaryService } from './IPathwayMaterialDictionaryService';

export const processingFormatDictionaryService: IProcessingFormatDictionaryService = chooseService<IProcessingFormatDictionaryService>('processing-formats', mockProcessingFormatDictionaryService, createHttpProcessingFormatDictionaryService);
