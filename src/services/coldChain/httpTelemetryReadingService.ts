// src/services/coldChain/httpTelemetryReadingService.ts
// Batch 616: the API server's version of ITelemetryReadingService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/REAGENTS_LABELS_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { ITelemetryReadingService } from './ITelemetryReadingService';

type P<K extends keyof ITelemetryReadingService, N extends number> = Parameters<ITelemetryReadingService[K]>[N];

type Args<K extends keyof ITelemetryReadingService> = Parameters<ITelemetryReadingService[K]>;
const BASE = '/api/cold-chain/telemetry-reading';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpTelemetryReadingService(client: ApiHttpClient): ITelemetryReadingService {
  const routes = buildHttpService<ITelemetryReadingService>(client, {
    getAll: result('GET', () => route('getAll')),
    getByAsset: result('GET', (assetType: Args<'getByAsset'>[0], assetId: Args<'getByAsset'>[1]) => `${route('getByAsset')}${queryString({ assetType, assetId })}`),
    getExcursions: result('GET', () => route('getExcursions')),
    record: result('POST', () => route('record'), { body: (reading: P<'record', 0>) => reading }),
  });
  return routes;
}
