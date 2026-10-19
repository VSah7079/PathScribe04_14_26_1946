// src/services/models/httpModelService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of IModelService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/MODELS_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IModelService } from './IModelService';

type Args<K extends keyof IModelService> = Parameters<IModelService[K]>;
const BASE = '/api/models/model';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpModelService = (client: ApiHttpClient): IModelService =>
  buildHttpService<IModelService>(client, {
    getAll: result('GET', () => route('getAll')),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    getActive: result('GET', () => route('getActive')),
    getDefault: result('GET', () => route('getDefault')),
    getDefaultVoiceModel: result('GET', () => route('getDefaultVoiceModel')),
    setDefault: result('POST', () => route('setDefault'), { body: (id: Args<'setDefault'>[0]) => ({ id }) }),
    update: result('POST', () => route('update'), { body: (id: string, changes: object) => ({ id, changes }) }),
    retire: result('POST', () => route('retire'), { body: (id: Args<'retire'>[0]) => ({ id }) }),
    adopt: result('POST', () => route('adopt'), { body: (modelId: string) => ({ modelId }) }),
  });
