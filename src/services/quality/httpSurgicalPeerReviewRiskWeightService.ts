// src/services/quality/httpSurgicalPeerReviewRiskWeightService.ts
// Batch 616: the API server's version of ISurgicalPeerReviewRiskWeightService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/QUALITY_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { ISurgicalPeerReviewRiskWeightService } from './ISurgicalPeerReviewRiskWeightService';

type P<K extends keyof ISurgicalPeerReviewRiskWeightService, N extends number> = Parameters<ISurgicalPeerReviewRiskWeightService[K]>[N];

type Args<K extends keyof ISurgicalPeerReviewRiskWeightService> = Parameters<ISurgicalPeerReviewRiskWeightService[K]>;
const BASE = '/api/quality/surgical-peer-review-risk-weight';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpSurgicalPeerReviewRiskWeightService(client: ApiHttpClient): ISurgicalPeerReviewRiskWeightService {
  const routes = buildHttpService<ISurgicalPeerReviewRiskWeightService>(client, {
    getAll: result('GET', () => route('getAll')),
    setWeight: result('POST', () => route('setWeight'), { body: (subspecialtyId: P<'setWeight', 0>, multiplier: P<'setWeight', 1>, updatedBy: P<'setWeight', 2>) => ({ subspecialtyId, multiplier, updatedBy }) }),
    removeWeight: result('POST', () => route('removeWeight'), { body: (subspecialtyId: Args<'removeWeight'>[0]) => ({ subspecialtyId }) }),
  });
  return routes;
}
