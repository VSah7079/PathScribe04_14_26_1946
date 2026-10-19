// src/services/exports/httpExportApi.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 550 (PS-539 phase 2d, decision D7): the browser's client for the API
// server's export endpoints (docs/architecture/ASYNC_EXPORT_API.md §3). Used
// only when an API server is configured; the demo builds exports in the
// browser as before. Dependencies are passed in (fetch, the access token).
// ─────────────────────────────────────────────────────────────────────────────
import type { ExportDownloadLink, ExportErrorBody, ExportErrorCode, ExportJob, ExportRequest } from './asyncExportContract';

/** Why a call didn't give an answer: the contract's codes, or the call itself. */
export type ExportApiErrorCode = ExportErrorCode | 'NOT_FOUND' | 'UNAVAILABLE' | 'SIGNED_OUT';

export interface ExportApiError {
  code: ExportApiErrorCode;
  /** With TOO_MANY_ROWS: how many rows matched. */
  matchedRows?: number;
}

export type ExportApiResult<T> = { ok: true; data: T } | { ok: false; error: ExportApiError };

/** Batch 611 (#194): how the browser builds the file today. Only the simulated export server uses it; the real one builds from the request's parameters. */
export interface ExportLocalBuild {
  build: () => Promise<unknown> | unknown;
}

export interface IExportApi {
  /** `POST /api/exports`: 202 with the queued job. `local` is for the simulated server only; the HTTP client ignores it. */
  request(req: ExportRequest, local?: ExportLocalBuild): Promise<ExportApiResult<ExportJob>>;
  /** `GET /api/exports/{id}`. */
  get(exportId: string): Promise<ExportApiResult<ExportJob>>;
  /** `GET /api/exports`: the requester's exports, newest first. */
  list(): Promise<ExportApiResult<ExportJob[]>>;
  /** `POST /api/exports/{id}/download`: a link valid for 15 minutes; the capability is checked again. */
  downloadLink(exportId: string): Promise<ExportApiResult<ExportDownloadLink>>;
  /** `POST /api/exports/{id}/cancel`. */
  cancel(exportId: string): Promise<ExportApiResult<ExportJob>>;
}

export interface HttpExportApiDeps {
  baseUrl: string;
  fetch: typeof fetch;
  /** The signed-in user's access token ('' when none). */
  accessToken: () => Promise<string>;
}

const KNOWN_CODES: readonly ExportErrorCode[] = ['NOT_PERMITTED', 'TOO_MANY_ROWS', 'TOO_MANY_OPEN', 'INVALID_PARAMETERS', 'TIMED_OUT', 'BUILD_FAILED'];

/** The error a failed response means (pure). */
export function exportApiError(status: number, body: unknown): ExportApiError {
  const b = (body && typeof body === 'object' ? body : {}) as Partial<ExportErrorBody>;
  const code = typeof b.code === 'string' && (KNOWN_CODES as readonly string[]).includes(b.code) ? b.code as ExportErrorCode : undefined;
  const matchedRows = typeof b.matchedRows === 'number' && Number.isFinite(b.matchedRows) ? b.matchedRows : undefined;
  if (code) return { code, ...(matchedRows !== undefined ? { matchedRows } : {}) };
  if (status === 401) return { code: 'SIGNED_OUT' };
  if (status === 403) return { code: 'NOT_PERMITTED' };
  if (status === 404) return { code: 'NOT_FOUND' };
  if (status === 400 || status === 422) return { code: 'INVALID_PARAMETERS' };
  if (status === 409 || status === 429) return { code: 'TOO_MANY_OPEN' };
  return { code: 'UNAVAILABLE' };
}

export function createHttpExportApi(deps: HttpExportApiDeps): IExportApi {
  const root = `${deps.baseUrl.replace(/\/+$/, '')}/api/exports`;
  const call = async <T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<ExportApiResult<T>> => {
    let res: Response;
    try {
      const token = await deps.accessToken();
      res = await deps.fetch(`${root}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      return { ok: false, error: { code: 'UNAVAILABLE' } };
    }
    let parsed: unknown = null;
    try { parsed = await res.json(); } catch { parsed = null; }
    if (!res.ok) return { ok: false, error: exportApiError(res.status, parsed) };
    if (parsed === null || typeof parsed !== 'object') return { ok: false, error: { code: 'UNAVAILABLE' } };
    return { ok: true, data: parsed as T };
  };
  const id = (exportId: string) => `/${encodeURIComponent(exportId)}`;
  return {
    request: req => call<ExportJob>('', 'POST', req),
    get: exportId => call<ExportJob>(id(exportId), 'GET'),
    list: () => call<ExportJob[]>('', 'GET'),
    downloadLink: exportId => call<ExportDownloadLink>(`${id(exportId)}/download`, 'POST', {}),
    cancel: exportId => call<ExportJob>(`${id(exportId)}/cancel`, 'POST', {}),
  };
}
