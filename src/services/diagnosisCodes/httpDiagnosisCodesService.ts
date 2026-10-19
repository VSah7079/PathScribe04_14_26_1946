// src/services/diagnosisCodes/httpDiagnosisCodesService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IDiagnosisCodesService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_DICTIONARIES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';

import type { IDiagnosisCodesService } from './IDiagnosisCodesService';

type P<K extends keyof IDiagnosisCodesService> = Parameters<IDiagnosisCodesService[K]>;
const BASE = '/api/diagnosis-codes/diagnosis-codes';

export const createHttpDiagnosisCodesService = (client: ApiHttpClient): IDiagnosisCodesService =>
  buildHttpService<IDiagnosisCodesService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    search: result('POST', () => `${BASE}/search`, { body: (query: P<'search'>[0]) => ({ query }) }),
  });
