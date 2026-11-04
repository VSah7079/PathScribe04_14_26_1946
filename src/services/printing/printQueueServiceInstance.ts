// src/services/printing/printQueueServiceInstance.ts
// Batch 617 (PS-514): the app's printQueue service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpPrintQueueService } from './httpPrintQueueService';
import { mockPrintQueueService } from './mockPrintQueueService';
import type { IPrintQueueService } from './IPrintQueueService';

export const printQueueService: IPrintQueueService = chooseService<IPrintQueueService>('printing', mockPrintQueueService, createHttpPrintQueueService);
