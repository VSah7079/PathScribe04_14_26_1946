// src/services/quality/reconciliationServiceInstance.ts
// Batch 616: the app's reconciliation records, exported from `@/services` as `reconciliationService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpReconciliationService } from './httpReconciliationService';
import { mockReconciliationService } from './mockReconciliationService';
import type { IReconciliationService } from './IReconciliationService';

export const reconciliationService: IReconciliationService = chooseService<IReconciliationService>('qa', mockReconciliationService, createHttpReconciliationService);
