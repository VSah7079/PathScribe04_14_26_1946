// src/services/digitalPathology/httpDpVendorService.ts
// Batch 616: the API server's version of IDpVendorService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/DIGITAL_PATHOLOGY_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IDpVendorService } from './IDpVendorService';

type P<K extends keyof IDpVendorService, N extends number> = Parameters<IDpVendorService[K]>[N];

type Args<K extends keyof IDpVendorService> = Parameters<IDpVendorService[K]>;
const BASE = '/api/digital-pathology/dp-vendor';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpDpVendorService(client: ApiHttpClient): IDpVendorService {
  const routes = buildHttpService<IDpVendorService>(client, {
    getAll: result('GET', () => route('getAll')),
    getActive: result('GET', () => route('getActive')),
    getByModality: result('GET', (modality: Args<'getByModality'>[0]) => `${route('getByModality')}${queryString({ modality })}`),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    add: result('POST', () => route('add'), { body: (entry: P<'add', 0>) => entry }),
    update: result('POST', () => route('update'), { body: (id: P<'update', 0>, changes: P<'update', 1>) => ({ id, changes }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => route('reactivate'), { body: (id: Args<'reactivate'>[0]) => ({ id }) }),
    remove: result('POST', () => route('remove'), { body: (id: Args<'remove'>[0]) => ({ id }) }),
  });
  return routes;
}
