// src/services/tumorBoard/httpTumorBoardService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ITumorBoardService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/TUMOR_BOARD_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ITumorBoardService } from './ITumorBoardService';

type P<K extends keyof ITumorBoardService> = Parameters<ITumorBoardService[K]>;
const BASE = '/api/tumor-board/tumor-board';

export const createHttpTumorBoardService = (client: ApiHttpClient): ITumorBoardService =>
  buildHttpService<ITumorBoardService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    list: result('POST', () => `${BASE}/list`, { body: (filter: P<'list'>[0]) => (filter) }),
    getActiveForCase: result('GET', (caseId: P<'getActiveForCase'>[0]) => `${BASE}/get-active-for-case${queryString({ caseId })}`),
    create: result('POST', () => `${BASE}/create`, { body: (listing: P<'create'>[0], timezone: P<'create'>[1]) => ({ listing, timezone }) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1], byUserId: P<'update'>[2], byUserName: P<'update'>[3], timezone: P<'update'>[4]) => ({ id, changes, byUserId, byUserName, timezone }) }),
    dismiss: result('POST', () => `${BASE}/dismiss`, { body: (id: P<'dismiss'>[0], reason: P<'dismiss'>[1], byUserId: P<'dismiss'>[2], byUserName: P<'dismiss'>[3]) => ({ id, reason, byUserId, byUserName }) }),
  });
