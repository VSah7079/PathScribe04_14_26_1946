// src/services/billingRelease/httpBillingReleaseService.ts
// Batch 619 (PS-800): the API server's version of IBillingReleaseService (HTTP_SERVICES_PATTERN.md §7).
// One route per method; a refusal is a fixed code. Contract: docs/architecture/BILLING_RELEASE_API.md
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IBillingReleaseService } from './IBillingReleaseService';

type P<K extends keyof IBillingReleaseService> = Parameters<IBillingReleaseService[K]>;
const BASE = '/api/billing-release/billing-release';

export const createHttpBillingReleaseService = (client: ApiHttpClient): IBillingReleaseService =>
  buildHttpService<IBillingReleaseService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getForFacility: result('GET', (facilityId: P<'getForFacility'>[0]) => `${BASE}/get-for-facility${queryString({ facilityId })}`),
    set: result('POST', () => `${BASE}/set`, { body: (input: P<'set'>[0]) => input }),
    remove: result('POST', () => `${BASE}/remove`, { body: (id: P<'remove'>[0]) => ({ id }) }),
  });
