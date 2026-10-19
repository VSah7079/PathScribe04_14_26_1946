// src/services/digitalPathology/httpAiScreeningResultService.ts
// Batch 616: the API server's version of IAiScreeningResultService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/DIGITAL_PATHOLOGY_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IAiScreeningResultService } from './IAiScreeningResultService';

type P<K extends keyof IAiScreeningResultService, N extends number> = Parameters<IAiScreeningResultService[K]>[N];

type Args<K extends keyof IAiScreeningResultService> = Parameters<IAiScreeningResultService[K]>;
const BASE = '/api/digital-pathology/ai-screening-result';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpAiScreeningResultService(client: ApiHttpClient): IAiScreeningResultService {
  const routes = buildHttpService<IAiScreeningResultService>(client, {
    getAll: result('GET', () => route('getAll')),
    getByCaseId: result('GET', (caseId: Args<'getByCaseId'>[0]) => `${route('getByCaseId')}${queryString({ caseId })}`),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    order: result('POST', () => route('order'), { body: (entry: P<'order', 0>) => entry }),
    markCompleted: result('POST', () => route('markCompleted'), { body: (id: P<'markCompleted', 0>, findings: P<'markCompleted', 1>, slideTriage: P<'markCompleted', 2>) => ({ id, findings, slideTriage }) }),
    markFailed: result('POST', () => route('markFailed'), { body: (id: Args<'markFailed'>[0]) => ({ id }) }),
    markTimedOut: result('POST', () => route('markTimedOut'), { body: (id: Args<'markTimedOut'>[0]) => ({ id }) }),
    recordHumanConcordance: result('POST', () => route('recordHumanConcordance'), { body: (id: P<'recordHumanConcordance', 0>, concordant: P<'recordHumanConcordance', 1>) => ({ id, concordant }) }),
  });
  return routes;
}
