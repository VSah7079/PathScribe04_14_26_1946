// src/services/billing/ncciEditServiceInstance.ts
// Batch 617 (PS-514): the app's ncciEditService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpNcciEditService } from './httpNcciEditService';
import { mockNcciEditService } from './mockNcciEditService';
import type { INcciEditService } from './IServiceNcciEdit';

export const ncciEditService: INcciEditService = chooseService<INcciEditService>('billing', mockNcciEditService, createHttpNcciEditService);
