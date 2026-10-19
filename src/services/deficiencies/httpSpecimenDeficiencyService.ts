// src/services/deficiencies/httpSpecimenDeficiencyService.ts
// Batch 616: the API server's version of ISpecimenDeficiencyService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/QUALITY_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { ISpecimenDeficiencyService } from './IDeficiencyService';

type P<K extends keyof ISpecimenDeficiencyService, N extends number> = Parameters<ISpecimenDeficiencyService[K]>[N];

type Args<K extends keyof ISpecimenDeficiencyService> = Parameters<ISpecimenDeficiencyService[K]>;
const BASE = '/api/deficiencies/specimen-deficiency';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpSpecimenDeficiencyService(client: ApiHttpClient): ISpecimenDeficiencyService {
  const routes = buildHttpService<ISpecimenDeficiencyService>(client, {
    getAll: result('GET', () => route('getAll')),
    getByCaseId: result('GET', (caseId: Args<'getByCaseId'>[0]) => `${route('getByCaseId')}${queryString({ caseId })}`),
    getBySpecimenId: result('GET', (specimenId: Args<'getBySpecimenId'>[0]) => `${route('getBySpecimenId')}${queryString({ specimenId })}`),
    raise: result('POST', () => route('raise'), { body: (deficiency: P<'raise', 0>) => deficiency }),
    resolve: result('POST', () => route('resolve'), { body: (id: P<'resolve', 0>, resolution: P<'resolve', 1>) => ({ id, resolution }) }),
    containImmediately: result('POST', () => route('containImmediately'), { body: (id: P<'containImmediately', 0>, resolution: P<'containImmediately', 1>) => ({ id, resolution }) }),
    verifyEffectiveness: result('POST', () => route('verifyEffectiveness'), { body: (id: P<'verifyEffectiveness', 0>, verification: P<'verifyEffectiveness', 1>) => ({ id, verification }) }),
    raiseAndResolve: result('POST', () => route('raiseAndResolve'), { body: (deficiency: P<'raiseAndResolve', 0>, resolution: P<'raiseAndResolve', 1>) => ({ deficiency, resolution }) }),
    markReviewed: result('POST', () => route('markReviewed'), { body: (deficiencyIds: P<'markReviewed', 0>, managementReviewId: P<'markReviewed', 1>) => ({ deficiencyIds, managementReviewId }) }),
  });
  return routes;
}
