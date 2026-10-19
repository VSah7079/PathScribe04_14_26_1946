// src/services/spellcheck/httpCustomDictionaryService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ICustomDictionaryService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DICTIONARIES_CONFIG_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICustomDictionaryService, CustomWordResult } from './ICustomDictionaryService';
import type { CustomWordEntry, CustomWordRefusal } from './customDictionaryRules';

type P<K extends keyof ICustomDictionaryService> = Parameters<ICustomDictionaryService[K]>;
const BASE = '/api/spellcheck/custom-dictionary';

// This service's own result type carries a refusal `code`. The server answers with its short code
// (EMPTY, NOT_A_WORD, TOO_LONG, NOT_PERMITTED, NOT_FOUND); anything else is a refusal of permission.
const REFUSALS: readonly string[] = ['EMPTY', 'NOT_A_WORD', 'TOO_LONG', 'NOT_PERMITTED', 'NOT_FOUND'];
const withCode = <A extends unknown[]>(call: (...a: A) => Promise<CustomWordResult<CustomWordEntry[]>>) =>
  async (...a: A): Promise<CustomWordResult<CustomWordEntry[]>> => {
    const r = await call(...a);
    return r.ok ? r : { ok: false, error: r.error, code: (REFUSALS.includes(r.error) ? r.error : 'NOT_PERMITTED') as CustomWordRefusal };
  };

export const createHttpCustomDictionaryService = (client: ApiHttpClient): ICustomDictionaryService => {
  const http = buildHttpService<ICustomDictionaryService>(client, {
    listPersonal: result('GET', (userId: P<'listPersonal'>[0]) => `${BASE}/list-personal${queryString({ userId })}`),
    addPersonal: result('POST', () => `${BASE}/add-personal`, { body: (userId: P<'addPersonal'>[0], word: P<'addPersonal'>[1], actor: P<'addPersonal'>[2]) => ({ userId, word, actor }) }),
    removePersonal: result('POST', () => `${BASE}/remove-personal`, { body: (userId: P<'removePersonal'>[0], word: P<'removePersonal'>[1]) => ({ userId, word }) }),
    listFacility: result('GET', (facilityId: P<'listFacility'>[0]) => `${BASE}/list-facility${queryString({ facilityId })}`),
    addFacility: result('POST', () => `${BASE}/add-facility`, { body: (facilityId: P<'addFacility'>[0], word: P<'addFacility'>[1], actor: P<'addFacility'>[2], facilityLabel: P<'addFacility'>[3]) => ({ facilityId, word, actor, facilityLabel }) }),
    removeFacility: result('POST', () => `${BASE}/remove-facility`, { body: (facilityId: P<'removeFacility'>[0], word: P<'removeFacility'>[1], actor: P<'removeFacility'>[2], facilityLabel: P<'removeFacility'>[3]) => ({ facilityId, word, actor, facilityLabel }) }),
  });
  return {
    listPersonal: withCode(http.listPersonal), addPersonal: withCode(http.addPersonal), removePersonal: withCode(http.removePersonal),
    listFacility: withCode(http.listFacility), addFacility: withCode(http.addFacility), removeFacility: withCode(http.removeFacility),
  };
};
