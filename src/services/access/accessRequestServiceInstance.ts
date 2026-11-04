// src/services/access/accessRequestServiceInstance.ts
// Batch 616 (PS-512): the app's accessRequestService, exported from `@/services`.
// The mock in the demo; the API server's with an address (docs/architecture/HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpAccessRequestService } from './httpAccessRequestService';
import { mockAccessRequestService } from './mockAccessRequestService';
import type { IAccessRequestService } from './IAccessRequestService';

export const accessRequestService: IAccessRequestService = chooseService<IAccessRequestService>('access', mockAccessRequestService, createHttpAccessRequestService);
