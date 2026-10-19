// src/services/protocols/fixativeDictionaryServiceInstance.ts
// Batch 616: the app's fixative dictionary service, exported from `@/services` as `fixativeDictionaryService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFixativeDictionaryService } from './httpFixativeDictionaryService';
import { mockFixativeDictionaryService } from './mockPathwayMaterialDictionaryService';
import type { IFixativeDictionaryService } from './IPathwayMaterialDictionaryService';

export const fixativeDictionaryService: IFixativeDictionaryService = chooseService<IFixativeDictionaryService>('fixatives', mockFixativeDictionaryService, createHttpFixativeDictionaryService);
