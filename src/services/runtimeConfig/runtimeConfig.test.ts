import { describe, expect, it, vi } from 'vitest';
import { RUNTIME_SETTINGS, endpointProblem, parseRuntimeConfig, proxyProblem } from './runtimeSettings';
import { loadRuntimeConfig } from './loadRuntimeConfig';
import { parseServerHosting, parseServerSettings } from './runtimeSettings';
import { hostingRegionRows } from './hostingRegions';
import { serverHosting, setServerHosting } from './runtimeEnv';
import { appEnv, runtimeSettingsFromConfig, setRuntimeSettings } from './runtimeEnv';

// Batch 547 (PS-539 phase 2d): one build, each deployment's settings from config.json.
const server = { demoBuild: false, buildAuthMode: 'sso' };
const demo = { demoBuild: true };

describe('checking config.json', () => {
  it('takes known settings, trimmed; numbers and true/false become text', () => {
    const r = parseRuntimeConfig({ VITE_API_BASE_URL: ' https://ps.example/api ', VITE_AI_MAX_TOKENS: 2000, VITE_VOICE_ENABLED: false }, server);
    expect(r.problems).toEqual([]);
    expect(r.values).toEqual({ VITE_API_BASE_URL: 'https://ps.example/api', VITE_AI_MAX_TOKENS: '2000', VITE_VOICE_ENABLED: 'false' });
  });
  it('refuses an unknown name (a typo, or a build-only value), a value that is not text, and a non-object', () => {
    const r = parseRuntimeConfig({ VITE_API_BASE_URL: 'https://ps.example', VITE_API_BASEURL: 'x', VITE_APP_VERSION: '9', VITE_AUTH_MODE: { a: 1 } }, server);
    expect(r.problems).toEqual([
      { key: 'VITE_API_BASEURL', code: 'UNKNOWN_SETTING' },
      { key: 'VITE_APP_VERSION', code: 'UNKNOWN_SETTING' },
      { key: 'VITE_AUTH_MODE', code: 'NOT_TEXT' },
    ]);
    expect(parseRuntimeConfig([1], server).problems).toEqual([{ code: 'NOT_AN_OBJECT' }]);
  });
  it('a server address is https, as the services take it; plain http only to this computer in development', () => {
    expect(endpointProblem('https://x.example/a', true)).toBeNull();
    expect(endpointProblem('http://localhost:5173/render', false)).toBeNull();
    expect(endpointProblem('http://localhost:5173/render', true)).toBe('NOT_HTTPS');
    expect(endpointProblem('http://renderer.internal/render', false)).toBe('NOT_HTTPS');
    expect(endpointProblem('/api', true)).toBe('INVALID_URL');
    expect(endpointProblem('wss://hub.example', true)).toBe('INVALID_URL');
    expect(endpointProblem('https://user:pw@x.example', true)).toBe('INVALID_URL');
    expect(endpointProblem('javascript:alert(1)', true)).toBe('INVALID_URL');
  });
  it('a proxy may also be a path on this site, never one leading elsewhere', () => {
    expect(proxyProblem('/api/ai', true)).toBeNull();
    expect(proxyProblem('https://proxy.example/ai', true)).toBeNull();
    expect(proxyProblem('//evil.example/x', true)).toBe('NOT_THIS_SITE');
    expect(proxyProblem('/\\evil.example/x', true)).toBe('NOT_THIS_SITE');
  });
  it('an error-monitoring address needs a public key, a project and https (PS-469)', () => {
    const ok = parseRuntimeConfig({ VITE_ERROR_MONITORING_DSN: 'https://key@o1.ingest.sentry.io/42', VITE_ERROR_MONITORING_ENV: 'hospital-a-prod' }, { demoBuild: false, buildApiBaseUrl: 'https://x.example', buildAuthMode: 'sso' });
    expect(ok.problems).toEqual([]);
    for (const bad of ['https://o1.ingest.sentry.io/42', 'http://key@collector.example/1', 'https://key:pw@collector.example/1', 'https://key@collector.example/', 'https://key@collector.example/1?a=b']) {
      const r = parseRuntimeConfig({ VITE_ERROR_MONITORING_DSN: bad }, { demoBuild: false, buildApiBaseUrl: 'https://x.example', buildAuthMode: 'sso' });
      expect(r.problems.some(p => p.key === 'VITE_ERROR_MONITORING_DSN'), bad).toBe(true);
    }
  });

  it('a demo build never talks to an API server, a hub, the renderer or an interface receiver, and is never "production"', () => {
    expect(parseRuntimeConfig({ VITE_API_BASE_URL: 'https://ps.example' }, demo).problems).toEqual([{ key: 'VITE_API_BASE_URL', code: 'API_SERVER_IN_DEMO_BUILD' }]);
    expect(parseRuntimeConfig({
      VITE_LIVE_UPDATES_HUB_URL: 'https://ps.example/hubs/live', VITE_REPORT_PDF_ENDPOINT: 'https://ps.example/render',
      VITE_INTERFACE_RECEIVER_ENDPOINT: 'https://engine.example', VITE_APP_ENV: 'Production', VITE_AI_PROXY_URL: '/api/ai',
    }, demo).problems.map(p => [p.key, p.code])).toEqual([
      ['VITE_LIVE_UPDATES_HUB_URL', 'NOT_IN_DEMO_BUILD'], ['VITE_REPORT_PDF_ENDPOINT', 'NOT_IN_DEMO_BUILD'],
      ['VITE_INTERFACE_RECEIVER_ENDPOINT', 'NOT_IN_DEMO_BUILD'], ['VITE_APP_ENV', 'NOT_IN_DEMO_BUILD'],
    ]);
    expect(parseRuntimeConfig({}, demo).problems).toEqual([]);
    // Batch 555: which jobs a server runs is a server deployment's setting only.
    expect(parseRuntimeConfig({ VITE_SERVER_JOBS: 'delivery.retrySweep' }, demo).problems).toEqual([{ key: 'VITE_SERVER_JOBS', code: 'NOT_IN_DEMO_BUILD' }]);
    expect(parseRuntimeConfig({ VITE_API_BASE_URL: 'https://ps.example', VITE_AUTH_MODE: 'sso', VITE_SERVER_JOBS: 'delivery.retrySweep, release.dueSweep' }, { demoBuild: false }).problems).toEqual([]);
  });
  it('a server build must have an API server and sign in through the identity provider only', () => {
    expect(parseRuntimeConfig({}, server).problems).toEqual([{ key: 'VITE_API_BASE_URL', code: 'API_SERVER_REQUIRED' }]);
    expect(parseRuntimeConfig({ VITE_API_BASE_URL: 'https://ps.example' }, { demoBuild: false }).problems).toEqual([{ key: 'VITE_AUTH_MODE', code: 'SSO_REQUIRED' }]);
    expect(parseRuntimeConfig({ VITE_API_BASE_URL: 'https://ps.example', VITE_AUTH_MODE: 'password' }, server).problems).toEqual([{ key: 'VITE_AUTH_MODE', code: 'SSO_REQUIRED' }]);
    expect(parseRuntimeConfig({ VITE_AUTH_MODE: 'sso' }, { demoBuild: false, buildApiBaseUrl: 'https://built-in.example' }).problems).toEqual([]);
  });
  it('no setting is named like a secret: config.json goes to every browser', () => {
    for (const k of Object.keys(RUNTIME_SETTINGS)) expect(k.split('_').some(s => ['KEY', 'SECRET', 'PASSWORD', 'PASS', 'TOKEN'].includes(s)), k).toBe(false);
  });
});

const respond = (status: number, body: string, type = 'application/json') => async () =>
  ({ ok: status >= 200 && status < 300, status, headers: { get: (n: string) => (n.toLowerCase() === 'content-type' ? type : null) }, text: async () => body });

describe('reading config.json at start-up', () => {
  it('no file (404), or the host answering with the app page: the build\'s own values, as before', async () => {
    expect(await loadRuntimeConfig(respond(404, 'Not found', 'text/html'), '/config.json', demo)).toEqual({ source: 'none', values: {}, problems: [] });
    expect(await loadRuntimeConfig(respond(200, '<!doctype html>', 'text/html'), '/config.json', demo)).toEqual({ source: 'none', values: {}, problems: [] });
  });
  it('a server build with no file and no built-in address stops with API_SERVER_REQUIRED', async () => {
    expect((await loadRuntimeConfig(respond(404, ''), '/config.json', server)).problems).toEqual([{ key: 'VITE_API_BASE_URL', code: 'API_SERVER_REQUIRED' }]);
  });
  it('a file served with another type is still read, so it is never skipped silently', async () => {
    const r = await loadRuntimeConfig(respond(200, JSON.stringify({ VITE_API_BASE_URL: 'https://ps.example' }), 'text/plain'), '/config.json', server);
    expect(r.source).toBe('config.json');
    expect((await loadRuntimeConfig(respond(500, 'oops', 'text/plain'), '/config.json', server)).problems).toEqual([{ code: 'UNREADABLE' }]);
  });
  it('a file that is not JSON stops with UNREADABLE; a good one is used', async () => {
    expect((await loadRuntimeConfig(respond(200, '{ nope'), '/config.json', server)).problems).toEqual([{ code: 'UNREADABLE' }]);
    const ok = await loadRuntimeConfig(respond(200, JSON.stringify({ VITE_API_BASE_URL: 'https://ps.example' })), '/config.json', server);
    expect(ok).toMatchObject({ source: 'config.json', values: { VITE_API_BASE_URL: 'https://ps.example' }, problems: [] });
  });
  it('is never read from a cache', async () => {
    let init: unknown;
    await loadRuntimeConfig(async (_u, i) => { init = i; return (await respond(404, '')()); }, '/config.json', demo);
    expect(init).toMatchObject({ cache: 'no-store' });
  });
});

describe('appEnv', () => {
  it('config.json wins over the build\'s value; without it the build\'s value is used', () => {
    setRuntimeSettings({});
    expect(appEnv().VITE_AI_PROXY_URL).toBe(import.meta.env.VITE_AI_PROXY_URL);
    setRuntimeSettings({ VITE_AI_PROXY_URL: '/site/ai' });
    expect(appEnv().VITE_AI_PROXY_URL).toBe('/site/ai');
    expect(Object.isFrozen(runtimeSettingsFromConfig())).toBe(true);
    setRuntimeSettings({});
  });
});

// Batch 557 (readiness review §9 items 1 and 7): the API server's /api/config.
describe('reading the API server\'s /api/config at start-up', () => {
  type Reply = { status: number; body: string; type?: string } | 'throw';
  const routes = (byUrl: Record<string, Reply>) => {
    const calls: { url: string; init: unknown }[] = [];
    const fn = async (url: string, init?: unknown) => {
      calls.push({ url, init });
      const r = byUrl[url] ?? { status: 404, body: '' };
      if (r === 'throw') throw new Error('offline');
      return respond(r.status, r.body, r.type)();
    };
    return { fn, calls };
  };
  const cfg = (o: Record<string, unknown>) => ({ status: 200, body: JSON.stringify(o) });

  it('adds the server\'s allowed settings under config.json\'s own values, and its hosting regions', async () => {
    const { fn, calls } = routes({
      '/config.json': cfg({ VITE_API_BASE_URL: 'https://ps.example/', VITE_AI_MODEL: 'site-model' }),
      'https://ps.example/api/config': cfg({ settings: { VITE_AI_MODEL: 'server-model', VITE_AI_HOSTING_REGION: 'UK South', VITE_VOICE_ENABLED: false }, hosting: { databaseRegion: ' UK South ', blobRegion: 'UK South' } }),
    });
    const r = await loadRuntimeConfig(fn as never, '/config.json', server);
    expect(r.problems).toEqual([]);
    expect(r.server).toBe('read');
    expect(r.values).toEqual({ VITE_API_BASE_URL: 'https://ps.example/', VITE_AI_MODEL: 'site-model', VITE_AI_HOSTING_REGION: 'UK South', VITE_VOICE_ENABLED: 'false' });
    expect(r.hosting).toEqual({ databaseRegion: 'UK South', blobRegion: 'UK South' });
    expect(calls[1].init).toMatchObject({ cache: 'no-store', credentials: 'omit' });
  });

  it('the server may not set an address (the security policy is made from config.json\'s), and its problems say where they are', async () => {
    const { fn } = routes({
      '/config.json': cfg({ VITE_API_BASE_URL: 'https://ps.example' }),
      'https://ps.example/api/config': cfg({ settings: { VITE_LIVE_UPDATES_HUB_URL: 'https://hub.example', VITE_NOPE: 'x' } }),
    });
    const r = await loadRuntimeConfig(fn as never, '/config.json', server);
    expect(r.problems).toEqual([{ key: 'VITE_NOPE', code: 'UNKNOWN_SETTING', from: 'server' }, { key: 'VITE_LIVE_UPDATES_HUB_URL', code: 'ADDRESS_NOT_FROM_SERVER', from: 'server' }]);
    expect(parseServerSettings({ VITE_API_BASE_URL: 'https://other.example' }, server).problems).toEqual([{ key: 'VITE_API_BASE_URL', code: 'ADDRESS_NOT_FROM_SERVER', from: 'server' }]);
  });

  it('a server with no /api/config yet, or not answering, leaves config.json alone; an unreadable one stops the app', async () => {
    const base = { '/config.json': cfg({ VITE_API_BASE_URL: 'https://ps.example' }) };
    expect((await loadRuntimeConfig(routes(base).fn as never, '/config.json', server))).toMatchObject({ server: 'none', problems: [] });
    expect((await loadRuntimeConfig(routes({ ...base, 'https://ps.example/api/config': 'throw' }).fn as never, '/config.json', server))).toMatchObject({ server: 'unavailable', problems: [] });
    expect((await loadRuntimeConfig(routes({ ...base, 'https://ps.example/api/config': { status: 503, body: '' } }).fn as never, '/config.json', server))).toMatchObject({ server: 'unavailable', problems: [] });
    expect((await loadRuntimeConfig(routes({ ...base, 'https://ps.example/api/config': { status: 200, body: '{ nope' } }).fn as never, '/config.json', server)).problems).toEqual([{ code: 'UNREADABLE', from: 'server' }]);
  });

  it('sign-in, the instance role, which jobs the server runs and the AI provider stay with the site', async () => {
    const { fn } = routes({
      '/config.json': cfg({ VITE_API_BASE_URL: 'https://ps.example' }),
      'https://ps.example/api/config': cfg({ settings: { VITE_AUTH_MODE: 'sso', VITE_APP_ENV: 'production', VITE_SERVER_JOBS: 'delivery.retrySweep', VITE_AUTH_MICROSOFT_LINK_BY_EMAIL: 'true', VITE_AI_PROVIDER: 'mock' } }),
    });
    const r = await loadRuntimeConfig(fn as never, '/config.json', { demoBuild: false });
    expect(r.problems.filter(p => p.code === 'NOT_FROM_SERVER').map(p => p.key).sort()).toEqual(['VITE_AI_PROVIDER', 'VITE_APP_ENV', 'VITE_AUTH_MICROSOFT_LINK_BY_EMAIL', 'VITE_AUTH_MODE', 'VITE_SERVER_JOBS']);
    expect(r.values.VITE_AUTH_MODE).toBeUndefined();
    expect(r.problems).toContainEqual({ key: 'VITE_AUTH_MODE', code: 'SSO_REQUIRED' }); // the build rules see the site's own settings
  });

  it('a reply that stalls after its headers is given up after the time limit', async () => {
    vi.useFakeTimers();
    try {
      const fn = async (url: string, init?: { signal?: AbortSignal }) => {
        if (url === '/config.json') return respond(200, JSON.stringify({ VITE_API_BASE_URL: 'https://ps.example' }))();
        return { ok: true, status: 200, headers: { get: () => 'application/json' },
          text: () => new Promise<string>((_r, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))) };
      };
      const pending = loadRuntimeConfig(fn as never, '/config.json', server);
      await vi.advanceTimersByTimeAsync(5_001);
      expect(await pending).toMatchObject({ server: 'unavailable', problems: [] });
    } finally {
      vi.useRealTimers();
    }
  });

  it('a build address that isn\'t https is never asked', async () => {
    const calls = routes({});
    await loadRuntimeConfig(calls.fn as never, '/config.json', { ...server, buildApiBaseUrl: 'http://ps.example' });
    expect(calls.calls.map(c => c.url)).toEqual(['/config.json']);
  });

  it('a demo build never asks a server; a server build with no config.json uses the build\'s address', async () => {
    const demoCalls = routes({});
    await loadRuntimeConfig(demoCalls.fn as never, '/config.json', { demoBuild: true, buildApiBaseUrl: 'https://ps.example' });
    expect(demoCalls.calls.map(c => c.url)).toEqual(['/config.json']);
    const built = routes({ 'https://built.example/api/config': cfg({ hosting: { databaseRegion: 'East US' } }) });
    expect((await loadRuntimeConfig(built.fn as never, '/config.json', { ...server, buildApiBaseUrl: 'https://built.example' })).hosting).toEqual({ databaseRegion: 'East US' });
  });

  it('hosting: short text only; the rows administrators see', () => {
    expect(parseServerHosting({ databaseRegion: 'x'.repeat(101), blobRegion: 3 })).toEqual({});
    expect(parseServerHosting(null)).toEqual({});
    expect(hostingRegionRows({ databaseRegion: 'UK South' }, ' eu-west-2 ')).toEqual([
      { kind: 'database', region: 'UK South' }, { kind: 'files' }, { kind: 'ai', region: 'eu-west-2' },
    ]);
    setServerHosting({ blobRegion: 'UK West' });
    expect(serverHosting()).toEqual({ blobRegion: 'UK West' });
    setServerHosting(undefined);
    expect(serverHosting()).toEqual({});
  });
});
