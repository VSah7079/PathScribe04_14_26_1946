// src/services/cytology/httpNonGynCytologyCategoryService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of INonGynCytologyCategoryService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { INonGynCytologyCategoryService } from './INonGynCytologyCategoryService';

type P<K extends keyof INonGynCytologyCategoryService> = Parameters<INonGynCytologyCategoryService[K]>;
const BASE = '/api/cytology/non-gyn-cytology-category';

export const createHttpNonGynCytologyCategoryService = (client: ApiHttpClient): INonGynCytologyCategoryService =>
  buildHttpService<INonGynCytologyCategoryService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getActive: result('GET', () => `${BASE}/get-active`),
    getBySystem: result('GET', (system: P<'getBySystem'>[0]) => `${BASE}/get-by-system${queryString({ system })}`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    add: result('POST', () => `${BASE}/add`, { body: (entry: P<'add'>[0]) => (entry) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    deactivate: result('POST', () => `${BASE}/deactivate`, { body: (id: P<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => `${BASE}/reactivate`, { body: (id: P<'reactivate'>[0]) => ({ id }) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (id: P<'remove'>[0]) => ({ id }) }),
  });
