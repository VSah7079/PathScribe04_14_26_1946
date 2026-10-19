// src/services/cytology/httpCytologyHistologyCorrelationSettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of ICytologyHistologyCorrelationSettingsService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ICytologyHistologyCorrelationSettingsService } from './ICytologyHistologyCorrelationSettingsService';

type P<K extends keyof ICytologyHistologyCorrelationSettingsService> = Parameters<ICytologyHistologyCorrelationSettingsService[K]>;
const BASE = '/api/cytology/cytology-histology-correlation-settings';

export const createHttpCytologyHistologyCorrelationSettingsService = (client: ApiHttpClient): ICytologyHistologyCorrelationSettingsService =>
  buildHttpService<ICytologyHistologyCorrelationSettingsService>(client, {
    get: result('GET', () => `${BASE}/get`),
    update: result('POST', () => `${BASE}/update`, { body: (patch: P<'update'>[0]) => (patch) }),
    reset: result('POST', () => `${BASE}/reset`),
  });
