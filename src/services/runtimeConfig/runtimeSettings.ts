// src/services/runtimeConfig/runtimeSettings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 547 (PS-539 phase 2d, readiness review §9 item 1): one build serves
// every deployment. The deployment's settings come from /config.json, read when
// the app starts (loadRuntimeConfig.ts), instead of being fixed into the build
// as VITE_* variables. The names are the same as the VITE_* variables, so a
// hospital's IT sets the same names it would have set at build time.
// docs/architecture/RUNTIME_CONFIG.md.
//
// This file is the list of settings config.json may carry and the check of a
// config.json. Pure.
//
// Not runtime settings: VITE_APP_VERSION (the build's own version) and
// VITE_BABAKHANI_EMAIL (a demo account). Nothing secret is ever a setting:
// config.json is served to every browser, like the bundle (the env exposure
// guard's rule, services/security/envExposure.guard.test.ts).
// ─────────────────────────────────────────────────────────────────────────────

export type RuntimeSettingKind =
  | 'endpoint'  // a server's address: https (plain http only to this computer, and only in a development build), as resolveServiceEndpoint takes it
  | 'proxy'     // a path on this site starting with "/", or an https address
  | 'text';

export const RUNTIME_SETTINGS = {
  VITE_API_BASE_URL:                 { kind: 'endpoint',  about: 'The PathScribe API server', notInDemo: true },
  VITE_APP_ENV:                      { kind: 'text',     about: '"production" or a validation instance (the sign-in badge, registry environment)' },
  VITE_AUTH_MODE:                    { kind: 'text',     about: 'How people sign in ("sso" or password)' },
  VITE_AUTH_MICROSOFT_AUTHORITY:     { kind: 'endpoint',  about: 'Microsoft Entra ID sign-in authority' },
  VITE_AUTH_MICROSOFT_CLIENT_ID:     { kind: 'text',     about: 'Microsoft Entra ID client id' },
  VITE_AUTH_MICROSOFT_API_SCOPE:     { kind: 'text',     about: 'Microsoft Entra ID API scope' },
  VITE_AUTH_MICROSOFT_SCOPES:        { kind: 'text',     about: 'Microsoft Entra ID scopes' },
  VITE_AUTH_MICROSOFT_LINK_BY_EMAIL: { kind: 'text',     about: 'Link Microsoft accounts to staff by email ("true")' },
  VITE_AUTH_GOOGLE_AUTHORITY:        { kind: 'endpoint',  about: 'Google sign-in authority' },
  VITE_AUTH_GOOGLE_CLIENT_ID:        { kind: 'text',     about: 'Google client id' },
  VITE_AUTH_GOOGLE_API_SCOPE:        { kind: 'text',     about: 'Google API scope' },
  VITE_AUTH_GOOGLE_SCOPES:           { kind: 'text',     about: 'Google scopes' },
  VITE_AUTH_GOOGLE_LINK_BY_EMAIL:    { kind: 'text',     about: 'Link Google accounts to staff by email ("true")' },
  VITE_AUTH_OIDC_AUTHORITY:          { kind: 'endpoint',  about: 'Other OpenID Connect provider: authority' },
  VITE_AUTH_OIDC_CLIENT_ID:          { kind: 'text',     about: 'Other OpenID Connect provider: client id' },
  VITE_AUTH_OIDC_API_SCOPE:          { kind: 'text',     about: 'Other OpenID Connect provider: API scope' },
  VITE_AUTH_OIDC_SCOPES:             { kind: 'text',     about: 'Other OpenID Connect provider: scopes' },
  VITE_AUTH_OIDC_LINK_BY_EMAIL:      { kind: 'text',     about: 'Link accounts to staff by email ("true")' },
  VITE_PWNED_CHECK:                  { kind: 'text',     about: '"off" skips the breached-password check' },
  VITE_LIVE_UPDATES_HUB_URL:         { kind: 'endpoint',  about: 'The live-updates (SignalR) hub', notInDemo: true },
  VITE_REPORT_PDF_ENDPOINT:          { kind: 'endpoint',  about: 'The report renderer', notInDemo: true },
  VITE_SERVER_JOBS:                  { kind: 'text',     about: 'The recurring jobs the API server runs, comma-separated (MESSAGE_BUS_API.md §5); the browser stops standing in for those (Batch 555)', notInDemo: true },
  VITE_INTERFACE_RECEIVER_ENDPOINT:  { kind: 'endpoint',  about: 'The interface receiver (until the API hands messages over, INTERFACE_ENGINE_EDGE.md)', notInDemo: true },
  VITE_AI_PROVIDER:                  { kind: 'text',     about: 'AI provider' },
  VITE_AI_MODEL:                     { kind: 'text',     about: 'AI model', fromServer: true },
  VITE_AI_PROXY_URL:                 { kind: 'proxy',     about: 'The AI proxy' },
  VITE_AI_MANAGED_DEPLOYMENT:        { kind: 'text',     about: 'Managed AI deployment name', fromServer: true },
  VITE_AI_MANAGED_ENDPOINT:          { kind: 'endpoint',  about: 'Managed AI endpoint' },
  VITE_AI_GATEWAY_REGION:            { kind: 'text',     about: 'AI gateway region' },
  VITE_AI_HOSTING_REGION:            { kind: 'text',     about: 'Where the AI service runs (shown to administrators)', fromServer: true },
  VITE_AI_CUSTOM_ENDPOINT:           { kind: 'endpoint',  about: 'Custom AI endpoint' },
  VITE_AI_MAX_TOKENS:                { kind: 'text',     about: 'AI response length limit', fromServer: true },
  VITE_NLM_BASE_URL:                 { kind: 'endpoint',  about: 'NLM clinical tables' },
  VITE_CPT_PROXY_URL:                { kind: 'proxy',     about: 'CPT terminology proxy' },
  VITE_ICD10_PROXY_URL:              { kind: 'proxy',     about: 'ICD-10 terminology proxy' },
  VITE_ENHANCEMENT_EMAIL:            { kind: 'text',     about: 'Where enhancement requests are sent' },
  VITE_VOICE_ENABLED:                { kind: 'text',     about: 'Voice commands ("true" or "false")', fromServer: true },
} as const satisfies Record<string, { kind: RuntimeSettingKind; about: string; notInDemo?: true; fromServer?: true }>;

export type RuntimeSettingKey = keyof typeof RUNTIME_SETTINGS;
export type RuntimeSettings = Partial<Record<RuntimeSettingKey, string>>;

export type RuntimeConfigProblemCode =
  | 'NOT_AN_OBJECT'            // config.json isn't a JSON object
  | 'UNREADABLE'               // config.json couldn't be parsed
  | 'UNKNOWN_SETTING'          // a name that isn't a setting (a typo, or a build-only value)
  | 'NOT_TEXT'                 // a value that isn't text, a number or true/false
  | 'TOO_LONG'
  | 'INVALID_URL'
  | 'NOT_HTTPS'                // http to anywhere but this computer (and that only in a development build)
  | 'NOT_THIS_SITE'            // a path that leads to another site
  | 'API_SERVER_IN_DEMO_BUILD' // the demo build carries demo accounts and tools: it never talks to a real API server
  | 'NOT_IN_DEMO_BUILD'        // a server-side address (hub, renderer, interface receiver), or "production", in a demo build
  | 'API_SERVER_REQUIRED'      // a server build without an API server address
  | 'SSO_REQUIRED'             // a server build signs in through the identity provider only (no demo or browser passwords)
  | 'ADDRESS_NOT_FROM_SERVER'  // Batch 557: /api/config may not set an address (the security policy is made from config.json's)
  | 'NOT_FROM_SERVER';         // Batch 557: a setting only config.json or the build may set (sign-in, the instance role, which jobs the server runs…)

/** `from: 'server'`: the problem is in the API server's /api/config (Batch 557), not in config.json. */
export interface RuntimeConfigProblem { key?: string; code: RuntimeConfigProblemCode; from?: 'server' }

const MAX_LENGTH = 2_000;
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * What's wrong with a server address, or null: https only, with no user name
 * or password in it; plain http only to this computer, and only in a
 * development build. The same rule the services apply when they use it
 * (resolveServiceEndpoint, utils/serviceEndpoint.ts), so config.json is never
 * accepted here and then refused there.
 */
export function endpointProblem(value: string, isProduction: boolean): RuntimeConfigProblemCode | null {
  let u: URL;
  try { u = new URL(value); } catch { return 'INVALID_URL'; }
  if (u.username || u.password) return 'INVALID_URL';
  if (u.protocol === 'https:') return null;
  if (u.protocol === 'http:') return !isProduction && LOOPBACK.has(u.hostname) ? null : 'NOT_HTTPS';
  return 'INVALID_URL';
}

/** A proxy setting: a path on this site ("/api/ai"), or a server address as above. */
export function proxyProblem(value: string, isProduction: boolean): RuntimeConfigProblemCode | null {
  if (value.startsWith('/')) {
    if (value.includes('\\')) return 'NOT_THIS_SITE';
    const base = 'https://this-site.invalid';
    try { return new URL(value, base).origin === base ? null : 'NOT_THIS_SITE'; } catch { return 'INVALID_URL'; }
  }
  return endpointProblem(value, isProduction);
}

/**
 * Checks a parsed config.json. `demoBuild` is the build's __DEMO_TOOLS__: a
 * demo build refuses an API server address (its demo accounts and reset
 * tools must never reach real data); a server build needs one, from the build
 * or from config.json.
 */
export function parseRuntimeConfig(
  raw: unknown,
  ctx: BuildContext,
  /** Batch 557: false checks the values only; the build rules are applied once config.json and /api/config are merged. */
  options: { buildRules?: boolean } = {},
): { values: RuntimeSettings; problems: RuntimeConfigProblem[] } {
  const problems: RuntimeConfigProblem[] = [];
  const values: RuntimeSettings = {};
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { values, problems: [{ code: 'NOT_AN_OBJECT' }] };
  }
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!(key in RUNTIME_SETTINGS)) { problems.push({ key, code: 'UNKNOWN_SETTING' }); continue; }
    if (v === null || v === undefined) continue;
    if (!['string', 'number', 'boolean'].includes(typeof v)) { problems.push({ key, code: 'NOT_TEXT' }); continue; }
    const text = String(v).trim();
    if (text.length > MAX_LENGTH) { problems.push({ key, code: 'TOO_LONG' }); continue; }
    if (!text) continue;
    const setting: { kind: RuntimeSettingKind; notInDemo?: true } = RUNTIME_SETTINGS[key as RuntimeSettingKey];
    const isProduction = ctx.isProduction ?? true;
    const p = setting.kind === 'endpoint' ? endpointProblem(text, isProduction) : setting.kind === 'proxy' ? proxyProblem(text, isProduction) : null;
    if (p) { problems.push({ key, code: p }); continue; }
    if (ctx.demoBuild && setting.notInDemo && key !== 'VITE_API_BASE_URL') { problems.push({ key, code: 'NOT_IN_DEMO_BUILD' }); continue; }
    if (ctx.demoBuild && key === 'VITE_APP_ENV' && text.toLowerCase() === 'production') { problems.push({ key, code: 'NOT_IN_DEMO_BUILD' }); continue; }
    values[key as RuntimeSettingKey] = text;
  }
  if (options.buildRules !== false) problems.push(...buildRuleProblems(values, ctx));
  return { values, problems };
}

/**
 * Batch 557 (readiness review §9 item 1): the settings the API server's
 * /api/config may give: only those marked `fromServer` (the AI model, its
 * deployment, token limit and region, and voice). Everything that decides
 * security or behaviour stays with the site: sign-in (mode, client ids, scopes,
 * linking by email), the instance role (VITE_APP_ENV), which jobs the server
 * runs (VITE_SERVER_JOBS: if /api/config were missed, the browser would run
 * them too), the AI provider, the breached-password check, the enhancement
 * address. And every address, because the site's Content-Security-Policy is
 * made from config.json's (RUNTIME_CONFIG.md §5). Pure.
 */
export function parseServerSettings(raw: unknown, ctx: BuildContext): { values: RuntimeSettings; problems: RuntimeConfigProblem[] } {
  if (raw === undefined || raw === null) return { values: {}, problems: [] };
  const parsed = parseRuntimeConfig(raw, ctx, { buildRules: false });
  const values: RuntimeSettings = {};
  const problems: RuntimeConfigProblem[] = parsed.problems.map(p => ({ ...p, from: 'server' as const }));
  for (const [key, value] of Object.entries(parsed.values) as [RuntimeSettingKey, string][]) {
    const setting: { kind: RuntimeSettingKind; fromServer?: true } = RUNTIME_SETTINGS[key];
    if (setting.kind !== 'text') { problems.push({ key, code: 'ADDRESS_NOT_FROM_SERVER', from: 'server' }); continue; }
    if (!setting.fromServer) { problems.push({ key, code: 'NOT_FROM_SERVER', from: 'server' }); continue; }
    values[key] = value;
  }
  return { values, problems };
}

/** Batch 557: where the deployment keeps its data, from /api/config, shown to administrators (readiness review §9 item 7). */
export interface ServerHosting {
  /** The database's region, e.g. "UK South" or "eu-west-2". */
  databaseRegion?: string;
  /** The file (blob) storage's region. */
  blobRegion?: string;
}

/** The hosting block of /api/config, kept to short text (pure). */
export function parseServerHosting(raw: unknown): ServerHosting {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const pick = (v: unknown) => (typeof v === 'string' && v.trim() && v.trim().length <= 100 ? v.trim() : undefined);
  const r = raw as Record<string, unknown>;
  const out: ServerHosting = {};
  const db = pick(r.databaseRegion);
  const blob = pick(r.blobRegion);
  if (db) out.databaseRegion = db;
  if (blob) out.blobRegion = blob;
  return out;
}

/** What the start-up knows about the build itself. */
export interface BuildContext {
  /** The build's __DEMO_TOOLS__. */
  demoBuild: boolean;
  /** The build's own VITE_API_BASE_URL and VITE_AUTH_MODE, used when config.json doesn't set them. */
  buildApiBaseUrl?: string;
  buildAuthMode?: string;
  /** import.meta.env.PROD: plain http to this computer is allowed only in development. Default true. */
  isProduction?: boolean;
}

/**
 * The demo/server build rules, for config.json's values (none at all is a
 * config of its own):
 *   - a demo build never has an API server;
 *   - a server build must have one, and signs in through the identity
 *     provider only ("sso"): its sign-in code has no demo accounts or browser
 *     passwords (authSessionInstance.ts), and a site that left the mode out
 *     must not fall back to them.
 */
export function buildRuleProblems(values: RuntimeSettings, ctx: BuildContext): RuntimeConfigProblem[] {
  if (ctx.demoBuild) return values.VITE_API_BASE_URL ? [{ key: 'VITE_API_BASE_URL', code: 'API_SERVER_IN_DEMO_BUILD' }] : [];
  const problems: RuntimeConfigProblem[] = [];
  if (!values.VITE_API_BASE_URL && !(ctx.buildApiBaseUrl ?? '').trim()) problems.push({ key: 'VITE_API_BASE_URL', code: 'API_SERVER_REQUIRED' });
  if ((values.VITE_AUTH_MODE ?? ctx.buildAuthMode ?? '').trim() !== 'sso') problems.push({ key: 'VITE_AUTH_MODE', code: 'SSO_REQUIRED' });
  return problems;
}
