// src/services/quality/httpQaSupervisionAssignmentTypeService.ts
// Batch 616: the API server's version of IQaSupervisionAssignmentTypeService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/QUALITY_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { IQaSupervisionAssignmentTypeService } from './IQaSupervisionAssignmentTypeService';

type P<K extends keyof IQaSupervisionAssignmentTypeService, N extends number> = Parameters<IQaSupervisionAssignmentTypeService[K]>[N];

type Args<K extends keyof IQaSupervisionAssignmentTypeService> = Parameters<IQaSupervisionAssignmentTypeService[K]>;
const BASE = '/api/quality/qa-supervision-assignment-type';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpQaSupervisionAssignmentTypeService(client: ApiHttpClient): IQaSupervisionAssignmentTypeService {
  const routes = buildHttpService<IQaSupervisionAssignmentTypeService>(client, {
    getAll: result('GET', () => route('getAll')),
    add: result('POST', () => route('add'), { body: (type: P<'add', 0>) => type }),
    update: result('POST', () => route('update'), { body: (id: P<'update', 0>, changes: P<'update', 1>) => ({ id, changes }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => route('reactivate'), { body: (id: Args<'reactivate'>[0]) => ({ id }) }),
  });
  return routes;
}
