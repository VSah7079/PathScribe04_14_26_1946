// src/services/tumorBoardRules/httpTumorBoardRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ITumorBoardRuleService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/TUMOR_BOARD_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ITumorBoardRuleService } from './ITumorBoardRuleService';

type P<K extends keyof ITumorBoardRuleService> = Parameters<ITumorBoardRuleService[K]>;
const BASE = '/api/tumor-board-rules/tumor-board-rule';

export const createHttpTumorBoardRuleService = (client: ApiHttpClient): ITumorBoardRuleService =>
  buildHttpService<ITumorBoardRuleService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
  });
