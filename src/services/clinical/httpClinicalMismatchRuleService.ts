// src/services/clinical/httpClinicalMismatchRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IClinicalMismatchRuleService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_SERVICES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, list, result, value } from '../apiServer/httpServiceKit';
import { itemsOf } from '../apiServer/replyShapes';
import type { IClinicalMismatchRuleService } from './clinicalMismatchRuleService';

type P<K extends keyof IClinicalMismatchRuleService> = Parameters<IClinicalMismatchRuleService[K]>;
const BASE = '/api/clinical/clinical-mismatch-rule';

export const createHttpClinicalMismatchRuleService = (client: ApiHttpClient): IClinicalMismatchRuleService =>
  buildHttpService<IClinicalMismatchRuleService>(client, {
    list: result('GET', () => `${BASE}/list`),
    save: result('POST', () => `${BASE}/save`, { body: (rule: P<'save'>[0]) => (rule) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (ruleId: P<'remove'>[0]) => ({ ruleId }) }),
    rulesForCheck: list('GET', () => `${BASE}/rules-for-check`, { pick: itemsOf }),
    revisionHoldsRelease: value('GET', () => `${BASE}/revision-holds-release`, { missing: false }),
    saveRevisionHoldsRelease: result('POST', () => `${BASE}/save-revision-holds-release`, { body: (holds: P<'saveRevisionHoldsRelease'>[0]) => ({ holds }) }),
  });
