// src/services/workstationGroups/workstationGroupServiceInstance.ts
// Batch 617 (PS-514): the app's workstationGroup service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpWorkstationGroupService } from './httpWorkstationGroupService';
import { mockWorkstationGroupService } from './mockWorkstationGroupService';
import type { IWorkstationGroupService } from './IWorkstationGroupService';

export const workstationGroupService: IWorkstationGroupService = chooseService<IWorkstationGroupService>('workstationGroups', mockWorkstationGroupService, createHttpWorkstationGroupService);
