// src/services/screeningRegistry/screeningRegistryConfigServiceInstance.ts
// Batch 616 (PS-504): the app's screeningRegistryConfig service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpScreeningRegistryConfigService } from './httpScreeningRegistryConfigService';
import { mockScreeningRegistryConfigService } from './mockScreeningRegistryConfigService';
import type { IScreeningRegistryConfigService } from './IScreeningRegistryConfigService';

export const screeningRegistryConfigService: IScreeningRegistryConfigService = chooseService<IScreeningRegistryConfigService>('screeningRegistry', mockScreeningRegistryConfigService, createHttpScreeningRegistryConfigService);
