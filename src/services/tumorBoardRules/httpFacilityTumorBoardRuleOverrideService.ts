// src/services/tumorBoardRules/httpFacilityTumorBoardRuleOverrideService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IFacilityTumorBoardRuleOverrideService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/TUMOR_BOARD_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IFacilityTumorBoardRuleOverrideService } from './ITumorBoardRuleService';

type P<K extends keyof IFacilityTumorBoardRuleOverrideService> = Parameters<IFacilityTumorBoardRuleOverrideService[K]>;
const BASE = '/api/tumor-board-rules/facility-tumor-board-rule-override';

export const createHttpFacilityTumorBoardRuleOverrideService = (client: ApiHttpClient): IFacilityTumorBoardRuleOverrideService =>
  buildHttpService<IFacilityTumorBoardRuleOverrideService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getForFacility: result('GET', (facilityId: P<'getForFacility'>[0]) => `${BASE}/get-for-facility${queryString({ facilityId })}`),
    set: result('POST', () => `${BASE}/set`, { body: (facilityId: P<'set'>[0], ruleId: P<'set'>[1], changes: P<'set'>[2]) => ({ facilityId, ruleId, changes }) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (facilityId: P<'remove'>[0], ruleId: P<'remove'>[1]) => ({ facilityId, ruleId }) }),
  });
