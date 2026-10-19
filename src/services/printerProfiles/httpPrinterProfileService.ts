// src/services/printerProfiles/httpPrinterProfileService.ts
// Batch 616: the API server's version of IPrinterProfileService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/REAGENTS_LABELS_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { notFoundAsNull } from '../apiServer/notFoundAsNull';
import type { IPrinterProfileService } from './IPrinterProfileService';

type P<K extends keyof IPrinterProfileService, N extends number> = Parameters<IPrinterProfileService[K]>[N];

type Args<K extends keyof IPrinterProfileService> = Parameters<IPrinterProfileService[K]>;
const BASE = '/api/printer-profiles/printer-profile';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpPrinterProfileService(client: ApiHttpClient): IPrinterProfileService {
  const routes = buildHttpService<IPrinterProfileService>(client, {
    getAll: result('GET', () => route('getAll')),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    add: result('POST', () => route('add'), { body: (profile: P<'add', 0>) => profile }),
    update: result('POST', () => route('update'), { body: (id: P<'update', 0>, changes: P<'update', 1>) => ({ id, changes }) }),
    remove: result('POST', () => route('remove'), { body: (id: Args<'remove'>[0]) => ({ id }) }),
  });
  return {
    ...routes,
    getById: (...a: Parameters<IPrinterProfileService['getById']>) => notFoundAsNull(routes.getById(...a)),
  };
}
