// src/services/delivery/httpDeliveryRetrySettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IDeliveryRetrySettingsService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DELIVERY_PRINTING_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';

import type { IDeliveryRetrySettingsService } from './IDeliveryRetrySettingsService';

type P<K extends keyof IDeliveryRetrySettingsService> = Parameters<IDeliveryRetrySettingsService[K]>;
const BASE = '/api/delivery/delivery-retry-settings';

export const createHttpDeliveryRetrySettingsService = (client: ApiHttpClient): IDeliveryRetrySettingsService =>
  buildHttpService<IDeliveryRetrySettingsService>(client, {
    get: result('GET', () => `${BASE}/get`),
    save: result('POST', () => `${BASE}/save`, { body: (settings: P<'save'>[0]) => (settings) }),
  });
