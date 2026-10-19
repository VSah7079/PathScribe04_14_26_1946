// src/services/specimenDictionary/httpSpecimenDictionaryService.ts
// Batch 616: the API server's version of ISpecimenDictionaryService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/GROSSING_ROUTING_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { ISpecimenDictionaryService } from './ISpecimenDictionaryService';

type P<K extends keyof ISpecimenDictionaryService, N extends number> = Parameters<ISpecimenDictionaryService[K]>[N];

const BASE = '/api/specimen-dictionary/specimen-dictionary';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpSpecimenDictionaryService(client: ApiHttpClient): ISpecimenDictionaryService {
  const routes = buildHttpService<ISpecimenDictionaryService>(client, {
    getAll: result('GET', () => route('getAll')),
    addEntries: result('POST', () => route('addEntries'), { body: (entries: P<'addEntries', 0>) => ({ entries }) }),
    updateEntries: result('POST', () => route('updateEntries'), { body: (entries: P<'updateEntries', 0>) => ({ entries }) }),
    deprecateEntries: result('POST', () => route('deprecateEntries'), { body: (ids: P<'deprecateEntries', 0>) => ({ ids }) }),
    replaceDictionary: result('POST', () => route('replaceDictionary'), { body: (entries: P<'replaceDictionary', 0>) => ({ entries }) }),
    findOrCreateByName: result('POST', () => route('findOrCreateByName'), { body: (name: P<'findOrCreateByName', 0>, note: P<'findOrCreateByName', 1>) => ({ name, note }) }),
  });
  return routes;
}
