// src/services/billing/httpPlaceOfServiceCodeService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498): the API server's version of IPlaceOfServiceCodeService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/BILLING_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IPlaceOfServiceCodeService } from './IPlaceOfServiceCodeService';

type P<K extends keyof IPlaceOfServiceCodeService> = Parameters<IPlaceOfServiceCodeService[K]>;
const BASE = '/api/billing/place-of-service-code';

export const createHttpPlaceOfServiceCodeService = (client: ApiHttpClient): IPlaceOfServiceCodeService =>
  buildHttpService<IPlaceOfServiceCodeService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getActiveCodes: result('GET', () => `${BASE}/get-active-codes`),
    getVersionsForCode: result('GET', (code: P<'getVersionsForCode'>[0]) => `${BASE}/get-versions-for-code${queryString({ code })}`),
    getActiveCode: result('GET', (code: P<'getActiveCode'>[0]) => `${BASE}/get-active-code${queryString({ code })}`),
  });
