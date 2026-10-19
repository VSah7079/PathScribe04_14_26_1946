// src/services/session/sessionTimeoutServiceInstance.ts
// Batch 616 (PS-512): the app's sessionTimeoutService, exported from `@/services`.
// The mock in the demo; the API server's with an address (docs/architecture/HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSessionTimeoutService } from './httpSessionTimeoutService';
import { mockSessionTimeoutService } from './mockSessionTimeoutService';
import type { ISessionTimeoutService } from './ISessionTimeoutService';

export const sessionTimeoutService: ISessionTimeoutService = chooseService<ISessionTimeoutService>('session', mockSessionTimeoutService, createHttpSessionTimeoutService);
