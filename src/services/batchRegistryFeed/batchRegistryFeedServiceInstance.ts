// src/services/batchRegistryFeed/batchRegistryFeedServiceInstance.ts
// Batch 620 part S (PS-800): the app's batch file feed, exported from `@/services` as `batchRegistryFeedService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpBatchRegistryFeedService } from './httpBatchRegistryFeedService';
import { mockBatchRegistryFeedService } from './mockBatchRegistryFeedService';
import type { IBatchRegistryFeedService } from './IBatchRegistryFeedService';

export const batchRegistryFeedService: IBatchRegistryFeedService = chooseService<IBatchRegistryFeedService>('batchRegistryFeed', mockBatchRegistryFeedService, createHttpBatchRegistryFeedService);
