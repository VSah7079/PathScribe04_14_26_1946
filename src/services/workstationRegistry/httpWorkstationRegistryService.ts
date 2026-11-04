// src/services/workstationRegistry/httpWorkstationRegistryService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of WorkstationRegistryService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DICTIONARIES_CONFIG_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result, value } from '../apiServer/httpServiceKit';
import type { WorkstationRegistryService } from './workstationRegistryService';
import { printRoutingInputFor } from './workstationRegistryRules';

type P<K extends keyof WorkstationRegistryService> = Parameters<WorkstationRegistryService[K]>;
const BASE = '/api/workstation-registry/workstation-registry';

export const createHttpWorkstationRegistryService = (client: ApiHttpClient): WorkstationRegistryService =>
  buildHttpService<WorkstationRegistryService>(client, {
    list: result('GET', () => `${BASE}/list`),
    get: result('GET', (id: P<'get'>[0]) => `${BASE}/get${queryString({ id })}`),
    register: result('POST', () => `${BASE}/register`, { body: (raw: P<'register'>[0]) => (raw) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], raw: P<'update'>[1]) => ({ id, raw }) }),
    rotateToken: result('POST', () => `${BASE}/rotate-token`, { body: (id: P<'rotateToken'>[0]) => ({ id }) }),
    revoke: result('POST', () => `${BASE}/revoke`, { body: (id: P<'revoke'>[0], reason: P<'revoke'>[1]) => ({ id, reason }) }),
    checkIn: result('GET', (token: P<'checkIn'>[0]) => `${BASE}/check-in${queryString({ token })}`),
    printRoutingInput: value('POST', () => `${BASE}/print-routing-input`, { body: (id: P<'printRoutingInput'>[0]) => ({ id }), missing: printRoutingInputFor(undefined), fallback: printRoutingInputFor(undefined) }),
  });
