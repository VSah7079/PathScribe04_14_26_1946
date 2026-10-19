// src/services/access/httpAccessRequestService.ts
// Batch 616 (PS-512): the API server's version of IAccessRequestService
// (contract: ACCESS_SESSION_API.md §1). Who grants, denies or revokes is the
// caller in the bearer token: the browser sends the reason only, never a user
// id or name, so a request cannot be resolved "as" someone else. The server
// checks that the caller is the case's assigned pathologist or an admin.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { AccessRequest, NewAccessRequest } from '@/types/access/AccessRequest';
import type { IAccessRequestService } from './IAccessRequestService';

const items = (d: { items: AccessRequest[] }): AccessRequest[] => d.items ?? [];

type Args<K extends keyof IAccessRequestService> = Parameters<IAccessRequestService[K]>;
const BASE = '/api/access/access-request';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpAccessRequestService = (client: ApiHttpClient): IAccessRequestService =>
  buildHttpService<IAccessRequestService>(client, {
    getPending: result('GET', () => route('getPending'), { pick: items }),
    getAllForUser: result('GET', (userId: Args<'getAllForUser'>[0]) => `${route('getAllForUser')}${queryString({ userId })}`, { pick: items }),
    getAll: result('GET', () => route('getAll'), { pick: items }),
    create: result('POST', () => route('create'), { body: (r: NewAccessRequest) => r }),
    grant: result('POST', () => route('grant'), { body: (id: Args<'grant'>[0]) => ({ id }) }),
    deny: result('POST', () => route('deny'), { body: (id: string, _by: string, _name: string, reason: string) => ({ id, reason }) }),
    revoke: result('POST', () => route('revoke'), { body: (id: string, _by: string, _name: string, reason: string) => ({ id, reason }) }),
  });
