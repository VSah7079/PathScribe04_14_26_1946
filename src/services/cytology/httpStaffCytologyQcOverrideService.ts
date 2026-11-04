// src/services/cytology/httpStaffCytologyQcOverrideService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of IStaffCytologyQcOverrideService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IStaffCytologyQcOverrideService } from './IStaffCytologyQcOverrideService';

type P<K extends keyof IStaffCytologyQcOverrideService> = Parameters<IStaffCytologyQcOverrideService[K]>;
const BASE = '/api/cytology/staff-cytology-qc-override';

export const createHttpStaffCytologyQcOverrideService = (client: ApiHttpClient): IStaffCytologyQcOverrideService =>
  buildHttpService<IStaffCytologyQcOverrideService>(client, {
    getForStaff: result('GET', (staffUserId: P<'getForStaff'>[0]) => `${BASE}/get-for-staff${queryString({ staffUserId })}`),
    create: result('POST', () => `${BASE}/create`, { body: (staffUserId: P<'create'>[0], overrides: P<'create'>[1]) => ({ staffUserId, overrides }) }),
    update: result('POST', () => `${BASE}/update`, { body: (staffUserId: P<'update'>[0], changes: P<'update'>[1]) => ({ staffUserId, changes }) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (staffUserId: P<'remove'>[0]) => ({ staffUserId }) }),
  });
