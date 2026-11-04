// src/services/billing/httpBillingTypeTriggerConfigService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IBillingTypeTriggerConfigService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/BILLING_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IBillingTypeTriggerConfigService } from './mockBillingTypeTriggerConfigService';

type P<K extends keyof IBillingTypeTriggerConfigService> = Parameters<IBillingTypeTriggerConfigService[K]>;
const BASE = '/api/billing/billing-type-trigger-config';

export const createHttpBillingTypeTriggerConfigService = (client: ApiHttpClient): IBillingTypeTriggerConfigService =>
  buildHttpService<IBillingTypeTriggerConfigService>(client, {
    getEffectiveTriggerMap: result('GET', (siteId: P<'getEffectiveTriggerMap'>[0]) => `${BASE}/get-effective-trigger-map${queryString({ siteId })}`),
    setTriggerOverride: result('POST', () => `${BASE}/set-trigger-override`, { body: (map: P<'setTriggerOverride'>[0], siteId: P<'setTriggerOverride'>[1]) => ({ map, siteId }) }),
    resetToDefault: result('POST', () => `${BASE}/reset-to-default`, { body: (siteId: P<'resetToDefault'>[0]) => ({ siteId }) }),
    getSiteIdsWithOverrides: result('GET', () => `${BASE}/get-site-ids-with-overrides`),
  });
