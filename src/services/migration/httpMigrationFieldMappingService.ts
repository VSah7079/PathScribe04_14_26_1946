// src/services/migration/httpMigrationFieldMappingService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IMigrationFieldMappingService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/EQUIPMENT_MIGRATION_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';

import type { IMigrationFieldMappingService } from './IMigrationFieldMappingService';

type P<K extends keyof IMigrationFieldMappingService> = Parameters<IMigrationFieldMappingService[K]>;
const BASE = '/api/migration/migration-field-mapping';

export const createHttpMigrationFieldMappingService = (client: ApiHttpClient): IMigrationFieldMappingService =>
  buildHttpService<IMigrationFieldMappingService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getBySourceSystem: result('GET', (sourceSystemName: P<'getBySourceSystem'>[0]) => `${BASE}/get-by-source-system${queryString({ sourceSystemName })}`),
    add: result('POST', () => `${BASE}/add`, { body: (entry: P<'add'>[0]) => (entry) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (id: P<'remove'>[0]) => ({ id }) }),
  });
