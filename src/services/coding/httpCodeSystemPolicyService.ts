// src/services/coding/httpCodeSystemPolicyService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ICodeSystemPolicyService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_SERVICES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, list, queryString, required, result } from '../apiServer/httpServiceKit';
import { itemsOf } from '../apiServer/replyShapes';
import type { ICodeSystemPolicyService } from './codeSystemPolicyService';

type P<K extends keyof ICodeSystemPolicyService> = Parameters<ICodeSystemPolicyService[K]>;
const BASE = '/api/coding/code-system-policy';

export const createHttpCodeSystemPolicyService = (client: ApiHttpClient): ICodeSystemPolicyService =>
  buildHttpService<ICodeSystemPolicyService>(client, {
    list: result('GET', () => `${BASE}/list`),
    save: result('POST', () => `${BASE}/save`, { body: (record: P<'save'>[0]) => (record) }),
    reset: result('POST', () => `${BASE}/reset`, { body: (jurisdiction: P<'reset'>[0]) => ({ jurisdiction }) }),
    policyFor: required('GET', (jurisdiction: P<'policyFor'>[0]) => `${BASE}/policy-for${queryString({ jurisdiction })}`),
    served: list('GET', () => `${BASE}/served`, { pick: itemsOf }),
  });
