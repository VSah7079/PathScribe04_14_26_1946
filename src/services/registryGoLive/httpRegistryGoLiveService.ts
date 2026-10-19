// src/services/registryGoLive/httpRegistryGoLiveService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-504): the API server's version of IRegistryGoLiveService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/REGISTRY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IRegistryGoLiveService } from './IRegistryGoLiveService';

type P<K extends keyof IRegistryGoLiveService> = Parameters<IRegistryGoLiveService[K]>;
const BASE = '/api/registry-go-live/registry-go-live';

export const createHttpRegistryGoLiveService = (client: ApiHttpClient): IRegistryGoLiveService =>
  buildHttpService<IRegistryGoLiveService>(client, {
    list: result('GET', (domain: P<'list'>[0], registryId: P<'list'>[1]) => `${BASE}/list${queryString({ domain, registryId })}`),
    get: result('GET', (id: P<'get'>[0]) => `${BASE}/get${queryString({ id })}`),
    create: result('POST', () => `${BASE}/create`, { body: (record: P<'create'>[0]) => (record) }),
    addApproval: result('POST', () => `${BASE}/add-approval`, { body: (id: P<'addApproval'>[0], approval: P<'addApproval'>[1]) => ({ id, approval }) }),
    markLive: result('POST', () => `${BASE}/mark-live`, { body: (id: P<'markLive'>[0], live: P<'markLive'>[1]) => ({ id, live }) }),
    close: result('POST', () => `${BASE}/close`, { body: (id: P<'close'>[0], closed: P<'close'>[1]) => ({ id, closed }) }),
    getGovernance: result('GET', () => `${BASE}/get-governance`),
    getAgreement: result('GET', (domain: P<'getAgreement'>[0], registryId: P<'getAgreement'>[1]) => `${BASE}/get-agreement${queryString({ domain, registryId })}`),
    recordAgreement: result('POST', () => `${BASE}/record-agreement`, { body: (agreement: P<'recordAgreement'>[0]) => (agreement) }),
    listAdapterRules: result('GET', (domain: P<'listAdapterRules'>[0], registryId: P<'listAdapterRules'>[1]) => `${BASE}/list-adapter-rules${queryString({ domain, registryId })}`),
    saveAdapterRule: result('POST', () => `${BASE}/save-adapter-rule`, { body: (rule: P<'saveAdapterRule'>[0]) => (rule) }),
    removeAdapterRule: result('POST', () => `${BASE}/remove-adapter-rule`, { body: (id: P<'removeAdapterRule'>[0]) => ({ id }) }),
    listValidationRecords: result('GET', (domain: P<'listValidationRecords'>[0], registryId: P<'listValidationRecords'>[1]) => `${BASE}/list-validation-records${queryString({ domain, registryId })}`),
    saveValidationRecord: result('POST', () => `${BASE}/save-validation-record`, { body: (stored: P<'saveValidationRecord'>[0]) => (stored) }),
    saveGovernance: result('POST', () => `${BASE}/save-governance`, { body: (next: P<'saveGovernance'>[0]) => (next) }),
  });
