// src/services/governingBodies/governingBodyServiceInstance.ts
// Batch 617 (PS-514): the app's governingBody service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpGoverningBodyService } from './httpGoverningBodyService';
import { mockGoverningBodyService } from './mockGoverningBodyService';
import type { IGoverningBodyService } from './IGoverningBodyService';

export const governingBodyService: IGoverningBodyService = chooseService<IGoverningBodyService>('governingBodies', mockGoverningBodyService, createHttpGoverningBodyService);
