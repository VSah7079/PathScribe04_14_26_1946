// src/services/cassetteColors/httpCassetteColorService.ts
// Batch 616 (PS-507): the API server's version of ICassetteColorService
// (contract: LAB_DICTIONARIES_API.md §5).
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { CassetteColorDefinition, ICassetteColorService } from './ICassetteColorService';

type Args<K extends keyof ICassetteColorService> = Parameters<ICassetteColorService[K]>;
const BASE = '/api/cassette-colors/cassette-color';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpCassetteColorService = (client: ApiHttpClient): ICassetteColorService =>
  buildHttpService<ICassetteColorService>(client, {
    getAll: result('GET', () => route('getAll'), { pick: (d: { items: CassetteColorDefinition[] }) => d.items ?? [] }),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    getByKey: result('GET', (key: Args<'getByKey'>[0]) => `${route('getByKey')}${queryString({ key })}`),
    create: result('POST', () => route('create'), { body: (x: Omit<CassetteColorDefinition, 'id' | 'createdAt' | 'updatedAt'>) => x }),
    update: result('POST', () => route('update'), { body: (id: string, c: Partial<Omit<CassetteColorDefinition, 'id'>>) => ({ id, changes: c }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => route('reactivate'), { body: (id: Args<'reactivate'>[0]) => ({ id }) }),
  });
