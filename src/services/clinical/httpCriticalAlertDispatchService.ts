// src/services/clinical/httpCriticalAlertDispatchService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ICriticalAlertDispatchService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CRITICAL_RESULTS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICriticalAlertDispatchService } from './ICriticalAlertDispatchService';

type P<K extends keyof ICriticalAlertDispatchService> = Parameters<ICriticalAlertDispatchService[K]>;
const BASE = '/api/clinical/critical-alert-dispatch';

export const createHttpCriticalAlertDispatchService = (client: ApiHttpClient): ICriticalAlertDispatchService =>
  buildHttpService<ICriticalAlertDispatchService>(client, {
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    getAll: result('GET', () => `${BASE}/get-all`),
    record: result('POST', () => `${BASE}/record`, { body: (input: P<'record'>[0]) => (input) }),
  });
