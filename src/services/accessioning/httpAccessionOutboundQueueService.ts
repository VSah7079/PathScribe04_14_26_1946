// src/services/accessioning/httpAccessionOutboundQueueService.ts
// Batch 616 (PS-505): the API server's queue of accession messages going out to the LIS/EMR.
// Contract: ACCESSIONING_API.md section 4 (the shared queue calls in outboundQueueRoutes.ts).
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { outboundQueueRoutes } from '../apiServer/outboundQueueRoutes';
import { itemsOf } from '../apiServer/replyShapes';
import type { IAccessionOutboundQueueService } from './IAccessionOutboundQueueService';

type Args<K extends keyof IAccessionOutboundQueueService> = Parameters<IAccessionOutboundQueueService[K]>;
const BASE = '/api/accessioning/accession-outbound-queue';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpAccessionOutboundQueueService = (client: ApiHttpClient): IAccessionOutboundQueueService =>
  buildHttpService<IAccessionOutboundQueueService>(client, {
    ...outboundQueueRoutes(BASE),
    getByCaseId: result('GET', (caseId: Args<'getByCaseId'>[0]) => `${route('getByCaseId')}${queryString({ caseId })}`, { pick: (d: { items?: unknown[] }) => itemsOf(d) }),
  });
