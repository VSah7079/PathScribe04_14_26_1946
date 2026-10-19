// src/services/cytology/httpMolecularQcRunRecordService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of IMolecularQcRunRecordService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { IMolecularQcRunRecordService } from './IMolecularQcRunRecordService';

type P<K extends keyof IMolecularQcRunRecordService> = Parameters<IMolecularQcRunRecordService[K]>;
const BASE = '/api/cytology/molecular-qc-run-record';

export const createHttpMolecularQcRunRecordService = (client: ApiHttpClient): IMolecularQcRunRecordService =>
  buildHttpService<IMolecularQcRunRecordService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    add: result('POST', () => `${BASE}/add`, { body: (record: P<'add'>[0]) => (record) }),
  });
