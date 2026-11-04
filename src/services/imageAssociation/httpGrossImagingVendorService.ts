// src/services/imageAssociation/httpGrossImagingVendorService.ts
// Batch 616: the API server's version of IGrossImagingVendorService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/DIGITAL_PATHOLOGY_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IGrossImagingVendorService } from './IGrossImagingVendorService';

type P<K extends keyof IGrossImagingVendorService, N extends number> = Parameters<IGrossImagingVendorService[K]>[N];

type Args<K extends keyof IGrossImagingVendorService> = Parameters<IGrossImagingVendorService[K]>;
const BASE = '/api/image-association/gross-imaging-vendor';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpGrossImagingVendorService(client: ApiHttpClient): IGrossImagingVendorService {
  const routes = buildHttpService<IGrossImagingVendorService>(client, {
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
