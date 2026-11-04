// src/services/priority/priorityServiceInstance.ts
// Batch 617 (PS-514): the app's priority service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpPriorityService } from './httpPriorityService';
import { mockPriorityService } from './mockPriorityService';
import type { IPriorityService } from './IPriorityService';

export const priorityService: IPriorityService = chooseService<IPriorityService>('priority', mockPriorityService, createHttpPriorityService);
