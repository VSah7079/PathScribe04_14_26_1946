// src/services/savedSearches/httpSavedSearchService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ISavedSearchService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/SEARCH_REPORTING_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ISavedSearchService } from './ISavedSearchService';

type P<K extends keyof ISavedSearchService> = Parameters<ISavedSearchService[K]>;
const BASE = '/api/saved-searches/saved-search';

export const createHttpSavedSearchService = (client: ApiHttpClient): ISavedSearchService =>
  buildHttpService<ISavedSearchService>(client, {
    getForUser: result('GET', (userId: P<'getForUser'>[0]) => `${BASE}/get-for-user${queryString({ userId })}`),
    getForUserByContext: result('GET', (userId: P<'getForUserByContext'>[0], context: P<'getForUserByContext'>[1]) => `${BASE}/get-for-user-by-context${queryString({ userId, context })}`),
    save: result('POST', () => `${BASE}/save`, { body: (search: P<'save'>[0]) => (search) }),
    rename: result('POST', () => `${BASE}/rename`, { body: (id: P<'rename'>[0], name: P<'rename'>[1]) => ({ id, name }) }),
    delete: result('POST', () => `${BASE}/delete`, { body: (id: P<'delete'>[0]) => ({ id }) }),
    recordUse: result('POST', () => `${BASE}/record-use`, { body: (id: P<'recordUse'>[0]) => ({ id }) }),
  });
