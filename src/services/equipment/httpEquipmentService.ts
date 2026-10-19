// src/services/equipment/httpEquipmentService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IEquipmentService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/EQUIPMENT_MIGRATION_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';

import type { IEquipmentService } from './IEquipmentService';

type P<K extends keyof IEquipmentService> = Parameters<IEquipmentService[K]>;
const BASE = '/api/equipment/equipment';

export const createHttpEquipmentService = (client: ApiHttpClient): IEquipmentService =>
  buildHttpService<IEquipmentService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getActive: result('GET', (kind: P<'getActive'>[0]) => `${BASE}/get-active${queryString({ kind })}`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    getByCode: result('GET', (code: P<'getByCode'>[0]) => `${BASE}/get-by-code${queryString({ code })}`),
    create: result('POST', () => `${BASE}/create`, { body: (draft: P<'create'>[0]) => (draft) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    deactivate: result('POST', () => `${BASE}/deactivate`, { body: (id: P<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => `${BASE}/reactivate`, { body: (id: P<'reactivate'>[0]) => ({ id }) }),
  });
