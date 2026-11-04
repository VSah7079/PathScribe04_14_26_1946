// src/services/clinical/criticalResultNotificationServiceInstance.ts
// Batch 617 (PS-514): the app's criticalResultNotificationService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCriticalResultNotificationService } from './httpCriticalResultNotificationService';
import { mockCriticalResultNotificationService } from './mockCriticalResultNotificationService';
import type { ICriticalResultNotificationService } from './ICriticalResultNotificationService';

export const criticalResultNotificationService: ICriticalResultNotificationService = chooseService<ICriticalResultNotificationService>('clinical', mockCriticalResultNotificationService, createHttpCriticalResultNotificationService);
