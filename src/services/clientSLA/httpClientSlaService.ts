// src/services/clientSLA/httpClientSlaService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IClientSLAService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_SERVICES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IClientSLAService } from './IClientSLAService';

type P<K extends keyof IClientSLAService> = Parameters<IClientSLAService[K]>;
const BASE = '/api/client-sla/client-sla';

export const createHttpClientSlaService = (client: ApiHttpClient): IClientSLAService =>
  buildHttpService<IClientSLAService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    getByAssigningAuthority: result('GET', (assigningAuthority: P<'getByAssigningAuthority'>[0]) => `${BASE}/get-by-assigning-authority${queryString({ assigningAuthority })}`),
    add: result('POST', () => `${BASE}/add`, { body: (sla: P<'add'>[0]) => (sla) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }) }),
    delete: result('POST', () => `${BASE}/delete`, { body: (id: P<'delete'>[0]) => ({ id }) }),
  });
