// src/services/cytology/httpCytologyRegistryOutboundQueueService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of ICytologyRegistryOutboundQueueService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICytologyRegistryOutboundQueueService } from './ICytologyRegistryOutboundQueueService';

type P<K extends keyof ICytologyRegistryOutboundQueueService> = Parameters<ICytologyRegistryOutboundQueueService[K]>;
const BASE = '/api/cytology/cytology-registry-outbound-queue';

export const createHttpCytologyRegistryOutboundQueueService = (client: ApiHttpClient): ICytologyRegistryOutboundQueueService =>
  buildHttpService<ICytologyRegistryOutboundQueueService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    enqueue: result('POST', () => `${BASE}/enqueue`, { body: (entry: P<'enqueue'>[0]) => (entry) }),
    getFailed: result('GET', () => `${BASE}/get-failed`),
    markFailed: result('POST', () => `${BASE}/mark-failed`, { body: (id: P<'markFailed'>[0], failure: P<'markFailed'>[1]) => ({ id, failure }) }),
    retryDispatch: result('POST', () => `${BASE}/retry-dispatch`, { body: (id: P<'retryDispatch'>[0]) => ({ id }) }),
    markSent: result('POST', () => `${BASE}/mark-sent`, { body: (id: P<'markSent'>[0]) => ({ id }) }),
    setRegistryStatus: result('POST', () => `${BASE}/set-registry-status`, { body: (id: P<'setRegistryStatus'>[0], registryStatus: P<'setRegistryStatus'>[1], acknowledgement: P<'setRegistryStatus'>[2]) => ({ id, registryStatus, acknowledgement }) }),
    setRegistryRevisions: result('POST', () => `${BASE}/set-registry-revisions`, { body: (id: P<'setRegistryRevisions'>[0], revisions: P<'setRegistryRevisions'>[1]) => ({ id, revisions }) }),
  });
