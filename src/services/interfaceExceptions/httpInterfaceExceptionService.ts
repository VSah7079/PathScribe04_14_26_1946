// src/services/interfaceExceptions/httpInterfaceExceptionService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of IInterfaceExceptionService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/INTERFACE_EXCEPTIONS_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IInterfaceExceptionService } from './IInterfaceExceptionService';

type Args<K extends keyof IInterfaceExceptionService> = Parameters<IInterfaceExceptionService[K]>;
const BASE = '/api/interface-exceptions/interface-exception';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpInterfaceExceptionService = (client: ApiHttpClient): IInterfaceExceptionService =>
  buildHttpService<IInterfaceExceptionService>(client, {
    getAll: result('GET', () => route('getAll')),
    getPending: result('GET', () => route('getPending')),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    create: result('POST', () => route('create'), { body: (input: object) => input }),
    resolve: result('POST', () => route('resolve'), { body: (id: string, resolvedBy: string, note?: string | undefined) => ({ id, resolvedBy, note }) }),
    dismiss: result('POST', () => route('dismiss'), { body: (id: string, resolvedBy: string, note?: string | undefined) => ({ id, resolvedBy, note }) }),
  });
