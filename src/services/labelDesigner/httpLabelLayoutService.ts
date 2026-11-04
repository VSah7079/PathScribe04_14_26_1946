// src/services/labelDesigner/httpLabelLayoutService.ts
// Batch 616: the API server's version of ILabelLayoutService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/REAGENTS_LABELS_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { notFoundAsNull } from '../apiServer/notFoundAsNull';
import type { ILabelLayoutService } from './ILabelLayoutService';

type P<K extends keyof ILabelLayoutService, N extends number> = Parameters<ILabelLayoutService[K]>[N];

type Args<K extends keyof ILabelLayoutService> = Parameters<ILabelLayoutService[K]>;
const BASE = '/api/label-designer/label-layout';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpLabelLayoutService(client: ApiHttpClient): ILabelLayoutService {
  const routes = buildHttpService<ILabelLayoutService>(client, {
    listVersions: result('GET', (labelType: Args<'listVersions'>[0], facilityId: Args<'listVersions'>[1]) => `${route('listVersions')}${queryString({ labelType, facilityId })}`),
    restoreVersion: result('POST', () => route('restoreVersion'), { body: (versionId: P<'restoreVersion', 0>, restoredBy: P<'restoreVersion', 1>) => ({ versionId, restoredBy }) }),
    getByLabelType: result('GET', (labelType: Args<'getByLabelType'>[0], facilityId: Args<'getByLabelType'>[1]) => `${route('getByLabelType')}${queryString({ labelType, facilityId })}`),
    save: result('POST', () => route('save'), { body: (layout: P<'save', 0>, savedBy: P<'save', 1>) => ({ layout, savedBy }) }),
    reset: result('POST', () => route('reset'), { body: (labelType: Args<'reset'>[0], facilityId: Args<'reset'>[1]) => ({ labelType, facilityId }) }),
  });
  return {
    ...routes,
    getByLabelType: (...a: Parameters<ILabelLayoutService['getByLabelType']>) => notFoundAsNull(routes.getByLabelType(...a)),
  };
}
