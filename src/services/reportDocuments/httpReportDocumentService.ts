// src/services/reportDocuments/httpReportDocumentService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 556 (PS-539 phase 2d; BLOB_STORAGE_API.md §5 and §11;
// REPORT_DOCUMENT_STORE_API.md §2): with the API server, released report
// documents are read through the API, never straight from storage:
//   GET /api/cases/{caseId}/report-documents   the case's documents (records only)
//   GET /api/report-documents/{id}              the PDF, with X-Content-SHA256
// The server checks the capability for the document's case and the bytes'
// SHA-256 before it answers (409 DOCUMENT_INTEGRITY otherwise), and audits the
// read. The browser checks the hash again against what it received, so a
// document changed on the way is refused too.
//
// Until the release itself moves to the server (phase 2e), a release made in
// this browser still keeps its document here, in memory only with the API
// server (PS-485). `createServerBackedReportDocumentService` reads this
// browser's documents first and the server's otherwise, and lists both, so a
// document is found wherever it was made, and nothing is stored twice.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import { bytesToBase64 } from '../reports/reportRenderer';
import type { ReportDocument } from './reportDocuments';
import { sha256HexBytes } from '../registrySubmission/sha256';

// The record's fields as the server sends them; an unknown value falls back (callers use the bytes, hash and producer).
const REPORT_TYPES = ['PRELIMINARY', 'FINAL', 'CORRECTED', 'ADDENDUM'] as const;
const REPORT_SOURCES = ['SURGPATH', 'CYTOLOGY'] as const;
const PRODUCERS = ['report-renderer', 'browser-cytology', 'saved-version'] as const;
import type { IReportDocumentService, ReportDocumentError } from './reportDocumentService';

export interface IReportDocumentReadApi {
  read(id: string, purpose?: 'view' | 'send'): Promise<ServiceResult<{ document: ReportDocument; pdfBase64: string }>>;
  listByCase(caseId: string): Promise<ServiceResult<ReportDocument[]>>;
}

const fail = <T>(error: ReportDocumentError): ServiceResult<T> => ({ ok: false, error });

export function reportDocumentHttpError(status: number, code?: unknown): ReportDocumentError {
  if (status === 409 || code === 'DOCUMENT_INTEGRITY') return 'integrity';
  if (status === 404) return 'notFound';
  if (status === 401 || status === 403) return 'notPermitted';
  return 'unavailable';
}

export function createHttpReportDocumentApi(deps: { baseUrl: string; fetch: typeof fetch; accessToken: () => Promise<string> }): IReportDocumentReadApi {
  const root = `${deps.baseUrl.replace(/\/+$/, '')}/api`;
  const get = async (path: string, accept: string): Promise<Response | null> => {
    try {
      const token = await deps.accessToken();
      return await deps.fetch(`${root}${path}`, { method: 'GET', headers: { Accept: accept, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    } catch {
      return null;
    }
  };
  const errorOf = async (res: Response): Promise<ReportDocumentError> => {
    let code: unknown;
    try { code = ((await res.json()) as { code?: unknown })?.code; } catch { code = undefined; }
    return reportDocumentHttpError(res.status, code);
  };
  return {
    async listByCase(caseId) {
      const res = await get(`/cases/${encodeURIComponent(caseId)}/report-documents`, 'application/json');
      if (!res) return fail('unavailable');
      if (!res.ok) return fail(await errorOf(res));
      try {
        const body = (await res.json()) as unknown;
        return Array.isArray(body) ? { ok: true, data: body as ReportDocument[] } : fail('unavailable');
      } catch {
        return fail('unavailable');
      }
    },
    async read(id, purpose) {
      const res = await get(`/report-documents/${encodeURIComponent(id)}${purpose ? `?purpose=${purpose}` : ''}`, 'application/pdf');
      if (!res) return fail('unavailable');
      if (!res.ok) return fail(await errorOf(res));
      let bytes: Uint8Array;
      try { bytes = new Uint8Array(await res.arrayBuffer()); } catch { return fail('unavailable'); }
      if (!bytes.length) return fail('empty');
      const claimed = res.headers.get('X-Content-SHA256')?.trim().toLowerCase();
      // No hash header: the server (or a proxy, or CORS not exposing it) is misconfigured, not the document changed.
      if (!claimed) return fail('unavailable');
      const sha256 = sha256HexBytes(bytes);
      if (claimed !== sha256) return fail('integrity');
      const header = (name: string) => res.headers.get(name)?.trim() || undefined;
      const servedId = header('X-Report-Document-Id') ?? id;
      if (servedId !== id) return fail('integrity'); // never another document in its place
      const pick = <T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T => (allowed as readonly string[]).includes(value ?? '') ? value as T : fallback;
      const document: ReportDocument = {
        id, caseId: header('X-Case-Id') ?? '',
        reportType: pick(header('X-Report-Type'), REPORT_TYPES, 'FINAL'),
        source: pick(header('X-Report-Source'), REPORT_SOURCES, 'SURGPATH'),
        releasedAt: header('X-Released-At') ?? '',
        producedBy: pick(header('X-Produced-By'), PRODUCERS, 'report-renderer'),
        sha256, byteLength: bytes.length,
        createdAt: header('X-Created-At') ?? '',
      };
      const pdfBase64 = bytesToBase64(bytes);
      return { ok: true, data: { document, pdfBase64 } };
    },
  };
}

/**
 * This browser's documents (releases made here, until the release moves to the
 * server) and the server's. Stores here; reads here first, then the server;
 * lists both, oldest first, each document once.
 */
export function createServerBackedReportDocumentService(local: IReportDocumentService, server: IReportDocumentReadApi): IReportDocumentService {
  return {
    store: input => local.store(input),
    async read(id, purpose) {
      const here = await local.read(id, purpose);
      if (here.ok === true || here.error !== 'notFound') return here;
      return server.read(id, purpose);
    },
    async listByCase(caseId) {
      const [here, there] = await Promise.all([local.listByCase(caseId), server.listByCase(caseId)]);
      if (there.ok === false && here.ok === false) return there;
      const byId = new Map<string, ReportDocument>();
      for (const d of there.ok === true ? there.data : []) byId.set(d.id, d);
      for (const d of here.ok === true ? here.data : []) if (!byId.has(d.id)) byId.set(d.id, d);
      const data = [...byId.values()].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      // The server's list couldn't be read: show this browser's, and say the list may be incomplete.
      return there.ok === false ? { ok: true, data, meta: { partial: true } } : { ok: true, data };
    },
  };
}
