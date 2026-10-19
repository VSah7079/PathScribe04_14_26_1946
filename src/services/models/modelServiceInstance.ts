// src/services/models/modelServiceInstance.ts
// Batch 616: the app's ai models service, exported from `@/services` as `modelService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpModelService } from './httpModelService';
import { mockModelService } from './mockModelService';
import type { IModelService } from './IModelService';

export const modelService: IModelService = chooseService<IModelService>('models', mockModelService, createHttpModelService);
