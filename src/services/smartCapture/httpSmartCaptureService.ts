// src/services/smartCapture/httpSmartCaptureService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ISmartCaptureService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/SIGNATURES_SMART_CAPTURE_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ISmartCaptureService } from './ISmartCaptureService';

type P<K extends keyof ISmartCaptureService> = Parameters<ISmartCaptureService[K]>;
const BASE = '/api/smart-capture/smart-capture';

export const createHttpSmartCaptureService = (client: ApiHttpClient): ISmartCaptureService =>
  buildHttpService<ISmartCaptureService>(client, {
    get: result('GET', (caseId: P<'get'>[0]) => `${BASE}/get${queryString({ caseId })}`),
    suggest: result('POST', () => `${BASE}/suggest`, { body: (caseId: P<'suggest'>[0]) => ({ caseId }) }),
    restart: result('POST', () => `${BASE}/restart`, { body: (caseId: P<'restart'>[0]) => ({ caseId }) }),
    review: result('POST', () => `${BASE}/review`, { body: (caseId: P<'review'>[0], lineKey: P<'review'>[1], decision: P<'review'>[2]) => ({ caseId, lineKey, decision }) }),
    approve: result('POST', () => `${BASE}/approve`, { body: (caseId: P<'approve'>[0], input: P<'approve'>[1]) => ({ caseId, input }) }),
    preview: result('GET', (caseId: P<'preview'>[0]) => `${BASE}/preview${queryString({ caseId })}`),
    exportLines: result('POST', () => `${BASE}/export-lines`, { body: (caseId: P<'exportLines'>[0]) => ({ caseId }) }),
  });
