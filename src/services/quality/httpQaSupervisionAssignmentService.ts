// src/services/quality/httpQaSupervisionAssignmentService.ts
// Batch 616: the API server's version of IQaSupervisionAssignmentService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/QUALITY_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { notFoundAsNull } from '../apiServer/notFoundAsNull';
import type { IQaSupervisionAssignmentService } from './IQaSupervisionAssignmentService';

type P<K extends keyof IQaSupervisionAssignmentService, N extends number> = Parameters<IQaSupervisionAssignmentService[K]>[N];

type Args<K extends keyof IQaSupervisionAssignmentService> = Parameters<IQaSupervisionAssignmentService[K]>;
const BASE = '/api/quality/qa-supervision-assignment';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpQaSupervisionAssignmentService(client: ApiHttpClient): IQaSupervisionAssignmentService {
  const routes = buildHttpService<IQaSupervisionAssignmentService>(client, {
    getAll: result('GET', () => route('getAll')),
    getActiveAssignmentForUser: result('GET', (activityTypeId: Args<'getActiveAssignmentForUser'>[0], userId: Args<'getActiveAssignmentForUser'>[1], subspecialtyId: Args<'getActiveAssignmentForUser'>[2]) => `${route('getActiveAssignmentForUser')}${queryString({ activityTypeId, userId, subspecialtyId })}`),
    create: result('POST', () => route('create'), { body: (input: P<'create', 0>) => input }),
    recordCaseReviewed: result('POST', () => route('recordCaseReviewed'), { body: (assignmentId: Args<'recordCaseReviewed'>[0]) => ({ assignmentId }) }),
    graduate: result('POST', () => route('graduate'), { body: (assignmentId: Args<'graduate'>[0]) => ({ assignmentId }) }),
  });
  return {
    ...routes,
    getActiveAssignmentForUser: (...a: Parameters<IQaSupervisionAssignmentService['getActiveAssignmentForUser']>) => notFoundAsNull(routes.getActiveAssignmentForUser(...a)),
  };
}
