// src/services/cassetteRouting/httpCassetteRoutingRuleService.ts
// Batch 616: the API server's version of ICassetteRoutingRuleService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/GROSSING_ROUTING_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { ICassetteRoutingRuleService } from './ICassetteRoutingRuleService';

type P<K extends keyof ICassetteRoutingRuleService, N extends number> = Parameters<ICassetteRoutingRuleService[K]>[N];

type Args<K extends keyof ICassetteRoutingRuleService> = Parameters<ICassetteRoutingRuleService[K]>;
const BASE = '/api/cassette-routing/cassette-routing-rule';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpCassetteRoutingRuleService(client: ApiHttpClient): ICassetteRoutingRuleService {
  const routes = buildHttpService<ICassetteRoutingRuleService>(client, {
    getAll: result('GET', () => route('getAll')),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    create: result('POST', () => route('create'), { body: (draft: P<'create', 0>) => draft }),
    update: result('POST', () => route('update'), { body: (id: P<'update', 0>, changes: P<'update', 1>) => ({ id, changes }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => route('reactivate'), { body: (id: Args<'reactivate'>[0]) => ({ id }) }),
  });
  return routes;
}
