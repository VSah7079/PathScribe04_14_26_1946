// src/services/clinical/httpCriticalResultNotificationService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ICriticalResultNotificationService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CRITICAL_RESULTS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICriticalResultNotificationService } from './ICriticalResultNotificationService';

type P<K extends keyof ICriticalResultNotificationService> = Parameters<ICriticalResultNotificationService[K]>;
const BASE = '/api/clinical/critical-result-notification';

export const createHttpCriticalResultNotificationService = (client: ApiHttpClient): ICriticalResultNotificationService =>
  buildHttpService<ICriticalResultNotificationService>(client, {
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    recordNotification: result('POST', () => `${BASE}/record-notification`, { body: (input: P<'recordNotification'>[0]) => (input) }),
    migrateIntraopVerbalReport: result('POST', () => `${BASE}/migrate-intraop-verbal-report`, { body: (input: P<'migrateIntraopVerbalReport'>[0]) => (input) }),
  });
