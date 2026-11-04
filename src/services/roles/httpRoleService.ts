// src/services/roles/httpRoleService.ts
// Batch 616 (PS-484): the API server's version of IRoleService (contract:
// STAFF_ADMIN_API.md §3). A role save is checked by the server (config:roles:manage,
// unknown keys and unmet capability requirements refused, the "Role capabilities
// changed" audit row written). The browser's own role rules only hide buttons.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IRoleService, Role } from './IRoleService';

type Args<K extends keyof IRoleService> = Parameters<IRoleService[K]>;
const BASE = '/api/roles/role';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpRoleService = (client: ApiHttpClient): IRoleService =>
  buildHttpService<IRoleService>(client, {
    getAll: result('GET', () => route('getAll'), { pick: (d: { items: Role[] }) => d.items ?? [] }),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    add: result('POST', () => route('add'), { body: (r: Omit<Role, 'id'>) => r }),
    update: result('POST', () => route('update'), { body: (id: string, c: Partial<Omit<Role, 'id'>>) => ({ id, changes: c }) }),
    delete: result('POST', () => route('delete'), { body: (id: Args<'delete'>[0]) => ({ id }) }),
  });
