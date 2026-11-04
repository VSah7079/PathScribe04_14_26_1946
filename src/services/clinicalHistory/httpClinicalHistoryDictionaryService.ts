// src/services/clinicalHistory/httpClinicalHistoryDictionaryService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IClinicalHistoryDictionaryService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_SERVICES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IClinicalHistoryDictionaryService } from './IClinicalHistoryDictionaryService';

type P<K extends keyof IClinicalHistoryDictionaryService> = Parameters<IClinicalHistoryDictionaryService[K]>;
const BASE = '/api/clinical-history/clinical-history-dictionary';

export const createHttpClinicalHistoryDictionaryService = (client: ApiHttpClient): IClinicalHistoryDictionaryService =>
  buildHttpService<IClinicalHistoryDictionaryService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getActive: result('GET', () => `${BASE}/get-active`),
    getByCategory: result('GET', (categoryCode: P<'getByCategory'>[0]) => `${BASE}/get-by-category${queryString({ categoryCode })}`),
    getBySpecimenFamily: result('GET', (specimenFamily: P<'getBySpecimenFamily'>[0]) => `${BASE}/get-by-specimen-family${queryString({ specimenFamily })}`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    add: result('POST', () => `${BASE}/add`, { body: (entry: P<'add'>[0]) => (entry) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    deactivate: result('POST', () => `${BASE}/deactivate`, { body: (id: P<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => `${BASE}/reactivate`, { body: (id: P<'reactivate'>[0]) => ({ id }) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (id: P<'remove'>[0]) => ({ id }) }),
  });
