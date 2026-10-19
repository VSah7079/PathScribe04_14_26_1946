// src/services/coldChain/storageUnitServiceInstance.ts
// Batch 616: the app's storage units, exported from `@/services` as `storageUnitService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpStorageUnitService } from './httpStorageUnitService';
import { mockStorageUnitService } from './mockStorageUnitService';
import type { IStorageUnitService } from './IStorageUnitService';

export const storageUnitService: IStorageUnitService = chooseService<IStorageUnitService>('cold-chain', mockStorageUnitService, createHttpStorageUnitService);
