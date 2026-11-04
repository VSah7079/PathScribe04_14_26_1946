// src/services/billing/httpBillingDeficiencyService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498): the API server's version of IBillingDeficiencyService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/BILLING_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IBillingDeficiencyService } from './IBillingDeficiencyService';

type P<K extends keyof IBillingDeficiencyService> = Parameters<IBillingDeficiencyService[K]>;
const BASE = '/api/billing/billing-deficiency';

export const createHttpBillingDeficiencyService = (client: ApiHttpClient): IBillingDeficiencyService =>
  buildHttpService<IBillingDeficiencyService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    raise: result('POST', () => `${BASE}/raise`, { body: (deficiency: P<'raise'>[0]) => (deficiency) }),
    resolve: result('POST', () => `${BASE}/resolve`, { body: (id: P<'resolve'>[0], resolution: P<'resolve'>[1]) => ({ id, resolution }) }),
  });
