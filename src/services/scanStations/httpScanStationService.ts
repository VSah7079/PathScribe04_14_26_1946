// src/services/scanStations/httpScanStationService.ts
// Batch 616: the API server's version of IScanStationService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/GROSSING_ROUTING_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IScanStationService } from './IScanStationService';

type P<K extends keyof IScanStationService, N extends number> = Parameters<IScanStationService[K]>[N];

type Args<K extends keyof IScanStationService> = Parameters<IScanStationService[K]>;
const BASE = '/api/scan-stations/scan-station';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpScanStationService(client: ApiHttpClient): IScanStationService {
  const routes = buildHttpService<IScanStationService>(client, {
    getAll: result('GET', () => route('getAll')),
    listForFacility: result('GET', (facilityId: Args<'listForFacility'>[0]) => `${route('listForFacility')}${queryString({ facilityId })}`),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    getByBarcodeCode: result('GET', (code: Args<'getByBarcodeCode'>[0]) => `${route('getByBarcodeCode')}${queryString({ code })}`),
    create: result('POST', () => route('create'), { body: (draft: P<'create', 0>) => draft }),
    update: result('POST', () => route('update'), { body: (id: P<'update', 0>, changes: P<'update', 1>) => ({ id, changes }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => route('reactivate'), { body: (id: Args<'reactivate'>[0]) => ({ id }) }),
  });
  return routes;
}
