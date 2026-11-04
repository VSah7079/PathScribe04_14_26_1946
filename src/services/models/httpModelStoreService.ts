// src/services/models/httpModelStoreService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of IModelStoreService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/MODELS_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { IModelStoreService } from './mockModelStoreService';

type Args<K extends keyof IModelStoreService> = Parameters<IModelStoreService[K]>;
const BASE = '/api/models/model-store';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpModelStoreService = (client: ApiHttpClient): IModelStoreService =>
  buildHttpService<IModelStoreService>(client, {
    checkAuthorization: result('GET', () => route('checkAuthorization')),
    getAvailable: result('GET', () => route('getAvailable')),
    download: result('POST', () => route('download'), { body: (modelId: Args<'download'>[0]) => ({ modelId }) }),
  });
