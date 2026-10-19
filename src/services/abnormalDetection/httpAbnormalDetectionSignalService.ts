// src/services/abnormalDetection/httpAbnormalDetectionSignalService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IAbnormalDetectionSignalService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_SERVICES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IAbnormalDetectionSignalService } from './IAbnormalDetectionSignalService';

type P<K extends keyof IAbnormalDetectionSignalService> = Parameters<IAbnormalDetectionSignalService[K]>;
const BASE = '/api/abnormal-detection/abnormal-detection-signal';

export const createHttpAbnormalDetectionSignalService = (client: ApiHttpClient): IAbnormalDetectionSignalService =>
  buildHttpService<IAbnormalDetectionSignalService>(client, {
    recordSignal: result('POST', () => `${BASE}/record-signal`, { body: (input: P<'recordSignal'>[0]) => (input) }),
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    getByStudy: result('GET', (studyId: P<'getByStudy'>[0]) => `${BASE}/get-by-study${queryString({ studyId })}`),
    getStats: result('GET', (studyId: P<'getStats'>[0]) => `${BASE}/get-stats${queryString({ studyId })}`),
  });
