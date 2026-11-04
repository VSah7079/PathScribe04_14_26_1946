// src/services/externalResources/externalResourceServiceInstance.ts
// Batch 617 (PS-514): the app's externalResource service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpExternalResourceService } from './httpExternalResourceService';
import { mockExternalResourceService } from './mockExternalResourceService';
import type { IExternalResourceService } from './IExternalResourceService';
import { withSecureUrls } from './externalResourceUrl';

// Batch 652: new and edited links must be https, whichever backend is behind the service.
export const externalResourceService: IExternalResourceService = withSecureUrls(chooseService<IExternalResourceService>('externalResources', mockExternalResourceService, createHttpExternalResourceService));
