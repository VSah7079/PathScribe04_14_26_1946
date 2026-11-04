// src/services/requisitions/httpRequisitionService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 762: the API server's version of IRequisitionService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route per interface method; the calls are listed in
// docs/architecture/REQUISITION_INGESTION_API.md. A refusal is a fixed code and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IRequisitionService } from './IRequisitionService';

type P<K extends keyof IRequisitionService> = Parameters<IRequisitionService[K]>;
const BASE = '/api/requisitions/requisition';

export const createHttpRequisitionService = (client: ApiHttpClient): IRequisitionService =>
  buildHttpService<IRequisitionService>(client, {
    getSources: result('GET', () => `${BASE}/get-sources`),
    saveSource: result('POST', () => `${BASE}/save-source`, { body: (source: P<'saveSource'>[0]) => source }),
    recordIngestion: result('POST', () => `${BASE}/record-ingestion`, { body: (report: P<'recordIngestion'>[0]) => report }),
    getInbox: result('GET', () => `${BASE}/get-inbox`),
    linksForCase: result('POST', () => `${BASE}/links-for-case`, { body: (ref: P<'linksForCase'>[0]) => ref }),
    reassociate: result('POST', () => `${BASE}/reassociate`, { body: (unmatchedId: P<'reassociate'>[0], accession: P<'reassociate'>[1], how: P<'reassociate'>[2]) => ({ unmatchedId, accession, how }) }),
    findCasesToLink: result('GET', (query: P<'findCasesToLink'>[0]) => `${BASE}/find-cases-to-link${queryString({ query })}`),
    discard: result('POST', () => `${BASE}/discard`, { body: (unmatchedId: P<'discard'>[0], reason: P<'discard'>[1]) => ({ unmatchedId, reason }) }),
    openDocument: result('POST', () => `${BASE}/open-document`, { body: (ref: P<'openDocument'>[0]) => ref }),
    getExpectations: result('GET', () => `${BASE}/get-expectations`),
    saveExpectation: result('POST', () => `${BASE}/save-expectation`, { body: (expectation: P<'saveExpectation'>[0]) => expectation }),
    sweepMissing: result('POST', () => `${BASE}/sweep-missing`),
    getMissing: result('GET', () => `${BASE}/get-missing`),
    missingForCase: result('POST', () => `${BASE}/missing-for-case`, { body: (ref: P<'missingForCase'>[0]) => ref }),
    waiveMissing: result('POST', () => `${BASE}/waive-missing`, { body: (caseId: P<'waiveMissing'>[0], reason: P<'waiveMissing'>[1], note: P<'waiveMissing'>[2]) => ({ caseId, reason, note }) }),
  });
