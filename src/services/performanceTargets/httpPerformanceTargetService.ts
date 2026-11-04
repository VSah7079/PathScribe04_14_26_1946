// src/services/performanceTargets/httpPerformanceTargetService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IPerformanceTargetService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_DICTIONARIES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';

import type { IPerformanceTargetService } from './IPerformanceTargetService';

type P<K extends keyof IPerformanceTargetService> = Parameters<IPerformanceTargetService[K]>;
const BASE = '/api/performance-targets/performance-target';

export const createHttpPerformanceTargetService = (client: ApiHttpClient): IPerformanceTargetService =>
  buildHttpService<IPerformanceTargetService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    getByKey: result('GET', (key: P<'getByKey'>[0]) => `${BASE}/get-by-key${queryString({ key })}`),
    add: result('POST', () => `${BASE}/add`, { body: (t: P<'add'>[0]) => (t) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    delete: result('POST', () => `${BASE}/delete`, { body: (id: P<'delete'>[0]) => ({ id }) }),
  });
