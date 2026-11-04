// src/services/stains/httpStainOrderMacroService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of IStainOrderMacroService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/MACROS_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { IStainOrderMacroService } from './IStainService';
const BASE = '/api/stains/stain-order-macro';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpStainOrderMacroService = (client: ApiHttpClient): IStainOrderMacroService =>
  buildHttpService<IStainOrderMacroService>(client, {
    getAll: result('GET', () => route('getAll')),
    add: result('POST', () => route('add'), { body: (entry: object) => entry }),
    update: result('POST', () => route('update'), { body: (id: string, changes: object) => ({ id, changes }) }),
  });
