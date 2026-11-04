// src/services/apiServer/apiHttpClient.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 592 (PS-481): the one HTTP client the app's server-backed services use
// to call the PathScribe API server. It sends the signed-in user's token,
// turns every outcome into a ServiceResult, and gives a failure a short, fixed
// code (never the server's message text, which could carry patient details).
// Dependencies are passed in (fetch, the access token), so it is tested
// without a network. `selectByConfiguration` picks the mock or the server
// version of a service from whether an API address is configured.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResultFailure, ServiceResultSuccess } from '../types';

export type ApiErrorCode =
  | 'SIGNED_OUT' | 'NOT_PERMITTED' | 'NOT_FOUND' | 'CONFLICT' | 'INVALID'
  | 'TOO_MANY_REQUESTS' | 'TIMED_OUT' | 'UNAVAILABLE';

export interface ApiHttpClientDeps {
  baseUrl: string;
  fetch: typeof fetch;
  /** The signed-in user's access token ('' when none). */
  accessToken: () => Promise<string>;
  /** Give up on a call after this long (default 30 s). */
  timeoutMs?: number;
}

/** Batch 615 (PS-482): a failure may carry the case version the server holds now (a 409 with `currentVersion`). */
export type ApiFailure = ServiceResultFailure & { currentVersion?: number };
export type ApiResult<T> = ServiceResultSuccess<T> | ApiFailure;

/** Batch 615: extra request headers for one call, such as `If-Match` on a versioned save. */
export interface ApiRequestOptions { headers?: Record<string, string> }

export interface ApiHttpClient {
  get<T>(path: string, options?: ApiRequestOptions): Promise<ApiResult<T>>;
  post<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<ApiResult<T>>;
  put<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<ApiResult<T>>;
  patch<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<ApiResult<T>>;
  delete<T>(path: string, options?: ApiRequestOptions): Promise<ApiResult<T>>;
}

const SERVER_CODE = /^[A-Z][A-Z0-9_]{1,39}$/;

/** The failure code a response means (pure). A well-formed code from the server wins; its message text is never used. */
export function apiErrorCode(status: number, body: unknown): string {
  const code = body && typeof body === 'object' ? (body as { code?: unknown }).code : undefined;
  if (typeof code === 'string' && SERVER_CODE.test(code)) return code;
  if (status === 401) return 'SIGNED_OUT';
  if (status === 403) return 'NOT_PERMITTED';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'TOO_MANY_REQUESTS';
  if (status === 400 || status === 422) return 'INVALID';
  return 'UNAVAILABLE';
}

export function createApiHttpClient(deps: ApiHttpClientDeps): ApiHttpClient {
  const root = deps.baseUrl.replace(/\/+$/, '');
  const timeoutMs = deps.timeoutMs ?? 30_000;
  const call = async <T>(method: string, path: string, body?: unknown, options?: ApiRequestOptions): Promise<ApiResult<T>> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      const token = await deps.accessToken();
      res = await deps.fetch(`${root}${path.startsWith('/') ? path : `/${path}`}`, {
        method,
        signal: controller.signal,
        headers: {
          ...(options?.headers ?? {}),
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      return { ok: false, error: controller.signal.aborted ? 'TIMED_OUT' : 'UNAVAILABLE' };
    } finally {
      clearTimeout(timer);
    }
    let parsed: unknown = null;
    if (res.status !== 204) { try { parsed = await res.json(); } catch { parsed = null; } }
    if (!res.ok) {
      const current = parsed && typeof parsed === 'object' ? (parsed as { currentVersion?: unknown }).currentVersion : undefined;
      return { ok: false, error: apiErrorCode(res.status, parsed), ...(res.status === 409 && typeof current === 'number' ? { currentVersion: current } : {}) };
    }
    if (res.status === 204) return { ok: true, data: undefined as T };
    if (parsed === null || typeof parsed !== 'object') return { ok: false, error: 'UNAVAILABLE' };
    return { ok: true, data: parsed as T };
  };
  return {
    get: (p, o) => call('GET', p, undefined, o),
    post: (p, b, o) => call('POST', p, b ?? {}, o),
    put: (p, b, o) => call('PUT', p, b ?? {}, o),
    patch: (p, b, o) => call('PATCH', p, b ?? {}, o),
    delete: (p, o) => call('DELETE', p, undefined, o),
  };
}

/** The server's version of a service when an API address is configured, otherwise the mock (the demo). */
export function selectByConfiguration<T>(baseUrl: string | null, mock: T, makeHttp: (baseUrl: string) => T): T {
  return baseUrl ? makeHttp(baseUrl) : mock;
}
