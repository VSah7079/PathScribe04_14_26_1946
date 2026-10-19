// src/services/billing/outboundChargeQueueServiceInstance.ts
// Batch 616 (PS-498): the app's outboundChargeQueue service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpOutboundChargeQueueService } from './httpOutboundChargeQueueService';
import { mockOutboundChargeQueueService } from './mockOutboundChargeQueueService';
import type { IOutboundChargeQueueService } from './IOutboundChargeQueueService';

export const outboundChargeQueueService: IOutboundChargeQueueService = chooseService<IOutboundChargeQueueService>('billing', mockOutboundChargeQueueService, createHttpOutboundChargeQueueService);
