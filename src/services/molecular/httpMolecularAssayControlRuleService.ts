// src/services/molecular/httpMolecularAssayControlRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-500): the API server's version of IMolecularAssayControlRuleService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/MOLECULAR_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IMolecularAssayControlRuleService } from './IMolecularAssayControlRuleService';

type P<K extends keyof IMolecularAssayControlRuleService> = Parameters<IMolecularAssayControlRuleService[K]>;
const BASE = '/api/molecular/molecular-assay-control-rule';

export const createHttpMolecularAssayControlRuleService = (client: ApiHttpClient): IMolecularAssayControlRuleService =>
  buildHttpService<IMolecularAssayControlRuleService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    listForReview: result('GET', () => `${BASE}/list-for-review`),
    getByAssayCode: result('GET', (assayCode: P<'getByAssayCode'>[0]) => `${BASE}/get-by-assay-code${queryString({ assayCode })}`),
    create: result('POST', () => `${BASE}/create`, { body: (rule: P<'create'>[0], reason: P<'create'>[1]) => ({ ...rule, reason }) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], patch: P<'update'>[1], reason: P<'update'>[2]) => ({ id, patch, reason }) }),
    delete: result('POST', () => `${BASE}/delete`, { body: (id: P<'delete'>[0], reason: P<'delete'>[1]) => ({ id, reason }) }),
  });
