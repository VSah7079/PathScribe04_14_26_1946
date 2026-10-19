// src/services/cytology/cytologyRegistryOutboundQueueServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyRegistryOutboundQueue service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyRegistryOutboundQueueService } from './httpCytologyRegistryOutboundQueueService';
import { mockCytologyRegistryOutboundQueueService } from './mockCytologyRegistryOutboundQueueService';
import type { ICytologyRegistryOutboundQueueService } from './ICytologyRegistryOutboundQueueService';

export const cytologyRegistryOutboundQueueService: ICytologyRegistryOutboundQueueService = chooseService<ICytologyRegistryOutboundQueueService>('cytology', mockCytologyRegistryOutboundQueueService, createHttpCytologyRegistryOutboundQueueService);
