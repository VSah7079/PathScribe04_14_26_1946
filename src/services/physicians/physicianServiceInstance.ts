// src/services/physicians/physicianServiceInstance.ts
// Batch 616 (PS-507): the app's physicianService, exported from `@/services`.
// The mock in the demo; the API server's with an address (docs/architecture/HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpPhysicianService } from './httpPhysicianService';
import { mockPhysicianService } from './mockPhysicianService';
import type { IPhysicianService } from './IPhysicianService';

export const physicianService: IPhysicianService = chooseService<IPhysicianService>('physicians', mockPhysicianService, createHttpPhysicianService);
