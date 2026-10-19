// src/services/batches/batchServiceInstance.ts
// Batch 617 (PS-514): the app's batchService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpBatchService } from './httpBatchService';
import { mockBatchService } from './mockBatchService';
import type { IBatchService } from './IBatchService';

export const batchService: IBatchService = chooseService<IBatchService>('batches', mockBatchService, createHttpBatchService);
