// src/services/digitalPathology/httpWsiScanBatchService.ts
// Batch 616: the API server's version of IWsiScanBatchService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/DIGITAL_PATHOLOGY_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IWsiScanBatchService } from './IWsiScanBatchService';

type P<K extends keyof IWsiScanBatchService, N extends number> = Parameters<IWsiScanBatchService[K]>[N];

type Args<K extends keyof IWsiScanBatchService> = Parameters<IWsiScanBatchService[K]>;
const BASE = '/api/digital-pathology/wsi-scan-batch';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpWsiScanBatchService(client: ApiHttpClient): IWsiScanBatchService {
  const routes = buildHttpService<IWsiScanBatchService>(client, {
    getAll: result('GET', () => route('getAll')),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    create: result('POST', () => route('create'), { body: (batch: P<'create', 0>) => batch }),
    markDispatched: result('POST', () => route('markDispatched'), { body: (id: P<'markDispatched', 0>, sentBy: P<'markDispatched', 1>) => ({ id, sentBy }) }),
    markUnloaded: result('POST', () => route('markUnloaded'), { body: (id: P<'markUnloaded', 0>, unloadedBy: P<'markUnloaded', 1>) => ({ id, unloadedBy }) }),
    recordSendFailure: result('POST', () => route('recordSendFailure'), { body: (id: P<'recordSendFailure', 0>, error: P<'recordSendFailure', 1>) => ({ id, error }) }),
    updateSlideStatus: result('POST', () => route('updateSlideStatus'), { body: (batchId: P<'updateSlideStatus', 0>, slidePosition: P<'updateSlideStatus', 1>, update: P<'updateSlideStatus', 2>) => ({ batchId, slidePosition, update }) }),
  });
  return routes;
}
