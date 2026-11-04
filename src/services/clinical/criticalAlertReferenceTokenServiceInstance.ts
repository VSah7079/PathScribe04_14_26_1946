// src/services/clinical/criticalAlertReferenceTokenServiceInstance.ts
// Batch 617 (PS-514): the app's criticalAlertReferenceTokenService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCriticalAlertReferenceTokenService } from './httpCriticalAlertReferenceTokenService';
import { mockCriticalAlertReferenceTokenService } from './mockCriticalAlertReferenceTokenService';
import type { ICriticalAlertReferenceTokenService } from './ICriticalAlertReferenceTokenService';

export const criticalAlertReferenceTokenService: ICriticalAlertReferenceTokenService = chooseService<ICriticalAlertReferenceTokenService>('clinical', mockCriticalAlertReferenceTokenService, createHttpCriticalAlertReferenceTokenService);
