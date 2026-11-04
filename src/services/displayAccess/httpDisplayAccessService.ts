// src/services/displayAccess/httpDisplayAccessService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IDisplayAccessService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DELEGATIONS_NOTES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, list, queryString, result, value } from '../apiServer/httpServiceKit';
import { itemsOf, type ItemsReply } from '../apiServer/replyShapes';

import type { IDisplayAccessService } from './IDisplayAccessService';

type P<K extends keyof IDisplayAccessService> = Parameters<IDisplayAccessService[K]>;
const BASE = '/api/display-access/display-access';

export const createHttpDisplayAccessService = (client: ApiHttpClient): IDisplayAccessService =>
  buildHttpService<IDisplayAccessService>(client, {
    issueFacilityOpsToken: result('POST', () => `${BASE}/issue-facility-ops-token`, { body: (profileId: P<'issueFacilityOpsToken'>[0], validDays: P<'issueFacilityOpsToken'>[1]) => ({ profileId, validDays }) }),
    issueOrSuiteToken: result('POST', () => `${BASE}/issue-or-suite-token`, { body: (terminalId: P<'issueOrSuiteToken'>[0], validDays: P<'issueOrSuiteToken'>[1]) => ({ terminalId, validDays }) }),
    revokeFacilityOpsToken: result('POST', () => `${BASE}/revoke-facility-ops-token`, { body: (profileId: P<'revokeFacilityOpsToken'>[0]) => ({ profileId }) }),
    revokeOrSuiteToken: result('POST', () => `${BASE}/revoke-or-suite-token`, { body: (terminalId: P<'revokeOrSuiteToken'>[0]) => ({ terminalId }) }),
    verify: value('POST', () => `${BASE}/verify`, { body: (kind: P<'verify'>[0], subjectId: P<'verify'>[1], token: P<'verify'>[2]) => ({ kind, subjectId, token }), missing: 'invalid', fallback: 'invalid' }),
    getSummary: value('GET', (kind: P<'getSummary'>[0], subjectId: P<'getSummary'>[1]) => `${BASE}/get-summary${queryString({ kind, subjectId })}`, { missing: null, fallback: null }),
    getAllSummaries: list('GET', (kind: P<'getAllSummaries'>[0]) => `${BASE}/get-all-summaries${queryString({ kind })}`, { pick: (d: ItemsReply<never>) => itemsOf(d) }),
  });
