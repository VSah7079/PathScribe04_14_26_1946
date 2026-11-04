// src/services/externalResources/httpExternalResourceService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IExternalResourceService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_DICTIONARIES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, done, list, queryString, required, value } from '../apiServer/httpServiceKit';
import { itemsOf, type ItemsReply } from '../apiServer/replyShapes';

import type { IExternalResourceService } from './IExternalResourceService';

type P<K extends keyof IExternalResourceService> = Parameters<IExternalResourceService[K]>;
const BASE = '/api/external-resources/external-resource';

export const createHttpExternalResourceService = (client: ApiHttpClient): IExternalResourceService =>
  buildHttpService<IExternalResourceService>(client, {
    listForOrganisation: list('GET', (organisationId: P<'listForOrganisation'>[0]) => `${BASE}/list-for-organisation${queryString({ organisationId })}`, { pick: (d: ItemsReply<never>) => itemsOf(d) }),
    resolveForViewer: value('POST', () => `${BASE}/resolve-for-viewer`, { body: (context: P<'resolveForViewer'>[0]) => (context), missing: { protocols: [], references: [], systems: [] }, fallback: { protocols: [], references: [], systems: [] } }),
    create: required('POST', () => `${BASE}/create`, { body: (input: P<'create'>[0]) => (input) }),
    update: value('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], changes: P<'update'>[1]) => ({ id, changes }), missing: null, fallback: null }),
    remove: done('POST', () => `${BASE}/remove`, { body: (id: P<'remove'>[0]) => ({ id }) }),
  });
