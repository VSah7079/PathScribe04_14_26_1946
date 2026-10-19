// src/services/registryGoLive/registryGoLiveServiceInstance.ts
// Batch 616 (PS-504): the app's registryGoLive service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpRegistryGoLiveService } from './httpRegistryGoLiveService';
import { mockRegistryGoLiveService } from './mockRegistryGoLiveService';
import type { IRegistryGoLiveService } from './IRegistryGoLiveService';

export const registryGoLiveService: IRegistryGoLiveService = chooseService<IRegistryGoLiveService>('registryGoLive', mockRegistryGoLiveService, createHttpRegistryGoLiveService);
