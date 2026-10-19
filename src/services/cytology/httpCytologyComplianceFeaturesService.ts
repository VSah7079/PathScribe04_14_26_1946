// src/services/cytology/httpCytologyComplianceFeaturesService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ICytologyComplianceFeaturesService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, done, queryString, required } from '../apiServer/httpServiceKit';
import type { ICytologyComplianceFeaturesService } from './ICytologyComplianceFeaturesService';

type P<K extends keyof ICytologyComplianceFeaturesService> = Parameters<ICytologyComplianceFeaturesService[K]>;
const BASE = '/api/cytology/cytology-compliance-features';

export const createHttpCytologyComplianceFeaturesService = (client: ApiHttpClient): ICytologyComplianceFeaturesService =>
  buildHttpService<ICytologyComplianceFeaturesService>(client, {
    get: required('GET', () => `${BASE}/get`, { pick: (d: unknown) => ({ ok: true as const, data: d as never }) }),
    forFacility: required('GET', (facilityId: P<'forFacility'>[0]) => `${BASE}/for-facility${queryString({ facilityId })}`),
    setEnterprise: done('POST', () => `${BASE}/set-enterprise`, { body: (settings: P<'setEnterprise'>[0]) => (settings) }),
    setFacility: done('POST', () => `${BASE}/set-facility`, { body: (facilityId: P<'setFacility'>[0], settings: P<'setFacility'>[1]) => ({ facilityId, settings }) }),
  });
