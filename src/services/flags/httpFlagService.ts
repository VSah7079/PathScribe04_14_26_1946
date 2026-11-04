// src/services/flags/httpFlagService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of IFlagService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/FLAGS_AND_MESSAGES_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IFlagService } from './IFlagService';

type Args<K extends keyof IFlagService> = Parameters<IFlagService[K]>;
const BASE = '/api/flags/flag';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpFlagService = (client: ApiHttpClient): IFlagService =>
  buildHttpService<IFlagService>(client, {
    getAll: result('GET', () => route('getAll')),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    add: result('POST', () => route('add'), { body: (flag: object) => flag }),
    update: result('POST', () => route('update'), { body: (id: string, changes: object) => ({ id, changes }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => route('reactivate'), { body: (id: Args<'reactivate'>[0]) => ({ id }) }),
  });
