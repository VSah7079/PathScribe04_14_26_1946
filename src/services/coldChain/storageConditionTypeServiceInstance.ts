// src/services/coldChain/storageConditionTypeServiceInstance.ts
// Batch 616: the app's storage condition types, exported from `@/services` as `storageConditionTypeService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpStorageConditionTypeService } from './httpStorageConditionTypeService';
import { mockStorageConditionTypeService } from './mockStorageConditionTypeService';
import type { IStorageConditionTypeService } from './IStorageConditionTypeService';

export const storageConditionTypeService: IStorageConditionTypeService = chooseService<IStorageConditionTypeService>('cold-chain', mockStorageConditionTypeService, createHttpStorageConditionTypeService);
