// src/services/molecularOrders/httpMolecularOrderOutboundQueueService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-500): the API server's version of IMolecularOrderOutboundQueueService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/MOLECULAR_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IMolecularOrderOutboundQueueService } from './IMolecularOrderOutboundQueueService';

type P<K extends keyof IMolecularOrderOutboundQueueService> = Parameters<IMolecularOrderOutboundQueueService[K]>;
const BASE = '/api/molecular-orders/molecular-order-outbound-queue';

export const createHttpMolecularOrderOutboundQueueService = (client: ApiHttpClient): IMolecularOrderOutboundQueueService =>
  buildHttpService<IMolecularOrderOutboundQueueService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    enqueue: result('POST', () => `${BASE}/enqueue`, { body: (entry: P<'enqueue'>[0]) => (entry) }),
    getFailed: result('GET', () => `${BASE}/get-failed`),
    markFailed: result('POST', () => `${BASE}/mark-failed`, { body: (id: P<'markFailed'>[0], failure: P<'markFailed'>[1]) => ({ id, failure }) }),
    retryDispatch: result('POST', () => `${BASE}/retry-dispatch`, { body: (id: P<'retryDispatch'>[0]) => ({ id }) }),
    markSent: result('POST', () => `${BASE}/mark-sent`, { body: (id: P<'markSent'>[0]) => ({ id }) }),
  });
