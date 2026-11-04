// src/services/cassetteColors/cassetteColorServiceInstance.ts
// Batch 616 (PS-507): the app's cassetteColorService, exported from `@/services`.
// The mock in the demo; the API server's with an address (docs/architecture/HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCassetteColorService } from './httpCassetteColorService';
import { mockCassetteColorService } from './mockCassetteColorService';
import type { ICassetteColorService } from './ICassetteColorService';

export const cassetteColorService: ICassetteColorService = chooseService<ICassetteColorService>('cassetteColors', mockCassetteColorService, createHttpCassetteColorService);
