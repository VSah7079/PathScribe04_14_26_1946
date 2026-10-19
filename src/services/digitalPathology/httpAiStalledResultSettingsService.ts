// src/services/digitalPathology/httpAiStalledResultSettingsService.ts
// Batch 616: the API server's version of IAiStalledResultSettingsService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/DIGITAL_PATHOLOGY_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { IAiStalledResultSettingsService } from './IAiStalledResultSettingsService';

type P<K extends keyof IAiStalledResultSettingsService, N extends number> = Parameters<IAiStalledResultSettingsService[K]>[N];

const BASE = '/api/digital-pathology/ai-stalled-result-settings';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpAiStalledResultSettingsService(client: ApiHttpClient): IAiStalledResultSettingsService {
  const routes = buildHttpService<IAiStalledResultSettingsService>(client, {
    get: result('GET', () => route('get')),
    update: result('POST', () => route('update'), { body: (changes: P<'update', 0>) => changes }),
  });
  return routes;
}
