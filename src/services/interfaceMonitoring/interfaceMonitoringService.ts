// src/services/interfaceMonitoring/interfaceMonitoringService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 554 (PS-539 phase 2d; INTERFACE_ENGINE_EDGE.md §9a): reads the
// interface engines' status. `interface:engine-status:view` is checked here
// first (CLAUDE.md rule 7) and again by the server. Read only: nothing is
// started, stopped or resent from here. With no API server (the demo) the
// browser handles interface messages itself and there is no engine to show.
// ─────────────────────────────────────────────────────────────────────────────
import type { IAuthorizationService } from '../authorization/authorizationService';
import { isEnginesResponse, normaliseEnginesResponse, type InterfaceEnginesResponse, type InterfaceMonitoringError } from './interfaceMonitoringContract';

export type InterfaceMonitoringResult<T> = { ok: true; data: T } | { ok: false; error: InterfaceMonitoringError };

export interface IInterfaceMonitoringApi {
  engines(): Promise<InterfaceMonitoringResult<InterfaceEnginesResponse>>;
}

export interface IInterfaceMonitoringService extends IInterfaceMonitoringApi {
  /** False in the demo: no engine, nothing to list. */
  readonly viaServer: boolean;
  /** Batch 605: true when the engines are the browser's sample ones (no API server). */
  readonly simulated?: boolean;
}

export function createInterfaceMonitoringService(deps: { api: IInterfaceMonitoringApi | null; simulatedApi?: IInterfaceMonitoringApi; authorization: Pick<IAuthorizationService, 'enforce'> }): IInterfaceMonitoringService {
  const api = deps.api ?? deps.simulatedApi ?? null;
  const simulated = deps.api === null && !!deps.simulatedApi;
  return {
    viaServer: api !== null,
    simulated,
    async engines() {
      if (!api) return { ok: false, error: 'UNAVAILABLE' };
      if (!(await deps.authorization.enforce('interface:engine-status:view')).allowed) return { ok: false, error: 'NOT_PERMITTED' };
      const res = await api.engines();
      return res.ok === true ? { ok: true, data: normaliseEnginesResponse(res.data) } : res;
    },
  };
}

export function interfaceMonitoringError(status: number): InterfaceMonitoringError {
  if (status === 401) return 'SIGNED_OUT';
  if (status === 403) return 'NOT_PERMITTED';
  return 'UNAVAILABLE';
}

/** A read that hasn't answered by then is given up, so a hung server doesn't pile up a request every minute. */
export const ENGINES_READ_TIMEOUT_MS = 15_000;

/** The client for `GET /api/interface/engines`. */
export function createHttpInterfaceMonitoringApi(deps: { baseUrl: string; fetch: typeof fetch; accessToken: () => Promise<string>; timeoutMs?: number }): IInterfaceMonitoringApi {
  const url = `${deps.baseUrl.replace(/\/+$/, '')}/api/interface/engines`;
  return {
    async engines() {
      let res: Response;
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), deps.timeoutMs ?? ENGINES_READ_TIMEOUT_MS);
      try {
        const token = await deps.accessToken();
        res = await deps.fetch(url, { method: 'GET', signal: abort.signal, headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      } catch {
        return { ok: false, error: 'UNAVAILABLE' };
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) return { ok: false, error: interfaceMonitoringError(res.status) };
      let body: unknown;
      try { body = await res.json(); } catch { return { ok: false, error: 'UNAVAILABLE' }; }
      return isEnginesResponse(body) ? { ok: true, data: body } : { ok: false, error: 'UNAVAILABLE' };
    },
  };
}
