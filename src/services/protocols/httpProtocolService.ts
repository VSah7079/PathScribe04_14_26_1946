// src/services/protocols/httpProtocolService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of IProtocolService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/PROTOCOLS_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { IProtocolService } from './IProtocolService';
const BASE = '/api/protocols/protocol';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpProtocolService = (client: ApiHttpClient): IProtocolService =>
  buildHttpService<IProtocolService>(client, {
    getAll: result('GET', () => route('getAll')),
    add: result('POST', () => route('add'), { body: (entry: object) => entry }),
    update: result('POST', () => route('update'), { body: (id: string, changes: object) => ({ id, changes }) }),
    restoreVersion: result('POST', () => route('restoreVersion'), { body: (id: string, version: number) => ({ id, version }) }),
  });
