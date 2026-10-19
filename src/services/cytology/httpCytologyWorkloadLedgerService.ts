// src/services/cytology/httpCytologyWorkloadLedgerService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of ICytologyWorkloadLedgerService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICytologyWorkloadLedgerService } from './ICytologyWorkloadLedgerService';

type P<K extends keyof ICytologyWorkloadLedgerService> = Parameters<ICytologyWorkloadLedgerService[K]>;
const BASE = '/api/cytology/cytology-workload-ledger';

export const createHttpCytologyWorkloadLedgerService = (client: ApiHttpClient): ICytologyWorkloadLedgerService =>
  buildHttpService<ICytologyWorkloadLedgerService>(client, {
    record: result('POST', () => `${BASE}/record`, { body: (entry: P<'record'>[0]) => (entry) }),
    getForUserInWindow: result('GET', (userId: P<'getForUserInWindow'>[0], windowStart: P<'getForUserInWindow'>[1], windowEnd: P<'getForUserInWindow'>[2]) => `${BASE}/get-for-user-in-window${queryString({ userId, windowStart, windowEnd })}`),
    getAll: result('GET', () => `${BASE}/get-all`),
  });
