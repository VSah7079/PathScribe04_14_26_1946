// src/services/priority/httpPriorityService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IPriorityService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_DICTIONARIES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';

import type { IPriorityService } from './IPriorityService';

const BASE = '/api/priority/priority';

export const createHttpPriorityService = (client: ApiHttpClient): IPriorityService =>
  buildHttpService<IPriorityService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
  });
