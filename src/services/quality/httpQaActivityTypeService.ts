// src/services/quality/httpQaActivityTypeService.ts
// Batch 616: the API server's version of IQaActivityTypeService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/QUALITY_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { IQaActivityTypeService } from './IQaActivityTypeService';

type P<K extends keyof IQaActivityTypeService, N extends number> = Parameters<IQaActivityTypeService[K]>[N];

type Args<K extends keyof IQaActivityTypeService> = Parameters<IQaActivityTypeService[K]>;
const BASE = '/api/quality/qa-activity-type';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpQaActivityTypeService(client: ApiHttpClient): IQaActivityTypeService {
  const routes = buildHttpService<IQaActivityTypeService>(client, {
    getAll: result('GET', () => route('getAll')),
    add: result('POST', () => route('add'), { body: (type: P<'add', 0>) => type }),
    update: result('POST', () => route('update'), { body: (id: P<'update', 0>, changes: P<'update', 1>) => ({ id, changes }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => route('reactivate'), { body: (id: Args<'reactivate'>[0]) => ({ id }) }),
  });
  return routes;
}
