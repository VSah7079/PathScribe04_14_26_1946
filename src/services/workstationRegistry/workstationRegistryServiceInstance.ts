// src/services/workstationRegistry/workstationRegistryServiceInstance.ts
// Batch 617 (PS-514): the app's workstationRegistry service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpWorkstationRegistryService } from './httpWorkstationRegistryService';
import { mockWorkstationRegistryService } from './workstationRegistryServices';
import type { WorkstationRegistryService } from './workstationRegistryService';

export const workstationRegistryService: WorkstationRegistryService = chooseService<WorkstationRegistryService>('workstationRegistry', mockWorkstationRegistryService, createHttpWorkstationRegistryService);
