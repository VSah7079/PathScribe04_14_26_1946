// src/services/cytology/cytologyOutboundResultQueueServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyOutboundResultQueue service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyOutboundResultQueueService } from './httpCytologyOutboundResultQueueService';
import { mockCytologyOutboundResultQueueService } from './mockCytologyOutboundResultQueueService';
import type { ICytologyOutboundResultQueueService } from './ICytologyOutboundResultQueueService';

export const cytologyOutboundResultQueueService: ICytologyOutboundResultQueueService = chooseService<ICytologyOutboundResultQueueService>('cytology', mockCytologyOutboundResultQueueService, createHttpCytologyOutboundResultQueueService);
