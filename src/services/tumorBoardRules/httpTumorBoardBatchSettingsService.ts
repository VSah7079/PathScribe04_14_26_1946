// src/services/tumorBoardRules/httpTumorBoardBatchSettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ITumorBoardBatchSettingsService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/TUMOR_BOARD_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ITumorBoardBatchSettingsService } from './ITumorBoardRuleService';

type P<K extends keyof ITumorBoardBatchSettingsService> = Parameters<ITumorBoardBatchSettingsService[K]>;
const BASE = '/api/tumor-board-rules/tumor-board-batch-settings';

export const createHttpTumorBoardBatchSettingsService = (client: ApiHttpClient): ITumorBoardBatchSettingsService =>
  buildHttpService<ITumorBoardBatchSettingsService>(client, {
    get: result('GET', () => `${BASE}/get`),
    update: result('POST', () => `${BASE}/update`, { body: (changes: P<'update'>[0]) => (changes) }),
  });
