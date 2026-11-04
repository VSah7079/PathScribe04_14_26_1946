// src/services/codes/httpCodeService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ICodeService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CASE_WORKFLOWS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICodeService } from './ICodeService';

type P<K extends keyof ICodeService> = Parameters<ICodeService[K]>;
const BASE = '/api/codes/code';

export const createHttpCodeService = (client: ApiHttpClient): ICodeService =>
  buildHttpService<ICodeService>(client, {
    search: result('POST', () => `${BASE}/search`, { body: (params: P<'search'>[0]) => (params) }),
    getByCode: result('GET', (system: P<'getByCode'>[0], code: P<'getByCode'>[1], jurisdiction: P<'getByCode'>[2]) => `${BASE}/get-by-code${queryString({ system, code, jurisdiction })}`),
    getCategories: result('GET', (system: P<'getCategories'>[0], subtype: P<'getCategories'>[1], jurisdiction: P<'getCategories'>[2]) => `${BASE}/get-categories${queryString({ system, subtype, jurisdiction })}`),
  });
