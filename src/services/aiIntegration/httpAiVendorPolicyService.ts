// src/services/aiIntegration/httpAiVendorPolicyService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of IAiVendorPolicyService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/AI_VENDOR_POLICY_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result, value } from '../apiServer/httpServiceKit';
import type { IAiVendorPolicyService } from './aiVendorPolicyService';

type Args<K extends keyof IAiVendorPolicyService> = Parameters<IAiVendorPolicyService[K]>;
const BASE = '/api/ai-integration/ai-vendor-policy';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpAiVendorPolicyService = (client: ApiHttpClient): IAiVendorPolicyService =>
  buildHttpService<IAiVendorPolicyService>(client, {
    list: result('GET', () => route('list')),
    save: result('POST', () => route('save'), { body: (rule: object) => rule }),
    remove: result('POST', () => route('remove'), { body: (scope: Args<'remove'>[0]) => ({ scope }) }),
    rulesForCheck: value('GET', () => route('rulesForCheck'), { missing: [], fallback: [] }),
    served: value('GET', () => route('served'), { missing: { scopes: [], facilities: [], jurisdictions: [] }, fallback: { scopes: [], facilities: [], jurisdictions: [] } }),
  });
