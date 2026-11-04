// src/services/stains/httpMolecularTargetService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IMolecularTargetService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DICTIONARIES_CONFIG_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { IMolecularTargetService } from './IMolecularTargetService';

type P<K extends keyof IMolecularTargetService> = Parameters<IMolecularTargetService[K]>;
const BASE = '/api/stains/molecular-target';

export const createHttpMolecularTargetService = (client: ApiHttpClient): IMolecularTargetService =>
  buildHttpService<IMolecularTargetService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    add: result('POST', () => `${BASE}/add`, { body: (entry: P<'add'>[0]) => (entry) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
  });
