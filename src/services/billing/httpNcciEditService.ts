// src/services/billing/httpNcciEditService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of INcciEditService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/BILLING_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { INcciEditService } from './IServiceNcciEdit';

type P<K extends keyof INcciEditService> = Parameters<INcciEditService[K]>;
const BASE = '/api/billing/ncci-edit';

export const createHttpNcciEditService = (client: ApiHttpClient): INcciEditService =>
  buildHttpService<INcciEditService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getCurrentImport: result('GET', () => `${BASE}/get-current-import`),
    getAllImports: result('GET', () => `${BASE}/get-all-imports`),
    importQuarter: result('POST', () => `${BASE}/import-quarter`, { body: (pairs: P<'importQuarter'>[0], quarterVersion: P<'importQuarter'>[1], importedBy: P<'importQuarter'>[2]) => ({ pairs, quarterVersion, importedBy }) }),
    approveImport: result('POST', () => `${BASE}/approve-import`, { body: (importId: P<'approveImport'>[0], reviewedBy: P<'approveImport'>[1]) => ({ importId, reviewedBy }) }),
    rejectImport: result('POST', () => `${BASE}/reject-import`, { body: (importId: P<'rejectImport'>[0], reviewedBy: P<'rejectImport'>[1], rejectionReason: P<'rejectImport'>[2]) => ({ importId, reviewedBy, rejectionReason }) }),
  });
