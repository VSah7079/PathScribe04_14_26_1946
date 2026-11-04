// src/services/aiBehavior/httpAiBehaviorService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IAIBehaviorService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_SERVICES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { IAIBehaviorService } from './IAIBehaviorService';

type P<K extends keyof IAIBehaviorService> = Parameters<IAIBehaviorService[K]>;
const BASE = '/api/ai-behavior/ai-behavior';

export const createHttpAiBehaviorService = (client: ApiHttpClient): IAIBehaviorService =>
  buildHttpService<IAIBehaviorService>(client, {
    get: result('GET', () => `${BASE}/get`),
    update: result('POST', () => `${BASE}/update`, { body: (patch: P<'update'>[0]) => (patch) }),
    reset: result('POST', () => `${BASE}/reset`),
  });
