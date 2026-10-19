// src/services/clinical/httpCriticalAlertReferenceTokenService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ICriticalAlertReferenceTokenService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CRITICAL_RESULTS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICriticalAlertReferenceTokenService } from './ICriticalAlertReferenceTokenService';

type P<K extends keyof ICriticalAlertReferenceTokenService> = Parameters<ICriticalAlertReferenceTokenService[K]>;
const BASE = '/api/clinical/critical-alert-reference-token';

export const createHttpCriticalAlertReferenceTokenService = (client: ApiHttpClient): ICriticalAlertReferenceTokenService =>
  buildHttpService<ICriticalAlertReferenceTokenService>(client, {
    issue: result('POST', () => `${BASE}/issue`, { body: (draft: P<'issue'>[0]) => (draft) }),
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    getAll: result('GET', () => `${BASE}/get-all`),
    resolve: result('POST', () => `${BASE}/resolve`, { body: (token: P<'resolve'>[0]) => ({ token }) }),
    recordAccess: result('POST', () => `${BASE}/record-access`, { body: (id: P<'recordAccess'>[0]) => ({ id }) }),
    recordAcknowledged: result('POST', () => `${BASE}/record-acknowledged`, { body: (id: P<'recordAcknowledged'>[0]) => ({ id }) }),
  });
