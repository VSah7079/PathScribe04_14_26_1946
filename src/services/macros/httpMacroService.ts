// src/services/macros/httpMacroService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of IMacroService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/MACROS_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IMacroService } from './IMacroService';

type Args<K extends keyof IMacroService> = Parameters<IMacroService[K]>;
const BASE = '/api/macros/macro';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpMacroService = (client: ApiHttpClient): IMacroService =>
  buildHttpService<IMacroService>(client, {
    getAll: result('GET', () => route('getAll')),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    getByShortcut: result('GET', (shortcut: Args<'getByShortcut'>[0]) => `${route('getByShortcut')}${queryString({ shortcut })}`),
    getForSubspecialty: result('GET', (subspecialtyId: Args<'getForSubspecialty'>[0]) => `${route('getForSubspecialty')}${queryString({ subspecialtyId })}`),
    add: result('POST', () => route('add'), { body: (macro: object) => macro }),
    update: result('POST', () => route('update'), { body: (id: string, changes: object) => ({ id, changes }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => route('reactivate'), { body: (id: Args<'reactivate'>[0]) => ({ id }) }),
  });
