// src/services/delegations/httpDelegationService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IDelegationService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DELEGATIONS_NOTES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';

import type { IDelegationService } from './IDelegationService';

type P<K extends keyof IDelegationService> = Parameters<IDelegationService[K]>;
const BASE = '/api/delegations/delegation';

export const createHttpDelegationService = (client: ApiHttpClient): IDelegationService =>
  buildHttpService<IDelegationService>(client, {
    list: result('POST', () => `${BASE}/list`, { body: (filter: P<'list'>[0]) => (filter) }),
    delegate: result('POST', () => `${BASE}/delegate`, { body: (request: P<'delegate'>[0]) => (request) }),
    complete: result('POST', () => `${BASE}/complete`, { body: (id: P<'complete'>[0]) => ({ id }) }),
  });
