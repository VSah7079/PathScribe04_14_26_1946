// src/services/signatures/httpSignatureRecordService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ISignatureRecordService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/SIGNATURES_SMART_CAPTURE_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ISignatureRecordService } from './ISignatureRecordService';

type P<K extends keyof ISignatureRecordService> = Parameters<ISignatureRecordService[K]>;
const BASE = '/api/signatures/signature-record';

export const createHttpSignatureRecordService = (client: ApiHttpClient): ISignatureRecordService =>
  buildHttpService<ISignatureRecordService>(client, {
    record: result('POST', () => `${BASE}/record`, { body: (input: P<'record'>[0]) => (input) }),
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
  });
