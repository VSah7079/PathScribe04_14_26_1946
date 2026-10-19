// src/services/intraop/httpIntraopCriticalResultService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IIntraopCriticalResultService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/INTRAOP_CRITICAL_RESULTS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { IIntraopCriticalResultService } from './IIntraopCriticalResultService';

type P<K extends keyof IIntraopCriticalResultService> = Parameters<IIntraopCriticalResultService[K]>;
const BASE = '/api/intraop/intraop-critical-result';

export const createHttpIntraopCriticalResultService = (client: ApiHttpClient): IIntraopCriticalResultService =>
  buildHttpService<IIntraopCriticalResultService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    add: result('POST', () => `${BASE}/add`, { body: (entry: P<'add'>[0]) => (entry) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    setActive: result('POST', () => `${BASE}/set-active`, { body: (id: P<'setActive'>[0], active: P<'setActive'>[1]) => ({ id, active }) }),
  });
