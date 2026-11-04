// src/services/physicians/httpPhysicianService.ts
// Batch 616 (PS-507): the API server's version of IPhysicianService (contract:
// LAB_DICTIONARIES_API.md §6). A physician with no match by NPI is a successful
// "none" (ok, null), as in the mock. A search sends the text as a query value;
// the server never logs it.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { notFoundAsNull } from '../apiServer/notFoundAsNull';
import type { IPhysicianService, Physician } from './IPhysicianService';

type StructuredName = Parameters<IPhysicianService['findOrCreateByStructuredName']>[0];

type Args<K extends keyof IPhysicianService> = Parameters<IPhysicianService[K]>;
const BASE = '/api/physicians/physician';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpPhysicianService = (client: ApiHttpClient): IPhysicianService => {
  const list = (d: { items: Physician[] }): Physician[] => d.items ?? [];
  const routes = buildHttpService<IPhysicianService>(client, {
    getAll: result('GET', () => route('getAll'), { pick: list }),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    getByNpi: result('GET', (npi: Args<'getByNpi'>[0]) => `${route('getByNpi')}${queryString({ npi })}`),
    search: result('GET', (query: Args<'search'>[0], limit: Args<'search'>[1]) => `${route('search')}${queryString({ query, limit })}`, { pick: list }),
    findOrCreateByName: result('POST', () => route('findOrCreateByName'), { body: (name: string, clientId?: string) => ({ name, clientId }) }),
    add: result('POST', () => route('add'), { body: (p: Omit<Physician, 'id'>) => p }),
    update: result('POST', () => route('update'), { body: (id: string, c: Partial<Omit<Physician, 'id'>>) => ({ id, changes: c }) }),
    verify: result('POST', () => route('verify'), { body: (id: Args<'verify'>[0]) => ({ id }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    findOrCreateByStructuredName: result('POST', () => route('findOrCreateByStructuredName'), { body: (name: StructuredName, clientId?: string) => ({ name, clientId }) }),
    findOrCreateByNpi: result('POST', () => route('findOrCreateByNpi'), { body: (npi: string, name: { first: string; last: string }) => ({ npi, name }) }),
  });
  return { ...routes, getByNpi: (npi: string) => notFoundAsNull<Physician>(routes.getByNpi(npi)) };
};
