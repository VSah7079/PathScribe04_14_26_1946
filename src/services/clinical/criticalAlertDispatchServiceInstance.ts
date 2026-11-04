// src/services/clinical/criticalAlertDispatchServiceInstance.ts
// Batch 617 (PS-514): the app's criticalAlertDispatchService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCriticalAlertDispatchService } from './httpCriticalAlertDispatchService';
import { mockCriticalAlertDispatchService } from './mockCriticalAlertDispatchService';
import type { ICriticalAlertDispatchService } from './ICriticalAlertDispatchService';

export const criticalAlertDispatchService: ICriticalAlertDispatchService = chooseService<ICriticalAlertDispatchService>('clinical', mockCriticalAlertDispatchService, createHttpCriticalAlertDispatchService);
