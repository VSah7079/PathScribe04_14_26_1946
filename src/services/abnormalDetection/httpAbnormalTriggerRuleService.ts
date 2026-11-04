// src/services/abnormalDetection/httpAbnormalTriggerRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IAbnormalTriggerRuleService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_SERVICES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { IAbnormalTriggerRuleService } from './IAbnormalTriggerRuleService';

type P<K extends keyof IAbnormalTriggerRuleService> = Parameters<IAbnormalTriggerRuleService[K]>;
const BASE = '/api/abnormal-detection/abnormal-trigger-rule';

export const createHttpAbnormalTriggerRuleService = (client: ApiHttpClient): IAbnormalTriggerRuleService =>
  buildHttpService<IAbnormalTriggerRuleService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    add: result('POST', () => `${BASE}/add`, { body: (rule: P<'add'>[0]) => (rule) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    deactivate: result('POST', () => `${BASE}/deactivate`, { body: (id: P<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => `${BASE}/reactivate`, { body: (id: P<'reactivate'>[0]) => ({ id }) }),
  });
