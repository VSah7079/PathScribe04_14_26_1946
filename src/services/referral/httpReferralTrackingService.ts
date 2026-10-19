// src/services/referral/httpReferralTrackingService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IReferralTrackingService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/REFERRAL_RESEARCH_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IReferralTrackingService } from './IReferralTrackingService';

type P<K extends keyof IReferralTrackingService> = Parameters<IReferralTrackingService[K]>;
const BASE = '/api/referral/referral-tracking';

export const createHttpReferralTrackingService = (client: ApiHttpClient): IReferralTrackingService =>
  buildHttpService<IReferralTrackingService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getByBatchId: result('GET', (batchId: P<'getByBatchId'>[0]) => `${BASE}/get-by-batch-id${queryString({ batchId })}`),
    createOnDispatch: result('POST', () => `${BASE}/create-on-dispatch`, { body: (batchId: P<'createOnDispatch'>[0]) => ({ batchId }) }),
    updateTransitStatus: result('POST', () => `${BASE}/update-transit-status`, { body: (batchId: P<'updateTransitStatus'>[0], status: P<'updateTransitStatus'>[1]) => ({ batchId, status }) }),
    recordResult: result('POST', () => `${BASE}/record-result`, { body: (batchId: P<'recordResult'>[0], result: P<'recordResult'>[1]) => ({ batchId, result }) }),
  });
