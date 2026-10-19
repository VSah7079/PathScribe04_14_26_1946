// src/services/billing/httpCodeReviewPoolService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498): the API server's version of ICodeReviewPoolService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/BILLING_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICodeReviewPoolService } from './ICodeReviewPoolService';

type P<K extends keyof ICodeReviewPoolService> = Parameters<ICodeReviewPoolService[K]>;
const BASE = '/api/billing/code-review-pool';

export const createHttpCodeReviewPoolService = (client: ApiHttpClient): ICodeReviewPoolService =>
  buildHttpService<ICodeReviewPoolService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    create: result('POST', () => `${BASE}/create`, { body: (entry: P<'create'>[0]) => (entry) }),
    review: result('POST', () => `${BASE}/review`, { body: (id: P<'review'>[0], outcome: P<'review'>[1]) => ({ id, outcome }) }),
  });
