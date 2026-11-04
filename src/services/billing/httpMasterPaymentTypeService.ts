// src/services/billing/httpMasterPaymentTypeService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498): the API server's version of IMasterPaymentTypeService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/BILLING_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IMasterPaymentTypeService } from './IMasterPaymentTypeService';

type P<K extends keyof IMasterPaymentTypeService> = Parameters<IMasterPaymentTypeService[K]>;
const BASE = '/api/billing/master-payment-type';

export const createHttpMasterPaymentTypeService = (client: ApiHttpClient): IMasterPaymentTypeService =>
  buildHttpService<IMasterPaymentTypeService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    add: result('POST', () => `${BASE}/add`, { body: (input: P<'add'>[0]) => (input) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    deactivate: result('POST', () => `${BASE}/deactivate`, { body: (id: P<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => `${BASE}/reactivate`, { body: (id: P<'reactivate'>[0]) => ({ id }) }),
  });
