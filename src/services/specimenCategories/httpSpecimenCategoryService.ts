// src/services/specimenCategories/httpSpecimenCategoryService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ISpecimenCategoryService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DICTIONARIES_CONFIG_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ISpecimenCategoryService } from './ISpecimenCategoryService';

type P<K extends keyof ISpecimenCategoryService> = Parameters<ISpecimenCategoryService[K]>;
const BASE = '/api/specimen-categories/specimen-category';

export const createHttpSpecimenCategoryService = (client: ApiHttpClient): ISpecimenCategoryService =>
  buildHttpService<ISpecimenCategoryService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    add: result('POST', () => `${BASE}/add`, { body: (category: P<'add'>[0]) => (category) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    verify: result('POST', () => `${BASE}/verify`, { body: (id: P<'verify'>[0]) => ({ id }) }),
    deactivate: result('POST', () => `${BASE}/deactivate`, { body: (id: P<'deactivate'>[0]) => ({ id }) }),
    findOrCreateByName: result('GET', (name: P<'findOrCreateByName'>[0], note: P<'findOrCreateByName'>[1]) => `${BASE}/find-or-create-by-name${queryString({ name, note })}`),
  });
