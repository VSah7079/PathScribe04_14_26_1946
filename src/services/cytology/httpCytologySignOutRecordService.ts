// src/services/cytology/httpCytologySignOutRecordService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of ICytologySignOutRecordService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICytologySignOutRecordService } from './ICytologySignOutRecordService';

type P<K extends keyof ICytologySignOutRecordService> = Parameters<ICytologySignOutRecordService[K]>;
const BASE = '/api/cytology/cytology-sign-out-record';

export const createHttpCytologySignOutRecordService = (client: ApiHttpClient): ICytologySignOutRecordService =>
  buildHttpService<ICytologySignOutRecordService>(client, {
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    getBySpecimenId: result('GET', (specimenId: P<'getBySpecimenId'>[0]) => `${BASE}/get-by-specimen-id${queryString({ specimenId })}`),
    create: result('POST', () => `${BASE}/create`, { body: (record: P<'create'>[0]) => (record) }),
    markRecalled: result('POST', () => `${BASE}/mark-recalled`, { body: (recordId: P<'markRecalled'>[0], by: P<'markRecalled'>[1], at: P<'markRecalled'>[2]) => ({ recordId, by, at }) }),
    getByCaseIdIncludingRecalled: result('GET', (caseId: P<'getByCaseIdIncludingRecalled'>[0]) => `${BASE}/get-by-case-id-including-recalled${queryString({ caseId })}`),
  });
