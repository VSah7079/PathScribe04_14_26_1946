// src/services/consultAccess/httpConsultTokenService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IConsultTokenService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CASE_WORKFLOWS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IConsultTokenService } from './IConsultTokenService';

type P<K extends keyof IConsultTokenService> = Parameters<IConsultTokenService[K]>;
const BASE = '/api/consult-access/consult-token';

export const createHttpConsultTokenService = (client: ApiHttpClient): IConsultTokenService =>
  buildHttpService<IConsultTokenService>(client, {
    issue: result('POST', () => `${BASE}/issue`, { body: (draft: P<'issue'>[0]) => (draft) }),
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    listAll: result('GET', () => `${BASE}/list-all`),
    resolve: result('POST', () => `${BASE}/resolve`, { body: (token: P<'resolve'>[0]) => ({ token }) }),
    revoke: result('POST', () => `${BASE}/revoke`, { body: (id: P<'revoke'>[0]) => ({ id }) }),
    openConsult: result('POST', () => `${BASE}/open-consult`, { body: (token: P<'openConsult'>[0]) => ({ token }) }),
    previewIdentity: result('POST', () => `${BASE}/preview-identity`, { body: (linkId: P<'previewIdentity'>[0]) => ({ linkId }) }),
    submitOpinion: result('POST', () => `${BASE}/submit-opinion`, { body: (token: P<'submitOpinion'>[0], draft: P<'submitOpinion'>[1]) => ({ token, draft }) }),
    getOpinionsByCaseId: result('GET', (caseId: P<'getOpinionsByCaseId'>[0]) => `${BASE}/get-opinions-by-case-id${queryString({ caseId })}`),
    assessOpinion: result('POST', () => `${BASE}/assess-opinion`, { body: (id: P<'assessOpinion'>[0], input: P<'assessOpinion'>[1]) => ({ id, input }) }),
  });
