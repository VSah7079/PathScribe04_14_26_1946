// src/services/referral/httpReferralOutboundQueueService.ts
// ──────────────────────────────────────────────────────────────
// Batch 672 (wiring step 3): the API server's version of IReferralOutboundQueueService, built from the shared
// HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route per interface method;
// the calls are listed in the contract section for IReferralOutboundQueueService. Every method answers with a
// ServiceResult, so a refusal is a fixed code and never carries server text.
// ──────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IReferralOutboundQueueService } from './IReferralOutboundQueueService';

type P<K extends keyof IReferralOutboundQueueService> = Parameters<IReferralOutboundQueueService[K]>;
const BASE = '/api/referral/referral-outbound-queue';

export const createHttpReferralOutboundQueueService = (client: ApiHttpClient): IReferralOutboundQueueService =>
  buildHttpService<IReferralOutboundQueueService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getByBatchId: result('GET', (batchId: P<'getByBatchId'>[0]) => `${BASE}/get-by-batch-id${queryString({ batchId })}`),
    enqueue: result('POST', () => `${BASE}/enqueue`, { body: (entry: P<'enqueue'>[0]) => entry }),
    getFailed: result('GET', () => `${BASE}/get-failed`),
    markFailed: result('POST', () => `${BASE}/mark-failed`, { body: (id: P<'markFailed'>[0], failure: P<'markFailed'>[1]) => ({ id, failure }) }),
    retryDispatch: result('POST', () => `${BASE}/retry-dispatch`, { body: (id: P<'retryDispatch'>[0]) => ({ id }) }),
    markSent: result('POST', () => `${BASE}/mark-sent`, { body: (id: P<'markSent'>[0]) => ({ id }) }),
  });
