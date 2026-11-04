// src/services/facilityOpsDashboard/httpDisplayProfileService.ts
// Batch 616: the API server's version of IDisplayProfileService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/INTRAOP_OPS_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IDisplayProfileService } from './IDisplayProfileService';

type P<K extends keyof IDisplayProfileService, N extends number> = Parameters<IDisplayProfileService[K]>[N];

type Args<K extends keyof IDisplayProfileService> = Parameters<IDisplayProfileService[K]>;
const BASE = '/api/facility-ops-dashboard/display-profile';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpDisplayProfileService(client: ApiHttpClient): IDisplayProfileService {
  const routes = buildHttpService<IDisplayProfileService>(client, {
    getAll: result('GET', () => route('getAll')),
    getActive: result('GET', () => route('getActive')),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    add: result('POST', () => route('add'), { body: (entry: P<'add', 0>) => entry }),
    update: result('POST', () => route('update'), { body: (id: P<'update', 0>, changes: P<'update', 1>) => ({ id, changes }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
  });
  return routes;
}
