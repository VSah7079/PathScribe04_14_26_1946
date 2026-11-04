// src/services/marginExtraction/httpMarginExtractionService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IMarginExtractionService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/EQUIPMENT_MIGRATION_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';

import type { IMarginExtractionService } from './IMarginExtractionService';

type P<K extends keyof IMarginExtractionService> = Parameters<IMarginExtractionService[K]>;
const BASE = '/api/margin-extraction/margin-extraction';

export const createHttpMarginExtractionService = (client: ApiHttpClient): IMarginExtractionService =>
  buildHttpService<IMarginExtractionService>(client, {
    extractAndStore: result('POST', () => `${BASE}/extract-and-store`, { body: (input: P<'extractAndStore'>[0]) => (input) }),
    getShadowAttributesForCase: result('GET', (caseId: P<'getShadowAttributesForCase'>[0]) => `${BASE}/get-shadow-attributes-for-case${queryString({ caseId })}`),
    getShadowAttribute: result('GET', (caseId: P<'getShadowAttribute'>[0], instanceId: P<'getShadowAttribute'>[1], fieldId: P<'getShadowAttribute'>[2]) => `${BASE}/get-shadow-attribute${queryString({ caseId, instanceId, fieldId })}`),
    listExceptions: result('POST', () => `${BASE}/list-exceptions`, { body: (filter: P<'listExceptions'>[0]) => (filter) }),
    resolveException: result('GET', (id: P<'resolveException'>[0], valueMm: P<'resolveException'>[1], byUserId: P<'resolveException'>[2], byUserName: P<'resolveException'>[3]) => `${BASE}/resolve-exception${queryString({ id, valueMm, byUserId, byUserName })}`),
    dismissException: result('POST', () => `${BASE}/dismiss-exception`, { body: (id: P<'dismissException'>[0], reason: P<'dismissException'>[1], byUserId: P<'dismissException'>[2], byUserName: P<'dismissException'>[3]) => ({ id, reason, byUserId, byUserName }) }),
  });
