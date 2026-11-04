// src/services/stains/stainTypeServiceInstance.ts
// Batch 617 (PS-514): the app's stainType service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpStainTypeService } from './httpStainTypeService';
import { mockStainTypeService } from './mockStainTypeService';
import type { IStainTypeService } from './IStainService';

export const stainTypeService: IStainTypeService = chooseService<IStainTypeService>('stains', mockStainTypeService, createHttpStainTypeService);
