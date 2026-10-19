// src/services/printing/httpPrintQueueService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IPrintQueueService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DELIVERY_PRINTING_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';

import type { IPrintQueueService } from './IPrintQueueService';

type P<K extends keyof IPrintQueueService> = Parameters<IPrintQueueService[K]>;
const BASE = '/api/printing/print-queue';

export const createHttpPrintQueueService = (client: ApiHttpClient): IPrintQueueService =>
  buildHttpService<IPrintQueueService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    enqueue: result('POST', () => `${BASE}/enqueue`, { body: (entry: P<'enqueue'>[0]) => (entry) }),
    getFailed: result('GET', () => `${BASE}/get-failed`),
    markFailed: result('POST', () => `${BASE}/mark-failed`, { body: (id: P<'markFailed'>[0], failure: P<'markFailed'>[1]) => ({ id, failure }) }),
    retryDispatch: result('POST', () => `${BASE}/retry-dispatch`, { body: (id: P<'retryDispatch'>[0]) => ({ id }) }),
    markPrinted: result('POST', () => `${BASE}/mark-printed`, { body: (id: P<'markPrinted'>[0], options: P<'markPrinted'>[1]) => ({ id, options }) }),
    persistRenderedPdf: result('POST', () => `${BASE}/persist-rendered-pdf`, { body: (id: P<'persistRenderedPdf'>[0], pdfBase64: P<'persistRenderedPdf'>[1], document: P<'persistRenderedPdf'>[2]) => ({ id, pdfBase64, document }) }),
    holdPrintJob: result('POST', () => `${BASE}/hold-print-job`, { body: (id: P<'holdPrintJob'>[0], heldBy: P<'holdPrintJob'>[1], holdReason: P<'holdPrintJob'>[2]) => ({ id, heldBy, holdReason }) }),
    releaseHold: result('POST', () => `${BASE}/release-hold`, { body: (id: P<'releaseHold'>[0], releasedBy: P<'releaseHold'>[1]) => ({ id, releasedBy }) }),
    cancelPrintJob: result('POST', () => `${BASE}/cancel-print-job`, { body: (id: P<'cancelPrintJob'>[0], cancelledBy: P<'cancelPrintJob'>[1], cancelReason: P<'cancelPrintJob'>[2]) => ({ id, cancelledBy, cancelReason }) }),
    redirectPrintJob: result('POST', () => `${BASE}/redirect-print-job`, { body: (id: P<'redirectPrintJob'>[0], destination: P<'redirectPrintJob'>[1], redirectedBy: P<'redirectPrintJob'>[2]) => ({ id, destination, redirectedBy }) }),
    holdMany: result('POST', () => `${BASE}/hold-many`, { body: (ids: P<'holdMany'>[0], heldBy: P<'holdMany'>[1], holdReason: P<'holdMany'>[2]) => ({ ids, heldBy, holdReason }) }),
    releaseHoldMany: result('POST', () => `${BASE}/release-hold-many`, { body: (ids: P<'releaseHoldMany'>[0], releasedBy: P<'releaseHoldMany'>[1]) => ({ ids, releasedBy }) }),
    cancelMany: result('POST', () => `${BASE}/cancel-many`, { body: (ids: P<'cancelMany'>[0], cancelledBy: P<'cancelMany'>[1], cancelReason: P<'cancelMany'>[2]) => ({ ids, cancelledBy, cancelReason }) }),
    tagBatch: result('POST', () => `${BASE}/tag-batch`, { body: (jobIds: P<'tagBatch'>[0], batchId: P<'tagBatch'>[1]) => ({ jobIds, batchId }) }),
  });
