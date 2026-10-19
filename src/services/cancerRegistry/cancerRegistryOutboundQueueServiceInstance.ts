// src/services/cancerRegistry/cancerRegistryOutboundQueueServiceInstance.ts
// Batch 616 (PS-504): the app's cancerRegistryOutboundQueue service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCancerRegistryOutboundQueueService } from './httpCancerRegistryOutboundQueueService';
import { mockCancerRegistryOutboundQueueService } from './mockCancerRegistryOutboundQueueService';
import type { ICancerRegistryOutboundQueueService } from './ICancerRegistryOutboundQueueService';

export const cancerRegistryOutboundQueueService: ICancerRegistryOutboundQueueService = chooseService<ICancerRegistryOutboundQueueService>('cancerRegistry', mockCancerRegistryOutboundQueueService, createHttpCancerRegistryOutboundQueueService);
