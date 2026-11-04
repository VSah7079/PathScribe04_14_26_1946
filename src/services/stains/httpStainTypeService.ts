// src/services/stains/httpStainTypeService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IStainTypeService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DICTIONARIES_CONFIG_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { IStainTypeService } from './IStainService';

type P<K extends keyof IStainTypeService> = Parameters<IStainTypeService[K]>;
const BASE = '/api/stains/stain-type';

export const createHttpStainTypeService = (client: ApiHttpClient): IStainTypeService =>
  buildHttpService<IStainTypeService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    add: result('POST', () => `${BASE}/add`, { body: (entry: P<'add'>[0]) => (entry) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
  });
