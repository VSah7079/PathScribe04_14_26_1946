// src/services/cases/httpCountersignService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ICountersignService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CASE_WORKFLOWS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICountersignService } from './ICountersignService';

type P<K extends keyof ICountersignService> = Parameters<ICountersignService[K]>;
const BASE = '/api/cases/countersign';

export const createHttpCountersignService = (client: ApiHttpClient): ICountersignService =>
  buildHttpService<ICountersignService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getForCase: result('GET', (caseId: P<'getForCase'>[0]) => `${BASE}/get-for-case${queryString({ caseId })}`),
    release: result('POST', () => `${BASE}/release`, { body: (input: P<'release'>[0]) => (input) }),
    countersign: result('POST', () => `${BASE}/countersign`, { body: (input: P<'countersign'>[0]) => (input) }),
    reject: result('POST', () => `${BASE}/reject`, { body: (input: P<'reject'>[0]) => (input) }),
    getForSpecimen: result('GET', (caseId: P<'getForSpecimen'>[0], specimenId: P<'getForSpecimen'>[1]) => `${BASE}/get-for-specimen${queryString({ caseId, specimenId })}`),
  });
