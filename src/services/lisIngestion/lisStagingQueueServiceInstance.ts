// src/services/lisIngestion/lisStagingQueueServiceInstance.ts
// Batch 616: the app's lis ingestion: the staging queue service, exported from `@/services` as `lisStagingQueueService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpLisStagingQueueService } from './httpLisStagingQueueService';
import { mockLisStagingQueueService } from './mockLisStagingQueueService';
import type { ILisStagingQueueService } from './mockLisStagingQueueService';

export const lisStagingQueueService: ILisStagingQueueService = chooseService<ILisStagingQueueService>('lis-ingestion', mockLisStagingQueueService, createHttpLisStagingQueueService);
