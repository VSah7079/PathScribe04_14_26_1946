// src/services/displayAccess/displayAccessServiceInstance.ts
// Batch 617 (PS-514): the app's displayAccess service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpDisplayAccessService } from './httpDisplayAccessService';
import { mockDisplayAccessService } from './mockDisplayAccessService';
import type { IDisplayAccessService } from './IDisplayAccessService';

export const displayAccessService: IDisplayAccessService = chooseService<IDisplayAccessService>('displayAccess', mockDisplayAccessService, createHttpDisplayAccessService);
