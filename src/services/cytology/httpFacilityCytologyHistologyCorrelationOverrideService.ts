// src/services/cytology/httpFacilityCytologyHistologyCorrelationOverrideService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of IFacilityCytologyHistologyCorrelationOverrideService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IFacilityCytologyHistologyCorrelationOverrideService } from './ICytologyHistologyCorrelationSettingsService';

type P<K extends keyof IFacilityCytologyHistologyCorrelationOverrideService> = Parameters<IFacilityCytologyHistologyCorrelationOverrideService[K]>;
const BASE = '/api/cytology/facility-cytology-histology-correlation-override';

export const createHttpFacilityCytologyHistologyCorrelationOverrideService = (client: ApiHttpClient): IFacilityCytologyHistologyCorrelationOverrideService =>
  buildHttpService<IFacilityCytologyHistologyCorrelationOverrideService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getForFacility: result('GET', (facilityId: P<'getForFacility'>[0]) => `${BASE}/get-for-facility${queryString({ facilityId })}`),
    set: result('POST', () => `${BASE}/set`, { body: (facilityId: P<'set'>[0], overrides: P<'set'>[1]) => ({ facilityId, overrides }) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (facilityId: P<'remove'>[0]) => ({ facilityId }) }),
  });
