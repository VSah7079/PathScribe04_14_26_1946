// src/services/systemConfig/httpSystemConfigService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ISystemConfigService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DICTIONARIES_CONFIG_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ISystemConfigService } from './ISystemConfigService';

type P<K extends keyof ISystemConfigService> = Parameters<ISystemConfigService[K]>;
const BASE = '/api/system-config/system-config';

export const createHttpSystemConfigService = (client: ApiHttpClient): ISystemConfigService =>
  buildHttpService<ISystemConfigService>(client, {
    get: result('GET', () => `${BASE}/get`),
    update: result('POST', () => `${BASE}/update`, { body: (changes: P<'update'>[0]) => (changes) }),
  });
