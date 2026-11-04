// src/services/digitalPathology/wsiScanBatchServiceInstance.ts
// Batch 616: the app's wsi scan batches, exported from `@/services` as `wsiScanBatchService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpWsiScanBatchService } from './httpWsiScanBatchService';
import { mockWsiScanBatchService } from './mockWsiScanBatchService';
import type { IWsiScanBatchService } from './IWsiScanBatchService';

export const wsiScanBatchService: IWsiScanBatchService = chooseService<IWsiScanBatchService>('dp', mockWsiScanBatchService, createHttpWsiScanBatchService);
