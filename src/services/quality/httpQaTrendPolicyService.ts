// src/services/quality/httpQaTrendPolicyService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IQaTrendPolicyService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/QUALITY_SETTINGS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { IQaTrendPolicyService } from './IQaTrendPolicyService';

type P<K extends keyof IQaTrendPolicyService> = Parameters<IQaTrendPolicyService[K]>;
const BASE = '/api/quality/qa-trend-policy';

export const createHttpQaTrendPolicyService = (client: ApiHttpClient): IQaTrendPolicyService =>
  buildHttpService<IQaTrendPolicyService>(client, {
    get: result('GET', () => `${BASE}/get`),
    save: result('POST', () => `${BASE}/save`, { body: (settings: P<'save'>[0], labName: P<'save'>[1]) => ({ settings, labName }) }),
  });
