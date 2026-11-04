// src/services/molecular/httpMolecularBatchService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-500): the API server's version of IMolecularBatchService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/MOLECULAR_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IMolecularBatchService } from './IMolecularBatchService';

type P<K extends keyof IMolecularBatchService> = Parameters<IMolecularBatchService[K]>;
const BASE = '/api/molecular/molecular-batch';

export const createHttpMolecularBatchService = (client: ApiHttpClient): IMolecularBatchService =>
  buildHttpService<IMolecularBatchService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    create: result('POST', () => `${BASE}/create`, { body: (batch: P<'create'>[0]) => (batch) }),
    updateByUuid: result('POST', () => `${BASE}/update-by-uuid`, { body: (batchUuid: P<'updateByUuid'>[0], changes: P<'updateByUuid'>[1]) => ({ batchUuid, changes }) }),
    cloneAndSupersede: result('POST', () => `${BASE}/clone-and-supersede`, { body: (originalBatchId: P<'cloneAndSupersede'>[0], reason: P<'cloneAndSupersede'>[1], byUserId: P<'cloneAndSupersede'>[2], byUserName: P<'cloneAndSupersede'>[3]) => ({ originalBatchId, reason, byUserId, byUserName }) }),
  });
