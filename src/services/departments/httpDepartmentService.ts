// src/services/departments/httpDepartmentService.ts
// Batch 616 (PS-507): the API server's version of IDepartmentService (contract:
// LAB_DICTIONARIES_API.md §1). Writes need the dictionary's config permission,
// checked by the server (403 otherwise).
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { Department, IDepartmentService } from './IDepartmentService';

type Args<K extends keyof IDepartmentService> = Parameters<IDepartmentService[K]>;
const BASE = '/api/departments/department';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpDepartmentService = (client: ApiHttpClient): IDepartmentService =>
  buildHttpService<IDepartmentService>(client, {
    getAll: result('GET', () => route('getAll'), { pick: (d: { items: Department[] }) => d.items ?? [] }),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    add: result('POST', () => route('add'), { body: (x: Omit<Department, 'id'>) => x }),
    update: result('POST', () => route('update'), { body: (id: string, c: Partial<Omit<Department, 'id'>>) => ({ id, changes: c }) }),
    verify: result('POST', () => route('verify'), { body: (id: Args<'verify'>[0]) => ({ id }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    findOrCreateByName: result('POST', () => route('findOrCreateByName'), { body: (name: string, note?: string) => ({ name, note }) }),
  });
