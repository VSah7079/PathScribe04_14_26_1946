// src/services/deficiencies/httpManagementReviewService.ts
// Batch 616: the API server's version of IManagementReviewService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/QUALITY_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { IManagementReviewService } from './IDeficiencyService';

type P<K extends keyof IManagementReviewService, N extends number> = Parameters<IManagementReviewService[K]>[N];

const BASE = '/api/deficiencies/management-review';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpManagementReviewService(client: ApiHttpClient): IManagementReviewService {
  const routes = buildHttpService<IManagementReviewService>(client, {
    getAll: result('GET', () => route('getAll')),
    create: result('POST', () => route('create'), { body: (review: P<'create', 0>) => review }),
  });
  return routes;
}
