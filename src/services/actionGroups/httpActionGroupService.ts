// src/services/actionGroups/httpActionGroupService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IActionGroupService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_SERVICES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IActionGroupService } from './IActionGroupService';

type P<K extends keyof IActionGroupService> = Parameters<IActionGroupService[K]>;
const BASE = '/api/action-groups/action-group';

export const createHttpActionGroupService = (client: ApiHttpClient): IActionGroupService =>
  buildHttpService<IActionGroupService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    create: result('POST', () => `${BASE}/create`, { body: (draft: P<'create'>[0]) => (draft) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    deactivate: result('POST', () => `${BASE}/deactivate`, { body: (id: P<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => `${BASE}/reactivate`, { body: (id: P<'reactivate'>[0]) => ({ id }) }),
  });
