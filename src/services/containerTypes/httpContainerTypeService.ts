// src/services/containerTypes/httpContainerTypeService.ts
// Batch 616 (PS-507): the API server's version of IContainerTypeService
// (contract: LAB_DICTIONARIES_API.md §3).
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { ContainerType, IContainerTypeService } from './IContainerTypeService';

type Args<K extends keyof IContainerTypeService> = Parameters<IContainerTypeService[K]>;
const BASE = '/api/container-types/container-type';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpContainerTypeService = (client: ApiHttpClient): IContainerTypeService =>
  buildHttpService<IContainerTypeService>(client, {
    getAll: result('GET', () => route('getAll'), { pick: (d: { items: ContainerType[] }) => d.items ?? [] }),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    create: result('POST', () => route('create'), { body: (x: Omit<ContainerType, 'id'>) => x }),
    update: result('POST', () => route('update'), { body: (id: string, c: Partial<Omit<ContainerType, 'id'>>) => ({ id, changes: c }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => route('reactivate'), { body: (id: Args<'reactivate'>[0]) => ({ id }) }),
  });
