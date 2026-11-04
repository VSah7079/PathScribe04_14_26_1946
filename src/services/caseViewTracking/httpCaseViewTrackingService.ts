// src/services/caseViewTracking/httpCaseViewTrackingService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ICaseViewTrackingService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CASE_WORKFLOWS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICaseViewTrackingService } from './ICaseViewTrackingService';

type P<K extends keyof ICaseViewTrackingService> = Parameters<ICaseViewTrackingService[K]>;
const BASE = '/api/case-view-tracking/case-view-tracking';

export const createHttpCaseViewTrackingService = (client: ApiHttpClient): ICaseViewTrackingService =>
  buildHttpService<ICaseViewTrackingService>(client, {
    recordView: result('POST', () => `${BASE}/record-view`, { body: (userId: P<'recordView'>[0], caseId: P<'recordView'>[1]) => ({ userId, caseId }) }),
    getViewedCaseIds: result('GET', (userId: P<'getViewedCaseIds'>[0]) => `${BASE}/get-viewed-case-ids${queryString({ userId })}`),
  });
