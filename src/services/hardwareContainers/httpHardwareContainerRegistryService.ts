// src/services/hardwareContainers/httpHardwareContainerRegistryService.ts
// Batch 616: the API server's version of IHardwareContainerRegistryService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/GROSSING_ROUTING_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IHardwareContainerRegistryService } from './IHardwareContainerRegistryService';

type P<K extends keyof IHardwareContainerRegistryService, N extends number> = Parameters<IHardwareContainerRegistryService[K]>[N];

type Args<K extends keyof IHardwareContainerRegistryService> = Parameters<IHardwareContainerRegistryService[K]>;
const BASE = '/api/hardware-containers/hardware-container-registry';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpHardwareContainerRegistryService(client: ApiHttpClient): IHardwareContainerRegistryService {
  const routes = buildHttpService<IHardwareContainerRegistryService>(client, {
    getAll: result('GET', () => route('getAll')),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    getByRackId: result('GET', (rackId: Args<'getByRackId'>[0]) => `${route('getByRackId')}${queryString({ rackId })}`),
    create: result('POST', () => route('create'), { body: (draft: P<'create', 0>) => draft }),
    update: result('POST', () => route('update'), { body: (id: P<'update', 0>, changes: P<'update', 1>) => ({ id, changes }) }),
    checkOut: result('POST', () => route('checkOut'), { body: (rackId: P<'checkOut', 0>, batchId: P<'checkOut', 1>) => ({ rackId, batchId }) }),
    checkIn: result('POST', () => route('checkIn'), { body: (rackId: Args<'checkIn'>[0]) => ({ rackId }) }),
  });
  return routes;
}
