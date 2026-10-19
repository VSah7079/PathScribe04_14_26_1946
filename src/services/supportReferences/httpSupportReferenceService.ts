// src/services/supportReferences/httpSupportReferenceService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ISupportReferenceService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DICTIONARIES_CONFIG_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ISupportReferenceService } from './ISupportReferenceService';

type P<K extends keyof ISupportReferenceService> = Parameters<ISupportReferenceService[K]>;
const BASE = '/api/support-references/support-reference';

export const createHttpSupportReferenceService = (client: ApiHttpClient): ISupportReferenceService =>
  buildHttpService<ISupportReferenceService>(client, {
    forRecord: result('GET', (kind: P<'forRecord'>[0], recordId: P<'forRecord'>[1]) => `${BASE}/for-record${queryString({ kind, recordId })}`),
    resolve: result('POST', () => `${BASE}/resolve`, { body: (ref: P<'resolve'>[0], actor: P<'resolve'>[1]) => ({ ref, actor }) }),
    recordIdFor: result('POST', () => `${BASE}/record-id-for`, { body: (ref: P<'recordIdFor'>[0], kind: P<'recordIdFor'>[1]) => ({ ref, kind }) }),
  });
