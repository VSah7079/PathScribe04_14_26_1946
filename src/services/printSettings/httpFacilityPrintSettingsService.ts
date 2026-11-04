// src/services/printSettings/httpFacilityPrintSettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IFacilityPrintSettingsService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DELIVERY_PRINTING_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';

import type { IFacilityPrintSettingsService } from './IFacilityPrintSettingsService';

type P<K extends keyof IFacilityPrintSettingsService> = Parameters<IFacilityPrintSettingsService[K]>;
const BASE = '/api/print-settings/facility-print-settings';

export const createHttpFacilityPrintSettingsService = (client: ApiHttpClient): IFacilityPrintSettingsService =>
  buildHttpService<IFacilityPrintSettingsService>(client, {
    getForFacility: result('GET', (facilityId: P<'getForFacility'>[0]) => `${BASE}/get-for-facility${queryString({ facilityId })}`),
    create: result('POST', () => `${BASE}/create`, { body: (facilityId: P<'create'>[0], overrides: P<'create'>[1]) => ({ facilityId, overrides }) }),
    update: result('POST', () => `${BASE}/update`, { body: (facilityId: P<'update'>[0], changes: P<'update'>[1]) => ({ facilityId, changes }) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (facilityId: P<'remove'>[0]) => ({ facilityId }) }),
  });
