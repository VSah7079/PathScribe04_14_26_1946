// src/services/billing/httpCodeImportService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ICodeImportService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/BILLING_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { ApiCallError, buildHttpService, queryString, required, result } from '../apiServer/httpServiceKit';
import type { ICodeImportService } from './ICodeImportService';

type P<K extends keyof ICodeImportService> = Parameters<ICodeImportService[K]>;
const BASE = '/api/billing/code-import';

// The business outcome of these calls (a refused row, an incomplete mapping, a decision that is not allowed) travels in a 200 reply that is the interface's own union (`{ ok: false, error, code, ... }`).
// A failed call (403, 404, no network) is turned into the same union with the fixed code, so the screen's refusal branch handles it.
const SETTLED = ["previewImport","importRows","approveJob","rejectJob","rollbackJob"] as const;
const settle = (svc: ICodeImportService): ICodeImportService => {
  const out = { ...svc } as Record<string, unknown>;
  for (const name of SETTLED) {
    const call = (svc as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[name];
    out[name] = async (...args: unknown[]) => {
      try { return await call(...args); }
      catch (e) { const code = e instanceof ApiCallError ? e.code : 'UNAVAILABLE'; return { ok: false, error: code, code }; }
    };
  }
  return out as unknown as ICodeImportService;
};

export const createHttpCodeImportService = (client: ApiHttpClient): ICodeImportService =>
  settle(buildHttpService<ICodeImportService>(client, {
    listJobs: result('GET', () => `${BASE}/list-jobs`),
    getJob: result('GET', (jobId: P<'getJob'>[0]) => `${BASE}/get-job${queryString({ jobId })}`),
    previewImport: required('POST', () => `${BASE}/preview-import`, { body: (rows: P<'previewImport'>[0], request: P<'previewImport'>[1]) => ({ rows, request }) }),
    importRows: required('POST', () => `${BASE}/import-rows`, { body: (rows: P<'importRows'>[0], request: P<'importRows'>[1], options: P<'importRows'>[2]) => ({ rows, request, options }) }),
    approveJob: required('POST', () => `${BASE}/approve-job`, { body: (jobId: P<'approveJob'>[0], reviewedBy: P<'approveJob'>[1], options: P<'approveJob'>[2]) => ({ jobId, reviewedBy, options }) }),
    rejectJob: required('POST', () => `${BASE}/reject-job`, { body: (jobId: P<'rejectJob'>[0], reviewedBy: P<'rejectJob'>[1], reason: P<'rejectJob'>[2], options: P<'rejectJob'>[3]) => ({ jobId, reviewedBy, reason, options }) }),
    rollbackJob: required('POST', () => `${BASE}/rollback-job`, { body: (jobId: P<'rollbackJob'>[0], rolledBackBy: P<'rollbackJob'>[1], reason: P<'rollbackJob'>[2], options: P<'rollbackJob'>[3]) => ({ jobId, rolledBackBy, reason, options }) }),
  }));
