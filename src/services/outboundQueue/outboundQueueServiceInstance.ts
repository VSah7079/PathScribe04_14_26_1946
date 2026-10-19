// src/services/outboundQueue/outboundQueueServiceInstance.ts
// Batch 619 (PS-800): the app's Outbound Queue service, exported from `@/services` as `outboundQueueService`.
// The demo's in the demonstration build; the API server's when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpOutboundQueueService } from './httpOutboundQueueService';
import { mockOutboundQueueService } from './mockOutboundQueueService';
import type { IOutboundQueueService } from './IOutboundQueueService';

export const outboundQueueService: IOutboundQueueService = chooseService<IOutboundQueueService>('delivery', mockOutboundQueueService, createHttpOutboundQueueService);
