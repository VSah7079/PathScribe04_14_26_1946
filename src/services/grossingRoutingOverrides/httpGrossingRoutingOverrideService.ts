// src/services/grossingRoutingOverrides/httpGrossingRoutingOverrideService.ts
// Batch 616: the API server's version of IGrossingRoutingOverrideService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/GROSSING_ROUTING_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { IGrossingRoutingOverrideService } from './IGrossingRoutingOverrideService';

type P<K extends keyof IGrossingRoutingOverrideService, N extends number> = Parameters<IGrossingRoutingOverrideService[K]>[N];

type Args<K extends keyof IGrossingRoutingOverrideService> = Parameters<IGrossingRoutingOverrideService[K]>;
const BASE = '/api/grossing-routing-overrides/grossing-routing-override';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpGrossingRoutingOverrideService(client: ApiHttpClient): IGrossingRoutingOverrideService {
  const routes = buildHttpService<IGrossingRoutingOverrideService>(client, {
    getAll: result('GET', () => route('getAll')),
    add: result('POST', () => route('add'), { body: (entry: P<'add', 0>) => entry }),
    update: result('POST', () => route('update'), { body: (id: P<'update', 0>, changes: P<'update', 1>) => ({ id, changes }) }),
    remove: result('POST', () => route('remove'), { body: (id: Args<'remove'>[0]) => ({ id }) }),
  });
  return routes;
}
