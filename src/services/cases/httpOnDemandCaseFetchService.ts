// src/services/cases/httpOnDemandCaseFetchService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IOnDemandCaseFetchService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CASE_WORKFLOWS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { IOnDemandCaseFetchService } from './IOnDemandCaseFetchService';

type P<K extends keyof IOnDemandCaseFetchService> = Parameters<IOnDemandCaseFetchService[K]>;
const BASE = '/api/cases/on-demand-case-fetch';

export const createHttpOnDemandCaseFetchService = (client: ApiHttpClient): IOnDemandCaseFetchService =>
  buildHttpService<IOnDemandCaseFetchService>(client, {
    fetchCaseByAccession: result('POST', () => `${BASE}/fetch-case-by-accession`, { body: (accessionNumber: P<'fetchCaseByAccession'>[0]) => ({ accessionNumber }) }),
  });
