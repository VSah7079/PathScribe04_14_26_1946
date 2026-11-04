// src/services/users/httpUserService.ts
// Batch 616 (PS-484): the API server's version of IUserService (contract:
// STAFF_ADMIN_API.md §2). Creating or editing a staff record needs
// config:staff:edit, and changing roles, facilities or credentials needs
// config:staff-access:assign; the server checks both and answers 403.
// The quick-sign PIN is sent on a save only; the server stores a hash and never
// returns it.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IUserService, StaffUser } from './IUserService';

type Args<K extends keyof IUserService> = Parameters<IUserService[K]>;
const BASE = '/api/users/user';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpUserService = (client: ApiHttpClient): IUserService =>
  buildHttpService<IUserService>(client, {
    getAll: result('GET', () => route('getAll'), { pick: (d: { items: StaffUser[] }) => d.items ?? [] }),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    add: result('POST', () => route('add'), { body: (u: Omit<StaffUser, 'id'>) => u }),
    update: result('POST', () => route('update'), { body: (id: string, c: Partial<Omit<StaffUser, 'id'>>) => ({ id, changes: c }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => route('reactivate'), { body: (id: Args<'reactivate'>[0]) => ({ id }) }),
  });
