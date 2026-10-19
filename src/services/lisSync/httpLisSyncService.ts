// src/services/lisSync/httpLisSyncService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ILisSyncService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/EQUIPMENT_MIGRATION_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';

import type { ILisSyncService } from './ILisSyncService';

type P<K extends keyof ILisSyncService> = Parameters<ILisSyncService[K]>;
const BASE = '/api/lis-sync/lis-sync';

export const createHttpLisSyncService = (client: ApiHttpClient): ILisSyncService =>
  buildHttpService<ILisSyncService>(client, {
    getSyncState: result('GET', (caseId: P<'getSyncState'>[0]) => `${BASE}/get-sync-state${queryString({ caseId })}`),
    checkNow: result('GET', (caseId: P<'checkNow'>[0]) => `${BASE}/check-now${queryString({ caseId })}`),
  });
