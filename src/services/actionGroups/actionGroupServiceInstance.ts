// src/services/actionGroups/actionGroupServiceInstance.ts
// Batch 617 (PS-514): the app's actionGroupService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpActionGroupService } from './httpActionGroupService';
import { mockActionGroupService } from './mockActionGroupService';
import type { IActionGroupService } from './IActionGroupService';

export const actionGroupService: IActionGroupService = chooseService<IActionGroupService>('actionGroups', mockActionGroupService, createHttpActionGroupService);
