// src/services/screeningRegistry/httpScreeningRegistryConfigService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-504): the API server's version of IScreeningRegistryConfigService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/REGISTRY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IScreeningRegistryConfigService } from './IScreeningRegistryConfigService';

type P<K extends keyof IScreeningRegistryConfigService> = Parameters<IScreeningRegistryConfigService[K]>;
const BASE = '/api/screening-registry/screening-registry-config';

export const createHttpScreeningRegistryConfigService = (client: ApiHttpClient): IScreeningRegistryConfigService =>
  buildHttpService<IScreeningRegistryConfigService>(client, {
    get: result('GET', (registryId: P<'get'>[0]) => `${BASE}/get${queryString({ registryId })}`),
    save: result('POST', () => `${BASE}/save`, { body: (config: P<'save'>[0]) => (config) }),
  });
