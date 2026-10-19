// src/services/models/modelStoreServiceInstance.ts
// Batch 616: the app's ai model store service, exported from `@/services` as `modelStoreService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpModelStoreService } from './httpModelStoreService';
import { mockModelStoreService } from './mockModelStoreService';
import type { IModelStoreService } from './mockModelStoreService';

export const modelStoreService: IModelStoreService = chooseService<IModelStoreService>('model-store', mockModelStoreService, createHttpModelStoreService);
