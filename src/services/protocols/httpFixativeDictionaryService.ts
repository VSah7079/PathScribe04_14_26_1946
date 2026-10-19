// src/services/protocols/httpFixativeDictionaryService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of IFixativeDictionaryService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/PROTOCOLS_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { IFixativeDictionaryService } from './IPathwayMaterialDictionaryService';
const BASE = '/api/protocols/fixative-dictionary';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpFixativeDictionaryService = (client: ApiHttpClient): IFixativeDictionaryService =>
  buildHttpService<IFixativeDictionaryService>(client, {
    getAll: result('GET', () => route('getAll')),
    add: result('POST', () => route('add'), { body: (entry: object) => entry }),
    update: result('POST', () => route('update'), { body: (id: string, changes: object) => ({ id, changes }) }),
  });
