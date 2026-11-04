// src/services/molecularOrders/molecularOrderOutboundQueueServiceInstance.ts
// Batch 616 (PS-500): the app's molecularOrderOutboundQueue service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpMolecularOrderOutboundQueueService } from './httpMolecularOrderOutboundQueueService';
import { mockMolecularOrderOutboundQueueService } from './mockMolecularOrderOutboundQueueService';
import type { IMolecularOrderOutboundQueueService } from './IMolecularOrderOutboundQueueService';

export const molecularOrderOutboundQueueService: IMolecularOrderOutboundQueueService = chooseService<IMolecularOrderOutboundQueueService>('molecularOrders', mockMolecularOrderOutboundQueueService, createHttpMolecularOrderOutboundQueueService);
