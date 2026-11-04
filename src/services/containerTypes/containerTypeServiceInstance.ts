// src/services/containerTypes/containerTypeServiceInstance.ts
// Batch 616 (PS-507): the app's containerTypeService, exported from `@/services`.
// The mock in the demo; the API server's with an address (docs/architecture/HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpContainerTypeService } from './httpContainerTypeService';
import { mockContainerTypeService } from './mockContainerTypeService';
import type { IContainerTypeService } from './IContainerTypeService';

export const containerTypeService: IContainerTypeService = chooseService<IContainerTypeService>('containerTypes', mockContainerTypeService, createHttpContainerTypeService);
