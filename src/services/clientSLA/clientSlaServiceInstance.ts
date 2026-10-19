// src/services/clientSLA/clientSlaServiceInstance.ts
// Batch 617 (PS-514): the app's clientSlaService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpClientSlaService } from './httpClientSlaService';
import { mockClientSLAService } from './mockClientSLAService';
import type { IClientSLAService } from './IClientSLAService';

export const clientSlaService: IClientSLAService = chooseService<IClientSLAService>('clientSLA', mockClientSLAService, createHttpClientSlaService);
