// src/services/siteAgent/siteAgentAdminService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 552 (PS-539 phase 2d; SITE_AGENT_API.md §2, §3 and §11a): managing a
// site's agents from Configuration → System → Site agents. Every action
// checks its capability here, at the site (CLAUDE.md rule 7), and the server
// checks again and audits it:
//   - config:site-agents:enroll       make an enrolment code; revoke an agent;
//   - config:site-agent-config:manage change the site's agent printers and shares;
//   - either one lets you see the agents and the configuration.
// Batch 553: the site's report printers are also offered where a print goes
// (a routing rule, the facility's default, Redirect), to whoever may do that
// (reportPrinters, with the capability of the screen asking).
// With the API server, calls go to it. Without one (the demo), the
// configuration is kept like the other demo settings, a code can be made to
// show the steps, and no agent can enrol, so the agent list is empty.
// ─────────────────────────────────────────────────────────────────────────────
import type { IAuthorizationService } from '../authorization/authorizationService';
import { newEnrollmentCode, normaliseSiteAgentConfig, revokeReasonValid, siteAgentConfigValid, type AgentRevokeReason, type EnrollmentCode, type SiteAgentAdminError, type SiteAgentConfig, type SiteAgentSummary } from './siteAgentAdmin';
import { ENROLLMENT_LIMITS, type AgentPrinter } from './siteAgentContract';

export type SiteAgentResult<T> = { ok: true; data: T } | { ok: false; error: SiteAgentAdminError };

/** The calls, whichever side answers them. */
export interface ISiteAgentAdminApi {
  listAgents(siteId?: string): Promise<SiteAgentResult<SiteAgentSummary[]>>;
  createEnrollmentCode(siteId: string): Promise<SiteAgentResult<EnrollmentCode>>;
  revoke(agentId: string, reason: AgentRevokeReason): Promise<SiteAgentResult<SiteAgentSummary>>;
  getConfig(siteId: string): Promise<SiteAgentResult<SiteAgentConfig>>;
  saveConfig(config: SiteAgentConfig): Promise<SiteAgentResult<SiteAgentConfig>>;
  /** Batch 553: the site's printers only (no shares), for choosing where a print goes. */
  listPrinters(siteId: string): Promise<SiteAgentResult<AgentPrinter[]>>;
}

export interface ISiteAgentAdminService extends Omit<ISiteAgentAdminApi, 'listPrinters'> {
  /** True with the API server; false in the demo (no agent can enrol). */
  readonly viaServer: boolean;
  revoke(agentId: string, reason: AgentRevokeReason, siteId?: string): Promise<SiteAgentResult<SiteAgentSummary>>;
  /** Batch 553: the site's report printers (not label printers), for choosing where a print goes. */
  reportPrinters(siteId: string, purpose: AgentPrinterPurpose): Promise<SiteAgentResult<AgentPrinter[]>>;
}

/** Who is asking for the site's printers, and so which capability lets them see the list. */
export type AgentPrinterPurpose = 'routing' | 'facilityDefault' | 'redirect';

export interface SiteAgentAdminDeps {
  api: ISiteAgentAdminApi;
  viaServer: boolean;
  authorization: Pick<IAuthorizationService, 'enforce' | 'evaluate'>;
}

export function createSiteAgentAdminService(deps: SiteAgentAdminDeps): ISiteAgentAdminService {
  const { api, authorization } = deps;
  const refused = { ok: false as const, error: 'NOT_PERMITTED' as const };
  /** Seeing agents or configuration: either capability, at the site (no audit for a read). */
  const mayView = async (siteId?: string) => {
    const ctx = siteId ? { facilityId: siteId } : { allFacilities: true };
    const [a, b] = await Promise.all([authorization.evaluate('config:site-agents:enroll', ctx), authorization.evaluate('config:site-agent-config:manage', ctx)]);
    return a.allowed || b.allowed;
  };
  return {
    viaServer: deps.viaServer,
    async listAgents(siteId) {
      // Across every site (the Print Queue's status line): each agent's site is checked.
      if (!siteId) {
        const res = await api.listAgents();
        if (res.ok === false) return res;
        const visible = await Promise.all(res.data.map(a => mayView(a.siteId)));
        return { ok: true, data: res.data.filter((_, i) => visible[i]) };
      }
      if (!(await mayView(siteId))) return refused;
      return api.listAgents(siteId);
    },
    async createEnrollmentCode(siteId) {
      if (!(await authorization.enforce('config:site-agents:enroll', { facilityId: siteId })).allowed) return refused;
      return api.createEnrollmentCode(siteId);
    },
    // The server takes the agent's site from its own record, never from this call (AUTHORIZATION_API.md).
    async revoke(agentId, reason, siteId) {
      if (!(await authorization.enforce('config:site-agents:enroll', siteId ? { facilityId: siteId } : { allFacilities: true })).allowed) return refused;
      if (!revokeReasonValid(reason)) return { ok: false, error: 'INVALID' };
      const note = reason.note?.trim();
      return api.revoke(agentId, note ? { code: reason.code, note } : { code: reason.code });
    },
    // A read for a picker, so evaluate (no audit entry). The capability is the one the screen's own action needs.
    async reportPrinters(siteId, purpose) {
      const capability = purpose === 'routing' ? 'config:print-routing:manage' : purpose === 'facilityDefault' ? 'config:print-settings:manage' : 'print:job:redirect';
      if (!siteId || !(await authorization.evaluate(capability, { facilityId: siteId })).allowed) return refused;
      const res = await api.listPrinters(siteId);
      if (res.ok === false) return res;
      return { ok: true, data: res.data.filter(p => p.kind === 'report') };
    },
    async getConfig(siteId) {
      if (!(await mayView(siteId))) return refused;
      return api.getConfig(siteId);
    },
    async saveConfig(config) {
      if (!(await authorization.enforce('config:site-agent-config:manage', { facilityId: config.siteId })).allowed) return refused;
      const clean = normaliseSiteAgentConfig(config);
      if (!siteAgentConfigValid(clean)) return { ok: false, error: 'INVALID' };
      return api.saveConfig(clean);
    },
  };
}

// ─── With the API server ────────────────────────────────────────────────────

export interface HttpSiteAgentDeps { baseUrl: string; fetch: typeof fetch; accessToken: () => Promise<string> }

export function siteAgentHttpError(status: number): SiteAgentAdminError {
  if (status === 401) return 'SIGNED_OUT';
  if (status === 403) return 'NOT_PERMITTED';
  if (status === 404) return 'NOT_FOUND';
  if (status === 400 || status === 422) return 'INVALID';
  return 'UNAVAILABLE';
}

export function createHttpSiteAgentAdminApi(deps: HttpSiteAgentDeps): ISiteAgentAdminApi {
  const root = `${deps.baseUrl.replace(/\/+$/, '')}/api`;
  const call = async <T>(path: string, method: 'GET' | 'POST' | 'PUT', body?: unknown): Promise<SiteAgentResult<T>> => {
    let res: Response;
    try {
      const token = await deps.accessToken();
      res = await deps.fetch(`${root}${path}`, {
        method,
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      return { ok: false, error: 'UNAVAILABLE' };
    }
    if (!res.ok) return { ok: false, error: siteAgentHttpError(res.status) };
    try { return { ok: true, data: (await res.json()) as T }; } catch { return { ok: false, error: 'UNAVAILABLE' }; }
  };
  const site = (id: string) => `/sites/${encodeURIComponent(id)}`;
  return {
    listAgents: siteId => call<SiteAgentSummary[]>(siteId ? `${site(siteId)}/agents` : '/agents', 'GET'),
    createEnrollmentCode: siteId => call<EnrollmentCode>(`${site(siteId)}/agent-enrollment-codes`, 'POST', {}),
    revoke: (agentId, reason) => call<SiteAgentSummary>(`/agents/${encodeURIComponent(agentId)}/revoke`, 'POST', { reasonCode: reason.code, ...(reason.note ? { note: reason.note } : {}) }),
    getConfig: siteId => call<SiteAgentConfig>(`${site(siteId)}/agent-config`, 'GET'),
    saveConfig: config => call<SiteAgentConfig>(`${site(config.siteId)}/agent-config`, 'PUT', config),
    listPrinters: siteId => call<AgentPrinter[]>(`${site(siteId)}/agent-printers`, 'GET'),
  };
}

// ─── The demo ────────────────────────────────────────────────────────────────

export interface DemoSiteAgentDeps {
  read: (siteId: string) => SiteAgentConfig | null;
  write: (config: SiteAgentConfig) => void;
  random: (n: number) => Uint8Array;
  now: () => Date;
  userName: () => string;
}

/** No agent can enrol in the demo; the configuration is kept like other demo settings. */
export function createDemoSiteAgentAdminApi(deps: DemoSiteAgentDeps): ISiteAgentAdminApi {
  return {
    listAgents: async () => ({ ok: true, data: [] }),
    createEnrollmentCode: async siteId => ({
      ok: true,
      data: { code: newEnrollmentCode(deps.random), siteId, expiresAt: new Date(deps.now().getTime() + ENROLLMENT_LIMITS.codeHours * 3_600_000).toISOString() },
    }),
    revoke: async () => ({ ok: false, error: 'NOT_FOUND' }),
    getConfig: async siteId => ({ ok: true, data: deps.read(siteId) ?? { siteId, printers: [], shares: [] } }),
    listPrinters: async siteId => ({ ok: true, data: deps.read(siteId)?.printers ?? [] }),
    saveConfig: async config => {
      const saved = { ...config, updatedAt: deps.now().toISOString(), updatedBy: deps.userName() };
      deps.write(saved);
      return { ok: true, data: saved };
    },
  };
}
