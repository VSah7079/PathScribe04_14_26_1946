// src/services/delivery/httpReportDeliveryQueueService.ts
// ──────────────────────────────────────────────────────────────
// Batch 672 (wiring step 3): the API server's version of IReportDeliveryQueueService, built from the shared
// HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route per interface method;
// the calls are listed in the contract section for IReportDeliveryQueueService. Every method answers with a
// ServiceResult, so a refusal is a fixed code and never carries server text.
// ──────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IReportDeliveryQueueService } from './IReportDeliveryQueueService';

type P<K extends keyof IReportDeliveryQueueService> = Parameters<IReportDeliveryQueueService[K]>;
const BASE = '/api/delivery/report-delivery-queue';

export const createHttpReportDeliveryQueueService = (client: ApiHttpClient): IReportDeliveryQueueService =>
  buildHttpService<IReportDeliveryQueueService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    enqueue: result('POST', () => `${BASE}/enqueue`, { body: (entry: P<'enqueue'>[0]) => entry }),
    getFailed: result('GET', () => `${BASE}/get-failed`),
    markFailed: result('POST', () => `${BASE}/mark-failed`, { body: (id: P<'markFailed'>[0], failure: P<'markFailed'>[1]) => ({ id, failure }) }),
    retryDispatch: result('POST', () => `${BASE}/retry-dispatch`, { body: (id: P<'retryDispatch'>[0]) => ({ id }) }),
    markSent: result('POST', () => `${BASE}/mark-sent`, { body: (id: P<'markSent'>[0], sent: P<'markSent'>[1]) => ({ id, sent }) }),
    setFaxRecipient: result('POST', () => `${BASE}/set-fax-recipient`, { body: (id: P<'setFaxRecipient'>[0], fax: P<'setFaxRecipient'>[1]) => ({ id, fax }) }),
    setTransmission: result('POST', () => `${BASE}/set-transmission`, { body: (id: P<'setTransmission'>[0], transmission: P<'setTransmission'>[1]) => ({ id, transmission }) }),
  });
