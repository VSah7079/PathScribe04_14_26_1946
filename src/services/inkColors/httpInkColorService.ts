// src/services/inkColors/httpInkColorService.ts
// Batch 616 (PS-507): the API server's version of IInkColorService (contract:
// LAB_DICTIONARIES_API.md §4). The server stamps createdAt and updatedAt.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IInkColorService, InkColor } from './IInkColorService';

type Args<K extends keyof IInkColorService> = Parameters<IInkColorService[K]>;
const BASE = '/api/ink-colors/ink-color';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpInkColorService = (client: ApiHttpClient): IInkColorService =>
  buildHttpService<IInkColorService>(client, {
    getAll: result('GET', () => route('getAll'), { pick: (d: { items: InkColor[] }) => d.items ?? [] }),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    create: result('POST', () => route('create'), { body: (x: Omit<InkColor, 'id' | 'createdAt' | 'updatedAt'>) => x }),
    update: result('POST', () => route('update'), { body: (id: string, c: Partial<Omit<InkColor, 'id'>>) => ({ id, changes: c }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => route('reactivate'), { body: (id: Args<'reactivate'>[0]) => ({ id }) }),
  });
