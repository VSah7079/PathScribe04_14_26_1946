// src/services/cytology/httpFacilityCytologyScreeningStrategyOverrideService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of IFacilityCytologyScreeningStrategyOverrideService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IFacilityCytologyScreeningStrategyOverrideService } from './IFacilityCytologyScreeningStrategyOverrideService';

type P<K extends keyof IFacilityCytologyScreeningStrategyOverrideService> = Parameters<IFacilityCytologyScreeningStrategyOverrideService[K]>;
const BASE = '/api/cytology/facility-cytology-screening-strategy-override';

export const createHttpFacilityCytologyScreeningStrategyOverrideService = (client: ApiHttpClient): IFacilityCytologyScreeningStrategyOverrideService =>
  buildHttpService<IFacilityCytologyScreeningStrategyOverrideService>(client, {
    getForFacility: result('GET', (facilityId: P<'getForFacility'>[0]) => `${BASE}/get-for-facility${queryString({ facilityId })}`),
    create: result('POST', () => `${BASE}/create`, { body: (facilityId: P<'create'>[0], overrides: P<'create'>[1]) => ({ facilityId, overrides }) }),
    update: result('POST', () => `${BASE}/update`, { body: (facilityId: P<'update'>[0], changes: P<'update'>[1]) => ({ facilityId, changes }) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (facilityId: P<'remove'>[0]) => ({ facilityId }) }),
  });
