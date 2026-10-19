// src/services/delivery/httpDeliveryRetryService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IDeliveryRetryService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DELIVERY_PRINTING_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';

import type { IDeliveryRetryService } from './IDeliveryRetryService';

type P<K extends keyof IDeliveryRetryService> = Parameters<IDeliveryRetryService[K]>;
const BASE = '/api/delivery/delivery-retry';

export const createHttpDeliveryRetryService = (client: ApiHttpClient): IDeliveryRetryService =>
  buildHttpService<IDeliveryRetryService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    create: result('POST', () => `${BASE}/create`, { body: (record: P<'create'>[0]) => (record) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], patch: P<'update'>[1]) => ({ id, patch }) }),
  });
