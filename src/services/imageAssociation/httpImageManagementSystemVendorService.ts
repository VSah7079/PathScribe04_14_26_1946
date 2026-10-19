// src/services/imageAssociation/httpImageManagementSystemVendorService.ts
// Batch 616: the API server's version of IImageManagementSystemVendorService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/DIGITAL_PATHOLOGY_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IImageManagementSystemVendorService } from './IImageManagementSystemVendorService';

type P<K extends keyof IImageManagementSystemVendorService, N extends number> = Parameters<IImageManagementSystemVendorService[K]>[N];

type Args<K extends keyof IImageManagementSystemVendorService> = Parameters<IImageManagementSystemVendorService[K]>;
const BASE = '/api/image-association/image-management-system-vendor';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpImageManagementSystemVendorService(client: ApiHttpClient): IImageManagementSystemVendorService {
  const routes = buildHttpService<IImageManagementSystemVendorService>(client, {
    getAll: result('GET', () => route('getAll')),
    getActive: result('GET', () => route('getActive')),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    add: result('POST', () => route('add'), { body: (entry: P<'add', 0>) => entry }),
    update: result('POST', () => route('update'), { body: (id: P<'update', 0>, changes: P<'update', 1>) => ({ id, changes }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => route('reactivate'), { body: (id: Args<'reactivate'>[0]) => ({ id }) }),
    remove: result('POST', () => route('remove'), { body: (id: Args<'remove'>[0]) => ({ id }) }),
  });
  return routes;
}
