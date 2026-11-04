// src/services/migration/httpMigrationRecordResultService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IMigrationRecordResultService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/EQUIPMENT_MIGRATION_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';

import type { IMigrationRecordResultService } from './IMigrationRecordResultService';

type P<K extends keyof IMigrationRecordResultService> = Parameters<IMigrationRecordResultService[K]>;
const BASE = '/api/migration/migration-record-result';

export const createHttpMigrationRecordResultService = (client: ApiHttpClient): IMigrationRecordResultService =>
  buildHttpService<IMigrationRecordResultService>(client, {
    getByJobId: result('GET', (migrationJobId: P<'getByJobId'>[0]) => `${BASE}/get-by-job-id${queryString({ migrationJobId })}`),
    record: result('POST', () => `${BASE}/record`, { body: (result: P<'record'>[0]) => (result) }),
  });
