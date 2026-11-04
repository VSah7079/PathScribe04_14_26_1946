// src/services/validationStudies/httpValidationStudyService.ts
// Batch 616: the API server's version of IValidationStudyService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/QUALITY_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { notFoundAsNull } from '../apiServer/notFoundAsNull';
import type { IValidationStudyService } from './IValidationStudyService';

type P<K extends keyof IValidationStudyService, N extends number> = Parameters<IValidationStudyService[K]>[N];

type Args<K extends keyof IValidationStudyService> = Parameters<IValidationStudyService[K]>;
const BASE = '/api/validation-studies/validation-study';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpValidationStudyService(client: ApiHttpClient): IValidationStudyService {
  const routes = buildHttpService<IValidationStudyService>(client, {
    getAll: result('GET', () => route('getAll')),
    getActive: result('GET', () => route('getActive')),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    create: result('POST', () => route('create'), { body: (study: P<'create', 0>) => study }),
    update: result('POST', () => route('update'), { body: (id: P<'update', 0>, changes: P<'update', 1>) => ({ id, changes }) }),
    submitForReview: result('POST', () => route('submitForReview'), { body: (id: P<'submitForReview', 0>, submission: P<'submitForReview', 1>) => ({ id, submission }) }),
    recordApproval: result('POST', () => route('recordApproval'), { body: (id: P<'recordApproval', 0>, approval: P<'recordApproval', 1>) => ({ id, approval }) }),
    activate: result('POST', () => route('activate'), { body: (id: P<'activate', 0>, activatedBy: P<'activate', 1>) => ({ id, activatedBy }) }),
    close: result('POST', () => route('close'), { body: (id: Args<'close'>[0]) => ({ id }) }),
    remove: result('POST', () => route('remove'), { body: (id: Args<'remove'>[0]) => ({ id }) }),
    getStudyForCase: result('GET', (clientId: Args<'getStudyForCase'>[0], pathologistId: Args<'getStudyForCase'>[1], subspecialtyId: Args<'getStudyForCase'>[2]) => `${route('getStudyForCase')}${queryString({ clientId, pathologistId, subspecialtyId })}`),
  });
  return {
    ...routes,
    getStudyForCase: (...a: Parameters<IValidationStudyService['getStudyForCase']>) => notFoundAsNull(routes.getStudyForCase(...a)),
  };
}
