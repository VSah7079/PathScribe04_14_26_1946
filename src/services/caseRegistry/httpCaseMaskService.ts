// src/services/caseRegistry/httpCaseMaskService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ICaseMaskService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CASE_WORKFLOWS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICaseMaskService } from './ICaseMaskService';

type P<K extends keyof ICaseMaskService> = Parameters<ICaseMaskService[K]>;
const BASE = '/api/case-registry/case-mask';

export const createHttpCaseMaskService = (client: ApiHttpClient): ICaseMaskService =>
  buildHttpService<ICaseMaskService>(client, {
    getMask: result('GET', (scopeType: P<'getMask'>[0], scopeId: P<'getMask'>[1]) => `${BASE}/get-mask${queryString({ scopeType, scopeId })}`),
    getAllMasks: result('GET', () => `${BASE}/get-all-masks`),
    saveMask: result('POST', () => `${BASE}/save-mask`, { body: (mask: P<'saveMask'>[0]) => (mask) }),
    deleteMask: result('POST', () => `${BASE}/delete-mask`, { body: (scopeType: P<'deleteMask'>[0], scopeId: P<'deleteMask'>[1]) => ({ scopeType, scopeId }) }),
    allocateNextCaseNumber: result('POST', () => `${BASE}/allocate-next-case-number`, { body: (candidates: P<'allocateNextCaseNumber'>[0], timezone: P<'allocateNextCaseNumber'>[1]) => ({ candidates, timezone }) }),
    previewNextCaseNumber: result('POST', () => `${BASE}/preview-next-case-number`, { body: (candidates: P<'previewNextCaseNumber'>[0], timezone: P<'previewNextCaseNumber'>[1]) => ({ candidates, timezone }) }),
  });
