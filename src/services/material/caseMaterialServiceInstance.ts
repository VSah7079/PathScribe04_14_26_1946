// src/services/material/caseMaterialServiceInstance.ts
// Batch 618 (PS-482): the app's case material service, exported from `@/services` as `caseMaterialService`.
// The demo's in the demonstration build; the API server's when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCaseMaterialService } from './httpCaseMaterialService';
import { mockCaseMaterialService } from './mockCaseMaterialService';
import type { ICaseMaterialService } from './ICaseMaterialService';

export const caseMaterialService: ICaseMaterialService = chooseService<ICaseMaterialService>('material', mockCaseMaterialService, createHttpCaseMaterialService);
