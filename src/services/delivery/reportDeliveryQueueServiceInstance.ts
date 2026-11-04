// src/services/delivery/reportDeliveryQueueServiceInstance.ts
// Batch 672 (wiring step 3): the app's reportDeliveryQueueService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpReportDeliveryQueueService } from './httpReportDeliveryQueueService';
import { mockReportDeliveryQueueService } from './mockReportDeliveryQueueService';
import type { IReportDeliveryQueueService } from './IReportDeliveryQueueService';

export const reportDeliveryQueueService: IReportDeliveryQueueService = chooseService<IReportDeliveryQueueService>('delivery', mockReportDeliveryQueueService, createHttpReportDeliveryQueueService);
