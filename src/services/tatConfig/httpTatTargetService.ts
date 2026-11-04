// src/services/tatConfig/httpTatTargetService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ITatTargetService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DICTIONARIES_CONFIG_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ITatTargetService } from './ITatTargetService';

type P<K extends keyof ITatTargetService> = Parameters<ITatTargetService[K]>;
const BASE = '/api/tat-config/tat-target';

export const createHttpTatTargetService = (client: ApiHttpClient): ITatTargetService =>
  buildHttpService<ITatTargetService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    add: result('POST', () => `${BASE}/add`, { body: (entry: P<'add'>[0]) => (entry) }),
    update: result('POST', () => `${BASE}/update`, { body: (entry: P<'update'>[0]) => (entry) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (id: P<'remove'>[0]) => ({ id }) }),
  });
