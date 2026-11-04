// src/services/assetLocation/httpAssetLocationDictionaryService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IAssetLocationDictionaryService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_SERVICES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IAssetLocationDictionaryService } from './IAssetLocationDictionaryService';

type P<K extends keyof IAssetLocationDictionaryService> = Parameters<IAssetLocationDictionaryService[K]>;
const BASE = '/api/asset-location/asset-location-dictionary';

export const createHttpAssetLocationDictionaryService = (client: ApiHttpClient): IAssetLocationDictionaryService =>
  buildHttpService<IAssetLocationDictionaryService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    add: result('POST', () => `${BASE}/add`, { body: (entry: P<'add'>[0]) => (entry) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    verify: result('POST', () => `${BASE}/verify`, { body: (id: P<'verify'>[0]) => ({ id }) }),
    deactivate: result('POST', () => `${BASE}/deactivate`, { body: (id: P<'deactivate'>[0]) => ({ id }) }),
    findOrCreateByName: result('GET', (name: P<'findOrCreateByName'>[0], note: P<'findOrCreateByName'>[1]) => `${BASE}/find-or-create-by-name${queryString({ name, note })}`),
  });
