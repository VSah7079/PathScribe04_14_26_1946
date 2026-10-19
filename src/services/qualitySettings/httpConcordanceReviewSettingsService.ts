// src/services/qualitySettings/httpConcordanceReviewSettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IConcordanceReviewSettingsService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/QUALITY_SETTINGS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IConcordanceReviewSettingsService } from './IConcordanceReviewSettingsService';

type P<K extends keyof IConcordanceReviewSettingsService> = Parameters<IConcordanceReviewSettingsService[K]>;
const BASE = '/api/quality-settings/concordance-review-settings';

export const createHttpConcordanceReviewSettingsService = (client: ApiHttpClient): IConcordanceReviewSettingsService =>
  buildHttpService<IConcordanceReviewSettingsService>(client, {
    getOrgDefault: result('GET', () => `${BASE}/get-org-default`),
    setOrgDefault: result('POST', () => `${BASE}/set-org-default`, { body: (config: P<'setOrgDefault'>[0]) => (config) }),
    resolveEffectiveConfigForFacility: result('GET', (performingFacilityId: P<'resolveEffectiveConfigForFacility'>[0], staffUserId: P<'resolveEffectiveConfigForFacility'>[1]) => `${BASE}/resolve-effective-config-for-facility${queryString({ performingFacilityId, staffUserId })}`),
  });
