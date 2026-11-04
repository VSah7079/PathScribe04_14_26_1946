// src/services/cytology/httpCytologyOutboundResultQueueService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of ICytologyOutboundResultQueueService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICytologyOutboundResultQueueService } from './ICytologyOutboundResultQueueService';

type P<K extends keyof ICytologyOutboundResultQueueService> = Parameters<ICytologyOutboundResultQueueService[K]>;
const BASE = '/api/cytology/cytology-outbound-result-queue';

export const createHttpCytologyOutboundResultQueueService = (client: ApiHttpClient): ICytologyOutboundResultQueueService =>
  buildHttpService<ICytologyOutboundResultQueueService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    getBySignOutRecordId: result('GET', (signOutRecordId: P<'getBySignOutRecordId'>[0]) => `${BASE}/get-by-sign-out-record-id${queryString({ signOutRecordId })}`),
    enqueue: result('POST', () => `${BASE}/enqueue`, { body: (entry: P<'enqueue'>[0]) => (entry) }),
    getFailed: result('GET', () => `${BASE}/get-failed`),
    markFailed: result('POST', () => `${BASE}/mark-failed`, { body: (id: P<'markFailed'>[0], failure: P<'markFailed'>[1]) => ({ id, failure }) }),
    retryDispatch: result('POST', () => `${BASE}/retry-dispatch`, { body: (id: P<'retryDispatch'>[0]) => ({ id }) }),
    markSent: result('POST', () => `${BASE}/mark-sent`, { body: (id: P<'markSent'>[0]) => ({ id }) }),
  });
