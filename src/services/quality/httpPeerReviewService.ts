// src/services/quality/httpPeerReviewService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IPeerReviewService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/QUALITY_SETTINGS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IPeerReviewService } from './peerReviewService';

type P<K extends keyof IPeerReviewService> = Parameters<IPeerReviewService[K]>;
const BASE = '/api/quality/peer-review';

export const createHttpPeerReviewService = (client: ApiHttpClient): IPeerReviewService =>
  buildHttpService<IPeerReviewService>(client, {
    getForCase: result('GET', (caseId: P<'getForCase'>[0]) => `${BASE}/get-for-case${queryString({ caseId })}`),
    getOpenForUser: result('GET', (userId: P<'getOpenForUser'>[0]) => `${BASE}/get-open-for-user${queryString({ userId })}`),
    request: result('POST', () => `${BASE}/request`, { body: (input: P<'request'>[0]) => (input) }),
    recordRead: result('POST', () => `${BASE}/record-read`, { body: (id: P<'recordRead'>[0], read: P<'recordRead'>[1]) => ({ id, read }) }),
    resolve: result('POST', () => `${BASE}/resolve`, { body: (id: P<'resolve'>[0], resolution: P<'resolve'>[1]) => ({ id, resolution }) }),
    withdraw: result('POST', () => `${BASE}/withdraw`, { body: (id: P<'withdraw'>[0], reason: P<'withdraw'>[1]) => ({ id, reason }) }),
    override: result('POST', () => `${BASE}/override`, { body: (caseId: P<'override'>[0], input: P<'override'>[1]) => ({ caseId, input }) }),
  });
