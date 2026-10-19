// src/services/governingBodies/httpGoverningBodyService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IGoverningBodyService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_DICTIONARIES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, done, list } from '../apiServer/httpServiceKit';
import { itemsOf, type ItemsReply } from '../apiServer/replyShapes';

import type { IGoverningBodyService } from './IGoverningBodyService';

type P<K extends keyof IGoverningBodyService> = Parameters<IGoverningBodyService[K]>;
const BASE = '/api/governing-bodies/governing-body';

export const createHttpGoverningBodyService = (client: ApiHttpClient): IGoverningBodyService =>
  buildHttpService<IGoverningBodyService>(client, {
    getAll: list('GET', () => `${BASE}/get-all`, { pick: (d: ItemsReply<never>) => itemsOf(d) }),
    saveAll: done('POST', () => `${BASE}/save-all`, { body: (bodies: P<'saveAll'>[0]) => (bodies) }),
  });
