// src/services/delivery/httpDeliveryRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IDeliveryRuleService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DELIVERY_PRINTING_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';

import type { IDeliveryRuleService } from './IDeliveryRuleService';

type P<K extends keyof IDeliveryRuleService> = Parameters<IDeliveryRuleService[K]>;
const BASE = '/api/delivery/delivery-rule';

export const createHttpDeliveryRuleService = (client: ApiHttpClient): IDeliveryRuleService =>
  buildHttpService<IDeliveryRuleService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getActive: result('GET', () => `${BASE}/get-active`),
    create: result('POST', () => `${BASE}/create`, { body: (rule: P<'create'>[0]) => (rule) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (id: P<'remove'>[0]) => ({ id }) }),
  });
