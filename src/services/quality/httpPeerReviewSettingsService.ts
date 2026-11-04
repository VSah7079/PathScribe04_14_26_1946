// src/services/quality/httpPeerReviewSettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IPeerReviewSettingsService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/QUALITY_SETTINGS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result, value } from '../apiServer/httpServiceKit';
import type { IPeerReviewSettingsService } from './IPeerReviewSettingsService';

type P<K extends keyof IPeerReviewSettingsService> = Parameters<IPeerReviewSettingsService[K]>;
const BASE = '/api/quality/peer-review-settings';

export const createHttpPeerReviewSettingsService = (client: ApiHttpClient): IPeerReviewSettingsService =>
  buildHttpService<IPeerReviewSettingsService>(client, {
    get: result('GET', () => `${BASE}/get`),
    save: result('POST', () => `${BASE}/save`, { body: (settings: P<'save'>[0]) => (settings) }),
    gateOnFor: value('POST', () => `${BASE}/gate-on-for`, { body: (facilityId: P<'gateOnFor'>[0], subspecialtyId: P<'gateOnFor'>[1]) => ({ facilityId, subspecialtyId }), missing: false, fallback: true }),
  });
