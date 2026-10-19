// src/services/biFeed/httpBiFeedService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of BiFeedService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/BI_FEED_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { BiFeedService } from './biFeedService';

type P<K extends keyof BiFeedService> = Parameters<BiFeedService[K]>;
const BASE = '/api/bi-feed/admin';

export const createHttpBiFeedService = (client: ApiHttpClient): BiFeedService =>
  buildHttpService<BiFeedService>(client, {
    getSettings: result('GET', () => `${BASE}/get-settings`),
    saveSettings: result('POST', () => `${BASE}/save-settings`, { body: (draft: P<'saveSettings'>[0]) => (draft) }),
    approveIdentified: result('POST', () => `${BASE}/approve-identified`, { body: (raw: P<'approveIdentified'>[0]) => (raw) }),
    withdrawIdentified: result('POST', () => `${BASE}/withdraw-identified`),
    listTokens: result('GET', () => `${BASE}/list-tokens`),
    createToken: result('POST', () => `${BASE}/create-token`, { body: (raw: P<'createToken'>[0]) => (raw) }),
    rotateToken: result('POST', () => `${BASE}/rotate-token`, { body: (id: P<'rotateToken'>[0]) => ({ id }) }),
    revokeToken: result('POST', () => `${BASE}/revoke-token`, { body: (id: P<'revokeToken'>[0], reason: P<'revokeToken'>[1]) => ({ id, reason }) }),
    pull: result('POST', () => `${BASE}/pull`, { body: (presented: P<'pull'>[0], datasetId: P<'pull'>[1]) => ({ presented, datasetId }) }),
  });
