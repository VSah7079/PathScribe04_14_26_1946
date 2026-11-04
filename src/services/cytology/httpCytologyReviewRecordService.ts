// src/services/cytology/httpCytologyReviewRecordService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of ICytologyReviewRecordService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICytologyReviewRecordService } from './ICytologyReviewRecordService';

type P<K extends keyof ICytologyReviewRecordService> = Parameters<ICytologyReviewRecordService[K]>;
const BASE = '/api/cytology/cytology-review-record';

export const createHttpCytologyReviewRecordService = (client: ApiHttpClient): ICytologyReviewRecordService =>
  buildHttpService<ICytologyReviewRecordService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getBySpecimenId: result('GET', (specimenId: P<'getBySpecimenId'>[0]) => `${BASE}/get-by-specimen-id${queryString({ specimenId })}`),
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    create: result('POST', () => `${BASE}/create`, { body: (record: P<'create'>[0]) => (record) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], requestingUserId: P<'update'>[1], changes: P<'update'>[2]) => ({ id, requestingUserId, changes }) }),
  });
