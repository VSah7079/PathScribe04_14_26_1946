// src/services/interfaceEngine/httpInterfaceEngineService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of IInterfaceEngineService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/INTERFACE_ENGINE_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IInterfaceEngineService } from './IInterfaceEngineService';

type Args<K extends keyof IInterfaceEngineService> = Parameters<IInterfaceEngineService[K]>;
const BASE = '/api/interface-engine/interface-engine';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpInterfaceEngineService = (client: ApiHttpClient): IInterfaceEngineService =>
  buildHttpService<IInterfaceEngineService>(client, {
    postOrderCreated: result('POST', () => route('postOrderCreated'), { body: (payload: object) => payload }),
    listDispatchedEvents: result('GET', (organisationId: Args<'listDispatchedEvents'>[0]) => `${route('listDispatchedEvents')}${queryString({ organisationId })}`),
    listDispatchTrail: result('GET', () => route('listDispatchTrail')),
  });
