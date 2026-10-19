// src/services/cytology/httpSnomedCervicalHistologySeverityMappingService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of ISnomedCervicalHistologySeverityMappingService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ISnomedCervicalHistologySeverityMappingService } from './ISnomedCervicalHistologySeverityMappingService';

type P<K extends keyof ISnomedCervicalHistologySeverityMappingService> = Parameters<ISnomedCervicalHistologySeverityMappingService[K]>;
const BASE = '/api/cytology/snomed-cervical-histology-severity-mapping';

export const createHttpSnomedCervicalHistologySeverityMappingService = (client: ApiHttpClient): ISnomedCervicalHistologySeverityMappingService =>
  buildHttpService<ISnomedCervicalHistologySeverityMappingService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    add: result('POST', () => `${BASE}/add`, { body: (entry: P<'add'>[0]) => (entry) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (id: P<'remove'>[0]) => ({ id }) }),
  });
