// src/services/cytologyQc/httpCytologyQcRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of ICytologyQcRuleService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICytologyQcRuleService } from './ICytologyQcRuleService';

type P<K extends keyof ICytologyQcRuleService> = Parameters<ICytologyQcRuleService[K]>;
const BASE = '/api/cytology-qc/cytology-qc-rule';

export const createHttpCytologyQcRuleService = (client: ApiHttpClient): ICytologyQcRuleService =>
  buildHttpService<ICytologyQcRuleService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getActive: result('GET', () => `${BASE}/get-active`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    add: result('POST', () => `${BASE}/add`, { body: (rule: P<'add'>[0]) => (rule) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    deactivate: result('POST', () => `${BASE}/deactivate`, { body: (id: P<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => `${BASE}/reactivate`, { body: (id: P<'reactivate'>[0]) => ({ id }) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (id: P<'remove'>[0]) => ({ id }) }),
    duplicate: result('POST', () => `${BASE}/duplicate`, { body: (id: P<'duplicate'>[0], name: P<'duplicate'>[1]) => ({ id, name }) }),
  });
