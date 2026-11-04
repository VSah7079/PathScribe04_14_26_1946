// src/services/printRouting/httpPrintRoutingRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of IPrintRoutingRuleService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/ROUTING_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { IPrintRoutingRuleService } from './IPrintRoutingRuleService';

type Args<K extends keyof IPrintRoutingRuleService> = Parameters<IPrintRoutingRuleService[K]>;
const BASE = '/api/print-routing/print-routing-rule';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpPrintRoutingRuleService = (client: ApiHttpClient): IPrintRoutingRuleService =>
  buildHttpService<IPrintRoutingRuleService>(client, {
    getAll: result('GET', () => route('getAll')),
    getActive: result('GET', () => route('getActive')),
    create: result('POST', () => route('create'), { body: (rule: object) => rule }),
    update: result('POST', () => route('update'), { body: (id: string, changes: object) => ({ id, changes }) }),
    remove: result('POST', () => route('remove'), { body: (id: Args<'remove'>[0]) => ({ id }) }),
  });
