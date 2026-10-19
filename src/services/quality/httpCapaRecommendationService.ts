// src/services/quality/httpCapaRecommendationService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ICapaRecommendationService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/QUALITY_SETTINGS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ICapaRecommendationService } from './capaRecommendationService';

type P<K extends keyof ICapaRecommendationService> = Parameters<ICapaRecommendationService[K]>;
const BASE = '/api/quality/capa-recommendation';

export const createHttpCapaRecommendationService = (client: ApiHttpClient): ICapaRecommendationService =>
  buildHttpService<ICapaRecommendationService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getPending: result('GET', () => `${BASE}/get-pending`),
    recommend: result('POST', () => `${BASE}/recommend`, { body: (input: P<'recommend'>[0]) => (input) }),
    confirm: result('POST', () => `${BASE}/confirm`, { body: (id: P<'confirm'>[0], decision: P<'confirm'>[1]) => ({ id, decision }) }),
    dismiss: result('POST', () => `${BASE}/dismiss`, { body: (id: P<'dismiss'>[0], reason: P<'dismiss'>[1]) => ({ id, reason }) }),
  });
