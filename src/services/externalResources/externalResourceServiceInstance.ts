// src/services/externalResources/externalResourceServiceInstance.ts
// Batch 617 (PS-514): the app's externalResource service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpExternalResourceService } from './httpExternalResourceService';
import { mockExternalResourceService } from './mockExternalResourceService';
import type { IExternalResourceService } from './IExternalResourceService';

export const externalResourceService: IExternalResourceService = chooseService<IExternalResourceService>('externalResources', mockExternalResourceService, createHttpExternalResourceService);
