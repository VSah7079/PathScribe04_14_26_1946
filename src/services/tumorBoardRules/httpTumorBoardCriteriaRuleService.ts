// src/services/tumorBoardRules/httpTumorBoardCriteriaRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ITumorBoardCriteriaRuleService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/TUMOR_BOARD_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ITumorBoardCriteriaRuleService } from './ITumorBoardRuleService';

type P<K extends keyof ITumorBoardCriteriaRuleService> = Parameters<ITumorBoardCriteriaRuleService[K]>;
const BASE = '/api/tumor-board-rules/tumor-board-criteria-rule';

export const createHttpTumorBoardCriteriaRuleService = (client: ApiHttpClient): ITumorBoardCriteriaRuleService =>
  buildHttpService<ITumorBoardCriteriaRuleService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    create: result('POST', () => `${BASE}/create`, { body: (input: P<'create'>[0]) => (input) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (id: P<'remove'>[0]) => ({ id }) }),
  });
