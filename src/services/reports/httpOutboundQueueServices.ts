// src/services/reports/httpOutboundQueueServices.ts
// Batch 616 (PS-483, with PS-509): server versions of the LIS sync queue and the result queue.
// Contract: docs/architecture/REPORTS_API.md section 5.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { outboundQueueRoutes } from '../apiServer/outboundQueueRoutes';
import { itemsOf } from '../apiServer/replyShapes';
import type { IOutboundLisSyncQueueService } from './IOutboundLisSyncQueueService';
import type { IOutboundResultQueueService } from './IOutboundResultQueueService';

const items = (d: { items?: unknown[] }) => itemsOf(d);

type LisArgs<K extends keyof IOutboundLisSyncQueueService> = Parameters<IOutboundLisSyncQueueService[K]>;
type ResultArgs<K extends keyof IOutboundResultQueueService> = Parameters<IOutboundResultQueueService[K]>;
const BASE_LIS = '/api/reports/outbound-lis-sync-queue';
const BASE_RESULT = '/api/reports/outbound-result-queue';
const routeLis = (method: string): string => methodPath(BASE_LIS, method);
const routeResult = (method: string): string => methodPath(BASE_RESULT, method);

export const createHttpOutboundLisSyncQueueService = (client: ApiHttpClient): IOutboundLisSyncQueueService =>
  buildHttpService<IOutboundLisSyncQueueService>(client, {
    ...outboundQueueRoutes(BASE_LIS),
    getByCaseId: result('GET', (caseId: LisArgs<'getByCaseId'>[0]) => `${routeLis('getByCaseId')}${queryString({ caseId })}`, { pick: items }),
  });

export const createHttpOutboundResultQueueService = (client: ApiHttpClient): IOutboundResultQueueService =>
  buildHttpService<IOutboundResultQueueService>(client, {
    ...outboundQueueRoutes(BASE_RESULT),
    getByCaseId: result('GET', (caseId: ResultArgs<'getByCaseId'>[0]) => `${routeResult('getByCaseId')}${queryString({ caseId })}`, { pick: items }),
    getByInstanceAndState: result('GET', (instanceId: ResultArgs<'getByInstanceAndState'>[0], resultState: ResultArgs<'getByInstanceAndState'>[1]) => `${routeResult('getByInstanceAndState')}${queryString({ instanceId, resultState })}`, { pick: items }),
    recordPdfSha256: result('POST', () => routeResult('recordPdfSha256'), { body: (id: ResultArgs<'recordPdfSha256'>[0], sha256: ResultArgs<'recordPdfSha256'>[1]) => ({ id, sha256 }) }),
  });
