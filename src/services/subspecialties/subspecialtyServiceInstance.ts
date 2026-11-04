// src/services/subspecialties/subspecialtyServiceInstance.ts
// Batch 617 (PS-514): the app's subspecialty service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSubspecialtyService } from './httpSubspecialtyService';
import { mockSubspecialtyService } from './mockSubspecialtyService';
import type { ISubspecialtyService } from './ISubspecialtyService';

export const subspecialtyService: ISubspecialtyService = chooseService<ISubspecialtyService>('subspecialties', mockSubspecialtyService, createHttpSubspecialtyService);
