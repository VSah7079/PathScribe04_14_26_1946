// src/services/runtimeConfig/loadRuntimeConfig.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 547 (PS-539 phase 2d). Reads /config.json when the app starts, before
// any service is created (main.tsx). No config.json (a 404, or a host that
// answers with the app's own page) means the build's own values, as before:
// the demo has none. A config.json that can't be read or breaks a rule stops
// the app with a configuration error screen, rather than starting it wrongly.
//
// Batch 557 (readiness review §9 items 1 and 7): with an API server, the app
// then reads the server's GET {api}/api/config: its settings (only the few
// marked `fromServer` in RUNTIME_SETTINGS; config.json's own values win, so a
// site can still override one) and
// where it keeps its data (`hosting`, shown to administrators). A server with
// no /api/config yet (404), or one that can't be reached within 5 seconds, is
// fine: config.json alone is used, as before. A /api/config that breaks a rule
// stops the app, like config.json. The build rules (an API server, sign-in by
// SSO) are checked on the merged settings.
// ─────────────────────────────────────────────────────────────────────────────
import { buildRuleProblems, endpointProblem, parseRuntimeConfig, parseServerHosting, parseServerSettings, type BuildContext, type RuntimeConfigProblem, type RuntimeSettings, type ServerHosting } from './runtimeSettings';

export interface LoadedRuntimeConfig {
  /** 'none': no config.json, the build's values are used. */
  source: 'none' | 'config.json';
  values: RuntimeSettings;
  problems: RuntimeConfigProblem[];
  /** Batch 557: whether the API server's /api/config was read ('read'), has none yet ('none'), or didn't answer in time ('unavailable'). */
  server?: 'read' | 'none' | 'unavailable';
  /** Batch 557: where the deployment keeps its data, from /api/config. */
  hosting?: ServerHosting;
}

type FetchLike = (url: string, init?: { cache?: 'no-store'; credentials?: 'omit' | 'same-origin'; signal?: AbortSignal }) => Promise<{
  ok: boolean; status: number; headers: { get(name: string): string | null }; text(): Promise<string>;
}>;

/** How long the start-up waits for /api/config before going on with config.json alone. */
export const SERVER_CONFIG_TIMEOUT_MS = 5_000;

export async function loadRuntimeConfig(
  fetchFn: FetchLike,
  url: string,
  ctx: BuildContext,
): Promise<LoadedRuntimeConfig> {
  let res: Awaited<ReturnType<FetchLike>>;
  try {
    // Never a cached copy: a changed config.json takes effect on the next load.
    res = await fetchFn(url, { cache: 'no-store', credentials: 'same-origin' });
  } catch {
    // The site itself can't be reached: the app couldn't have loaded either. Use the build's values.
    return withServerConfig(fetchFn, {}, ctx, 'none');
  }
  // No config.json: a 404, or a host that answers every address with the
  // app's own page. Anything else is read, whatever type it was served as, so
  // a file served as text/plain isn't silently skipped.
  const type = res.headers.get('content-type') ?? '';
  if (res.status === 404 || /text\/html/i.test(type)) {
    // Batch 557: no config.json, but a build that names its API server still reads /api/config.
    return withServerConfig(fetchFn, {}, ctx, 'none');
  }
  if (!res.ok) return { source: 'config.json', values: {}, problems: [{ code: 'UNREADABLE' }] };
  let raw: unknown;
  try { raw = JSON.parse(await res.text()); } catch { return { source: 'config.json', values: {}, problems: [{ code: 'UNREADABLE' }] }; }
  const parsed = parseRuntimeConfig(raw, ctx, { buildRules: false });
  if (parsed.problems.length) return { source: 'config.json', values: parsed.values, problems: [...parsed.problems, ...buildRuleProblems(parsed.values, ctx)] };
  return withServerConfig(fetchFn, parsed.values, ctx, 'config.json');
}

/** The API server's address, as the services will take it: config.json's, else the build's. */
const apiBase = (values: RuntimeSettings, ctx: BuildContext): string | null => {
  const url = (values.VITE_API_BASE_URL ?? ctx.buildApiBaseUrl ?? '').trim();
  // The build's own address is checked as config.json's is (https, no user name or password).
  if (!url || ctx.demoBuild || endpointProblem(url, ctx.isProduction ?? true)) return null;
  return url.replace(/\/+$/, '');
};

/** Batch 557: adds the API server's /api/config to config.json's values, then checks the build rules. */
export async function withServerConfig(fetchFn: FetchLike, local: RuntimeSettings, ctx: BuildContext, source: LoadedRuntimeConfig['source']): Promise<LoadedRuntimeConfig> {
  const done = (values: RuntimeSettings, server: LoadedRuntimeConfig['server'], hosting: ServerHosting = {}, problems: RuntimeConfigProblem[] = []): LoadedRuntimeConfig => ({
    source, values, problems: [...problems, ...buildRuleProblems(values, ctx)],
    ...(server ? { server } : {}), ...(Object.keys(hosting).length ? { hosting } : {}),
  });
  const api = apiBase(local, ctx);
  if (!api) return done(local, undefined);
  const abort = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = abort ? setTimeout(() => abort.abort(), SERVER_CONFIG_TIMEOUT_MS) : null;
  // The time limit covers the whole answer, its body included, so a stalled reply never holds the start-up.
  let status: number; let type: string; let ok: boolean; let text: string | null = null;
  try {
    // No credentials: /api/config is public, like config.json, and holds nothing secret.
    const res = await fetchFn(`${api}/api/config`, { cache: 'no-store', credentials: 'omit', ...(abort ? { signal: abort.signal } : {}) });
    status = res.status; ok = res.ok; type = res.headers.get('content-type') ?? '';
    if (ok && status !== 404 && !/text\/html/i.test(type)) text = await res.text();
  } catch {
    return done(local, 'unavailable');
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (status === 404 || /text\/html/i.test(type)) return done(local, 'none');
  if (!ok || text === null) return done(local, 'unavailable');
  let body: unknown;
  try { body = JSON.parse(text); } catch { return done(local, 'read', {}, [{ code: 'UNREADABLE', from: 'server' }]); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return done(local, 'read', {}, [{ code: 'NOT_AN_OBJECT', from: 'server' }]);
  const b = body as { settings?: unknown; hosting?: unknown };
  const fromServer = parseServerSettings(b.settings, ctx);
  // config.json's own values win: a site can still override one setting.
  return done({ ...fromServer.values, ...local }, 'read', parseServerHosting(b.hosting), fromServer.problems);
}
