// src/services/quality/httpQaActivityRecordService.ts
// Batch 616: the API server's version of IQaActivityRecordService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/QUALITY_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { IQaActivityRecordService } from './IQaActivityRecordService';

type P<K extends keyof IQaActivityRecordService, N extends number> = Parameters<IQaActivityRecordService[K]>[N];

const BASE = '/api/quality/qa-activity-record';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpQaActivityRecordService(client: ApiHttpClient): IQaActivityRecordService {
  const routes = buildHttpService<IQaActivityRecordService>(client, {
    getAll: result('GET', () => route('getAll')),
    create: result('POST', () => route('create'), { body: (record: P<'create', 0>) => record }),
  });
  return routes;
}
