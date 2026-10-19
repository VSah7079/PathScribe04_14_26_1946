// src/services/fonts/httpFontService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IFontService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_DICTIONARIES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';

import type { IFontService } from './IFontService';

type P<K extends keyof IFontService> = Parameters<IFontService[K]>;
const BASE = '/api/fonts/font';

export const createHttpFontService = (client: ApiHttpClient): IFontService =>
  buildHttpService<IFontService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getConfig: result('GET', () => `${BASE}/get-config`),
    updateConfig: result('POST', () => `${BASE}/update-config`, { body: (changes: P<'updateConfig'>[0]) => (changes) }),
    add: result('POST', () => `${BASE}/add`, { body: (font: P<'add'>[0]) => (font) }),
    deactivate: result('POST', () => `${BASE}/deactivate`, { body: (id: P<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => `${BASE}/reactivate`, { body: (id: P<'reactivate'>[0]) => ({ id }) }),
  });
