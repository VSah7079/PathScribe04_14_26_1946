// src/services/cytology/httpCytologyRoutingSettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of ICytologyRoutingSettingsService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ICytologyRoutingSettingsService } from './ICytologyRoutingSettingsService';

type P<K extends keyof ICytologyRoutingSettingsService> = Parameters<ICytologyRoutingSettingsService[K]>;
const BASE = '/api/cytology/cytology-routing-settings';

export const createHttpCytologyRoutingSettingsService = (client: ApiHttpClient): ICytologyRoutingSettingsService =>
  buildHttpService<ICytologyRoutingSettingsService>(client, {
    get: result('GET', () => `${BASE}/get`),
    update: result('POST', () => `${BASE}/update`, { body: (patch: P<'update'>[0]) => (patch) }),
    reset: result('POST', () => `${BASE}/reset`),
  });
