// src/services/intraopDashboard/httpOrEventLogService.ts
// Batch 616: the API server's version of IOrEventLogService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/INTRAOP_OPS_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IOrEventLogService } from './IOrEventLogService';

type P<K extends keyof IOrEventLogService, N extends number> = Parameters<IOrEventLogService[K]>[N];

type Args<K extends keyof IOrEventLogService> = Parameters<IOrEventLogService[K]>;
const BASE = '/api/intraop-dashboard/or-event-log';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpOrEventLogService(client: ApiHttpClient): IOrEventLogService {
  const routes = buildHttpService<IOrEventLogService>(client, {
    getAll: result('GET', () => route('getAll')),
    getByLocationId: result('GET', (locationId: Args<'getByLocationId'>[0]) => `${route('getByLocationId')}${queryString({ locationId })}`),
    getByIntraopEntryId: result('GET', (intraopEntryId: Args<'getByIntraopEntryId'>[0]) => `${route('getByIntraopEntryId')}${queryString({ intraopEntryId })}`),
    record: result('POST', () => route('record'), { body: (event: P<'record', 0>) => event }),
  });
  return routes;
}
