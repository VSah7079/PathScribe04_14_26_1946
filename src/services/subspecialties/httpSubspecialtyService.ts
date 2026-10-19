// src/services/subspecialties/httpSubspecialtyService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ISubspecialtyService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DICTIONARIES_CONFIG_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ISubspecialtyService } from './ISubspecialtyService';

type P<K extends keyof ISubspecialtyService> = Parameters<ISubspecialtyService[K]>;
const BASE = '/api/subspecialties/subspecialty';

export const createHttpSubspecialtyService = (client: ApiHttpClient): ISubspecialtyService =>
  buildHttpService<ISubspecialtyService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    add: result('POST', () => `${BASE}/add`, { body: (subspecialty: P<'add'>[0]) => (subspecialty) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    deactivate: result('POST', () => `${BASE}/deactivate`, { body: (id: P<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => `${BASE}/reactivate`, { body: (id: P<'reactivate'>[0]) => ({ id }) }),
    assignUser: result('POST', () => `${BASE}/assign-user`, { body: (subspecialtyId: P<'assignUser'>[0], userId: P<'assignUser'>[1]) => ({ subspecialtyId, userId }) }),
    removeUser: result('POST', () => `${BASE}/remove-user`, { body: (subspecialtyId: P<'removeUser'>[0], userId: P<'removeUser'>[1]) => ({ subspecialtyId, userId }) }),
    assignSpecimen: result('POST', () => `${BASE}/assign-specimen`, { body: (subspecialtyId: P<'assignSpecimen'>[0], specimenId: P<'assignSpecimen'>[1]) => ({ subspecialtyId, specimenId }) }),
    removeSpecimen: result('POST', () => `${BASE}/remove-specimen`, { body: (subspecialtyId: P<'removeSpecimen'>[0], specimenId: P<'removeSpecimen'>[1]) => ({ subspecialtyId, specimenId }) }),
  });
