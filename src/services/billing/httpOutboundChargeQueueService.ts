// src/services/billing/httpOutboundChargeQueueService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498): the API server's version of IOutboundChargeQueueService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/BILLING_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IOutboundChargeQueueService } from './IOutboundChargeQueueService';

type P<K extends keyof IOutboundChargeQueueService> = Parameters<IOutboundChargeQueueService[K]>;
const BASE = '/api/billing/outbound-charge-queue';

export const createHttpOutboundChargeQueueService = (client: ApiHttpClient): IOutboundChargeQueueService =>
  buildHttpService<IOutboundChargeQueueService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    getByServiceChargeRecordIds: result('GET', (ids: P<'getByServiceChargeRecordIds'>[0]) => `${BASE}/get-by-service-charge-record-ids${queryString({ ids })}`),
    enqueue: result('POST', () => `${BASE}/enqueue`, { body: (entry: P<'enqueue'>[0]) => (entry) }),
    getFailed: result('GET', () => `${BASE}/get-failed`),
    markFailed: result('POST', () => `${BASE}/mark-failed`, { body: (id: P<'markFailed'>[0], failure: P<'markFailed'>[1]) => ({ id, failure }) }),
    retryDispatch: result('POST', () => `${BASE}/retry-dispatch`, { body: (id: P<'retryDispatch'>[0]) => ({ id }) }),
    markSent: result('POST', () => `${BASE}/mark-sent`, { body: (id: P<'markSent'>[0]) => ({ id }) }),
  });
