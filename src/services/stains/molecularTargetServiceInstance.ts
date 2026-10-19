// src/services/stains/molecularTargetServiceInstance.ts
// Batch 617 (PS-514): the app's molecularTarget service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpMolecularTargetService } from './httpMolecularTargetService';
import { mockMolecularTargetService } from './mockMolecularTargetService';
import type { IMolecularTargetService } from './IMolecularTargetService';

export const molecularTargetService: IMolecularTargetService = chooseService<IMolecularTargetService>('stains', mockMolecularTargetService, createHttpMolecularTargetService);
