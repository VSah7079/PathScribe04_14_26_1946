// src/services/cancerRegistry/httpCancerRegistrySettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-504): the API server's version of ICancerRegistrySettingsService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/REGISTRY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ICancerRegistrySettingsService } from './ICancerRegistrySettingsService';

type P<K extends keyof ICancerRegistrySettingsService> = Parameters<ICancerRegistrySettingsService[K]>;
const BASE = '/api/cancer-registry/cancer-registry-settings';

export const createHttpCancerRegistrySettingsService = (client: ApiHttpClient): ICancerRegistrySettingsService =>
  buildHttpService<ICancerRegistrySettingsService>(client, {
    get: result('GET', () => `${BASE}/get`),
    update: result('POST', () => `${BASE}/update`, { body: (patch: P<'update'>[0]) => (patch) }),
    reset: result('POST', () => `${BASE}/reset`),
  });
