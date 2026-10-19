// src/services/cytology/httpCytologyNomenclatureSettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of ICytologyNomenclatureSettingsService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ICytologyNomenclatureSettingsService } from './ICytologyNomenclatureSettingsService';

type P<K extends keyof ICytologyNomenclatureSettingsService> = Parameters<ICytologyNomenclatureSettingsService[K]>;
const BASE = '/api/cytology/cytology-nomenclature-settings';

export const createHttpCytologyNomenclatureSettingsService = (client: ApiHttpClient): ICytologyNomenclatureSettingsService =>
  buildHttpService<ICytologyNomenclatureSettingsService>(client, {
    get: result('GET', () => `${BASE}/get`),
    update: result('POST', () => `${BASE}/update`, { body: (patch: P<'update'>[0]) => (patch) }),
    reset: result('POST', () => `${BASE}/reset`),
  });
