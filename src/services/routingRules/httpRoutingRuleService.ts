// src/services/routingRules/httpRoutingRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of IRoutingRuleService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/ROUTING_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IRoutingRuleService } from './IRoutingRuleService';

type Args<K extends keyof IRoutingRuleService> = Parameters<IRoutingRuleService[K]>;
const BASE = '/api/routing-rules/routing-rule';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpRoutingRuleService = (client: ApiHttpClient): IRoutingRuleService =>
  buildHttpService<IRoutingRuleService>(client, {
    getAll: result('GET', () => route('getAll')),
    getByType: result('GET', (type: Args<'getByType'>[0]) => `${route('getByType')}${queryString({ type })}`),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    add: result('POST', () => route('add'), { body: (rule: object) => rule }),
    update: result('POST', () => route('update'), { body: (id: string, changes: object) => ({ id, changes }) }),
    remove: result('POST', () => route('remove'), { body: (id: Args<'remove'>[0]) => ({ id }) }),
    getFacilityMap: result('GET', (performingLabFacilityId: Args<'getFacilityMap'>[0]) => `${route('getFacilityMap')}${queryString({ performingLabFacilityId })}`),
    getPhysicianMap: result('GET', (performingLabFacilityId: Args<'getPhysicianMap'>[0]) => `${route('getPhysicianMap')}${queryString({ performingLabFacilityId })}`),
    getProtocolMap: result('GET', (performingLabFacilityId: Args<'getProtocolMap'>[0]) => `${route('getProtocolMap')}${queryString({ performingLabFacilityId })}`),
  });
