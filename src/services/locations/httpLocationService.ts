// src/services/locations/httpLocationService.ts
// Batch 616 (PS-507): the API server's version of ILocationService (contract:
// LAB_DICTIONARIES_API.md §2).
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { ILocationService, Location } from './ILocationService';

const items = (d: { items: Location[] }): Location[] => d.items ?? [];

type Args<K extends keyof ILocationService> = Parameters<ILocationService[K]>;
const BASE = '/api/locations/location';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpLocationService = (client: ApiHttpClient): ILocationService =>
  buildHttpService<ILocationService>(client, {
    getAll: result('GET', () => route('getAll'), { pick: items }),
    listForFacility: result('GET', (facilityId: Args<'listForFacility'>[0]) => `${route('listForFacility')}${queryString({ facilityId })}`, { pick: items }),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    create: result('POST', () => route('create'), { body: (x: Omit<Location, 'id'>) => x }),
    update: result('POST', () => route('update'), { body: (id: string, c: Partial<Omit<Location, 'id'>>) => ({ id, changes: c }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => route('reactivate'), { body: (id: Args<'reactivate'>[0]) => ({ id }) }),
    verify: result('POST', () => route('verify'), { body: (id: Args<'verify'>[0]) => ({ id }) }),
    findOrCreateByPV1: result('POST', () => route('findOrCreateByPV1'), { body: (input: Parameters<ILocationService['findOrCreateByPV1']>[0]) => input }),
  });
