// src/services/session/httpSessionTimeoutService.ts
// Batch 616 (PS-512): the API server's version of ISessionTimeoutService
// (contract: ACCESS_SESSION_API.md §2). The organisation default is a setting
// (config:session-security:manage on the write); the effective value for a
// facility is resolved by the server, which knows the facility overrides.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { ISessionTimeoutService } from './ISessionTimeoutService';

type Args<K extends keyof ISessionTimeoutService> = Parameters<ISessionTimeoutService[K]>;
const BASE = '/api/session/session-timeout';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpSessionTimeoutService = (client: ApiHttpClient): ISessionTimeoutService =>
  buildHttpService<ISessionTimeoutService>(client, {
    getOrgDefault: result('GET', () => route('getOrgDefault'), { pick: (d: { minutes: number }) => d.minutes }),
    setOrgDefault: result('POST', () => route('setOrgDefault'), { body: (minutes: number) => ({ minutes }) }),
    resolveEffectiveMinutes: result('GET', (orderingFacilityId: Args<'resolveEffectiveMinutes'>[0]) => `${route('resolveEffectiveMinutes')}${queryString({ orderingFacilityId })}`, { pick: (d: { minutes: number }) => d.minutes }),
  });
