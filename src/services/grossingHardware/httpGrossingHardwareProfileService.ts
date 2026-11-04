// src/services/grossingHardware/httpGrossingHardwareProfileService.ts
// Batch 616: the API server's version of IGrossingHardwareProfileService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/GROSSING_ROUTING_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { notFoundAsNull } from '../apiServer/notFoundAsNull';
import type { IGrossingHardwareProfileService } from './IGrossingHardwareProfileService';

type P<K extends keyof IGrossingHardwareProfileService, N extends number> = Parameters<IGrossingHardwareProfileService[K]>[N];

type Args<K extends keyof IGrossingHardwareProfileService> = Parameters<IGrossingHardwareProfileService[K]>;
const BASE = '/api/grossing-hardware/grossing-hardware-profile';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpGrossingHardwareProfileService(client: ApiHttpClient): IGrossingHardwareProfileService {
  const routes = buildHttpService<IGrossingHardwareProfileService>(client, {
    getAll: result('GET', () => route('getAll')),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    create: result('POST', () => route('create'), { body: (profile: P<'create', 0>) => profile }),
    update: result('POST', () => route('update'), { body: (id: P<'update', 0>, changes: P<'update', 1>) => ({ id, changes }) }),
  });
  return {
    ...routes,
    getById: (...a: Parameters<IGrossingHardwareProfileService['getById']>) => notFoundAsNull(routes.getById(...a)),
  };
}
