// src/services/caseSearch/httpCaseSearchService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ICaseSearchService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CASE_SEARCH_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { ICaseSearchService } from './ICaseSearchService';

const BASE = '/api/cases/case-search';
const route = (method: string): string => methodPath(BASE, method);

type P<K extends keyof ICaseSearchService> = Parameters<ICaseSearchService[K]>;

export const createHttpCaseSearchService = (client: ApiHttpClient): ICaseSearchService =>
  buildHttpService<ICaseSearchService>(client, {
    search: result('POST', () => route('search'), { body: (request: P<'search'>[0]) => (request) }),
    exportRows: result('POST', () => route('exportRows'), { body: (request: P<'exportRows'>[0]) => (request) }),
    report: result('POST', () => route('report'), { body: (request: P<'report'>[0]) => (request) }),
    exportReport: result('POST', () => route('exportReport'), { body: (request: P<'exportReport'>[0]) => (request) }),
    listSynopticProtocols: result('GET', () => route('listSynopticProtocols')),
  });
