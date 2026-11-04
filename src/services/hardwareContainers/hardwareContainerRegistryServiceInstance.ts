// src/services/hardwareContainers/hardwareContainerRegistryServiceInstance.ts
// Batch 616: the app's hardware container registry, exported from `@/services` as `hardwareContainerRegistryService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpHardwareContainerRegistryService } from './httpHardwareContainerRegistryService';
import { mockHardwareContainerRegistryService } from './mockHardwareContainerRegistryService';
import type { IHardwareContainerRegistryService } from './IHardwareContainerRegistryService';

export const hardwareContainerRegistryService: IHardwareContainerRegistryService = chooseService<IHardwareContainerRegistryService>('grossing', mockHardwareContainerRegistryService, createHttpHardwareContainerRegistryService);
