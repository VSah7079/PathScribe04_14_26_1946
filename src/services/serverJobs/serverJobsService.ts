// src/services/serverJobs/serverJobsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 551 (PS-539 phase 2d; MESSAGE_BUS_API.md §4 and §4a): the "Server
// jobs" view's service. With the API server it reads the job kinds' health,
// the recurring jobs and the dead-lettered jobs, and requeues one. Each call
// checks its capability here first (CLAUDE.md rule 7), and the server checks
// it again:
//   - jobs:server-job:view     to see the health and the dead letters;
//   - jobs:server-job:requeue  to send a dead-lettered job again (audited by
//     the server). Interface and print jobs are refused here (WRONG_SCREEN):
//     they are resent from Audit Log → Interfaces with their own capabilities.
// With no API server (the demo) the browser does this work itself, so there
// is nothing to list (`viaServer` false).
// ─────────────────────────────────────────────────────────────────────────────
import type { IAuthorizationService } from '../authorization/authorizationService';
import { deadLetterContext, normaliseJobKind, requeueRouteFor, type DeadLetteredJob, type RequeueResult, type ServerJobKind, type ServerJobsErrorCode, type ServerJobsHealth } from './serverJobsContract';

export type ServerJobsResult<T> = { ok: true; data: T } | { ok: false; error: ServerJobsErrorCode };

export interface IServerJobsApi {
  health(): Promise<ServerJobsResult<ServerJobsHealth>>;
  deadLetters(kind?: ServerJobKind): Promise<ServerJobsResult<DeadLetteredJob[]>>;
  requeue(jobId: string): Promise<ServerJobsResult<RequeueResult>>;
}

export interface IServerJobsService {
  readonly viaServer: boolean;
  health(): Promise<ServerJobsResult<ServerJobsHealth>>;
  /** Only the jobs whose facility and case this person may see (the server filters too). */
  deadLetters(kind?: ServerJobKind): Promise<ServerJobsResult<DeadLetteredJob[]>>;
  requeue(job: Pick<DeadLetteredJob, 'jobId' | 'kind' | 'facilityId' | 'caseId'>): Promise<ServerJobsResult<RequeueResult>>;
}

export interface ServerJobsDeps {
  api: IServerJobsApi | null;
  authorization: Pick<IAuthorizationService, 'enforce' | 'evaluate'>;
}

export const SERVER_JOBS_VIEW = 'jobs:server-job:view';
export const SERVER_JOBS_REQUEUE = 'jobs:server-job:requeue';

export function createServerJobsService(deps: ServerJobsDeps): IServerJobsService {
  const api = deps.api;
  const unavailable = { ok: false as const, error: 'UNAVAILABLE' as const };
  const mayView = async () => (await deps.authorization.enforce('jobs:server-job:view')).allowed;
  return {
    viaServer: api !== null,
    async health() {
      if (!api) return unavailable;
      if (!(await mayView())) return { ok: false, error: 'NOT_PERMITTED' };
      return api.health();
    },
    async deadLetters(kind) {
      if (!api) return unavailable;
      if (!(await mayView())) return { ok: false, error: 'NOT_PERMITTED' };
      const res = await api.deadLetters(kind);
      if (res.ok === false) return res;
      // Someone limited to some facilities sees only their facilities' jobs (and no case ids from elsewhere).
      const visible = await Promise.all(res.data.map(async j => (await deps.authorization.evaluate('jobs:server-job:view', deadLetterContext(j))).allowed));
      return { ok: true, data: res.data.filter((_, i) => visible[i]) };
    },
    async requeue(job) {
      if (!api) return unavailable;
      const route = requeueRouteFor(job.kind);
      if (!route || route.screen !== 'serverJobs') return { ok: false, error: 'WRONG_SCREEN' };
      // At the job's facility and case; a job that names neither (an export, an event) needs every facility.
      const decision = await deps.authorization.enforce('jobs:server-job:requeue', deadLetterContext(job));
      if (!decision.allowed) return { ok: false, error: 'NOT_PERMITTED' };
      return api.requeue(job.jobId);
    },
  };
}

export interface HttpServerJobsDeps {
  baseUrl: string;
  fetch: typeof fetch;
  accessToken: () => Promise<string>;
}

/** The error a failed response means (pure). */
export function serverJobsError(status: number, body: unknown): ServerJobsErrorCode {
  const code = body && typeof body === 'object' ? (body as { code?: unknown }).code : undefined;
  if (code === 'NOT_DEAD_LETTERED' || code === 'NOT_PERMITTED' || code === 'NOT_FOUND') return code;
  if (status === 401) return 'SIGNED_OUT';
  if (status === 403) return 'NOT_PERMITTED';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'NOT_DEAD_LETTERED';
  return 'UNAVAILABLE';
}

/** The client for `/api/jobs` (MESSAGE_BUS_API.md §4a). */
export function createHttpServerJobsApi(deps: HttpServerJobsDeps): IServerJobsApi {
  const root = `${deps.baseUrl.replace(/\/+$/, '')}/api/jobs`;
  const call = async <T>(path: string, method: 'GET' | 'POST'): Promise<ServerJobsResult<T>> => {
    let res: Response;
    try {
      const token = await deps.accessToken();
      res = await deps.fetch(`${root}${path}`, {
        method,
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
        ...(method === 'POST' ? { body: '{}' } : {}),
      });
    } catch {
      return { ok: false, error: 'UNAVAILABLE' };
    }
    let parsed: unknown = null;
    try { parsed = await res.json(); } catch { parsed = null; }
    if (!res.ok) return { ok: false, error: serverJobsError(res.status, parsed) };
    if (parsed === null || typeof parsed !== 'object') return { ok: false, error: 'UNAVAILABLE' };
    return { ok: true, data: parsed as T };
  };
  return {
    health: () => call<ServerJobsHealth>('/health', 'GET'),
    deadLetters: async kind => {
      const res = await call<DeadLetteredJob[]>(`/dead-letters${kind ? `?kind=${encodeURIComponent(kind)}` : ''}`, 'GET');
      if (res.ok === false || !Array.isArray(res.data)) return res.ok ? { ok: false, error: 'UNAVAILABLE' } : res;
      // `event:{consumer}` becomes an event job with its consumer.
      return { ok: true, data: res.data.map(j => { const n = normaliseJobKind(String(j.kind)); return { ...j, kind: n.kind, ...(n.consumer ? { consumer: j.consumer ?? n.consumer } : {}) }; }) };
    },
    requeue: jobId => call<RequeueResult>(`/${encodeURIComponent(jobId)}/requeue`, 'POST'),
  };
}
