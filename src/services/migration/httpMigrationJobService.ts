// src/services/migration/httpMigrationJobService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IMigrationJobService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/EQUIPMENT_MIGRATION_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';

import type { IMigrationJobService } from './IMigrationJobService';

type P<K extends keyof IMigrationJobService> = Parameters<IMigrationJobService[K]>;
const BASE = '/api/migration/migration-job';

export const createHttpMigrationJobService = (client: ApiHttpClient): IMigrationJobService =>
  buildHttpService<IMigrationJobService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    create: result('POST', () => `${BASE}/create`, { body: (entry: P<'create'>[0]) => (entry) }),
    start: result('POST', () => `${BASE}/start`, { body: (id: P<'start'>[0]) => ({ id }) }),
    recordOutcome: result('POST', () => `${BASE}/record-outcome`, { body: (id: P<'recordOutcome'>[0], outcome: P<'recordOutcome'>[1]) => ({ id, outcome }) }),
    complete: result('POST', () => `${BASE}/complete`, { body: (id: P<'complete'>[0]) => ({ id }) }),
  });
