// src/services/interfaceMonitoring/interfaceMonitoring.test.ts (Batch 554)
import { describe, it, expect, vi } from 'vitest';
import { channelProblem, engineCounts, engineLineIsProblem, engineLineParts, engineViews, interfaceEngineStatus, isEnginesResponse, normaliseEnginesResponse, type InterfaceEngineSummary } from './interfaceMonitoringContract';
import { createHttpInterfaceMonitoringApi, createInterfaceMonitoringService, interfaceMonitoringError } from './interfaceMonitoringService';
import type { EngineChannelStatus, EngineHeartbeat } from '../interfaceEngine/engineEdgeContract';

const serverTime = '2026-10-14T12:00:00.000Z';
const ch = (o: Partial<EngineChannelStatus> & { channelId: string }): EngineChannelStatus => ({ direction: 'inbound', state: 'started', queued: 0, deadLetters: 0, ...o });
const hb = (channels: EngineChannelStatus[], o: Partial<EngineHeartbeat> = {}): EngineHeartbeat => ({
  v: 1, engineInstanceId: 'e', hosting: 'cloud', imageVersion: '4.5.2', apiReachable: true, diskFreePercent: 60, channels, ...o,
});
const engine = (id: string, channels: EngineChannelStatus[], receivedAt = '2026-10-14T11:59:30.000Z', o: Partial<InterfaceEngineSummary> = {}, h: Partial<EngineHeartbeat> = {}): InterfaceEngineSummary => ({
  engineInstanceId: id, hosting: 'cloud', lastHeartbeat: { heartbeat: hb(channels, h), receivedAt }, ...o,
});

describe('interface monitoring rules', () => {
  it('names what is wrong with a channel, most serious first', () => {
    expect(channelProblem(ch({ channelId: 'a', state: 'error', deadLetters: 3 }))).toBe('error');
    expect(channelProblem(ch({ channelId: 'a', state: 'stopped' }))).toBe('stopped');
    expect(channelProblem(ch({ channelId: 'a', state: 'paused' }))).toBe('paused');
    expect(channelProblem(ch({ channelId: 'a', oldestQueuedAgeSeconds: 16 * 60 }))).toBe('backlog');
    expect(channelProblem(ch({ channelId: 'a', oldestQueuedAgeSeconds: 14 * 60 }))).toBeNull();
    expect(channelProblem(ch({ channelId: 'a', deadLetters: 1 }))).toBe('deadLetters');
    expect(channelProblem(ch({ channelId: 'a' }))).toBeNull();
  });

  it("status comes from the server when it gives one, else from the heartbeat by the server's clock", () => {
    expect(interfaceEngineStatus(engine('e', []), serverTime)).toBe('online');
    expect(interfaceEngineStatus(engine('e', [], '2026-10-14T11:56:00.000Z'), serverTime)).toBe('offline'); // 240 s
    expect(interfaceEngineStatus(engine('e', [], '2026-10-14T11:56:00.000Z', { status: 'online' }), serverTime)).toBe('online');
    expect(interfaceEngineStatus({ engineInstanceId: 'x', hosting: 'onsite' }, serverTime)).toBe('offline');
    expect(interfaceEngineStatus(engine('e', [], undefined, { status: 'bogus' as never }), serverTime)).toBe('online');
    expect(interfaceEngineStatus(engine('e', [], undefined, { status: 'constructor' as never }), serverTime)).toBe('online'); // not a status
    expect(interfaceEngineStatus(engine('e', []), 'not a time')).toBe('offline'); // a time that can't be read is never "recent"
    expect(interfaceEngineStatus(engine('e', [ch({ channelId: 'ADT_IN', state: 'stopped' })]), serverTime)).toBe('degraded'); // a listener down
  });

  it('shows the worst engines first, problem channels first, with totals and listeners down', () => {
    const views = engineViews({ serverTime, engines: [
      engine('ok', [ch({ channelId: 'ADT_IN', queued: 2 })], undefined, { displayName: 'Alpha General' }),
      engine('bad', [
        ch({ channelId: 'ORU_OUT', direction: 'outbound', queued: 5, deadLetters: 2 }),
        ch({ channelId: 'ORM_IN', state: 'stopped' }),
        ch({ channelId: 'ADT_IN', queued: 7 }),
      ], undefined, { displayName: 'Zeta Hospital' }, { apiReachable: false }),
    ] });
    expect(views.map(v => [v.engine.engineInstanceId, v.status])).toEqual([['bad', 'degraded'], ['ok', 'online']]);
    expect(views[0].channels.map(c => c.channelId)).toEqual(['ORM_IN', 'ORU_OUT', 'ADT_IN']);
    expect([views[0].queued, views[0].deadLetters, views[0].listenersDown]).toEqual([12, 2, 1]);
    expect(engineCounts(views)).toEqual({ online: 1, attention: 0, degraded: 1, offline: 0, queued: 14, deadLetters: 2, listenersDown: 1 });
  });

  it('the line leaves out zero counts, worst first, and is a problem when anything is offline, degraded or a listener is down', () => {
    const c = { online: 2, attention: 0, degraded: 0, offline: 1, queued: 5, deadLetters: 0, listenersDown: 1 };
    expect(engineLineParts(c)).toEqual([{ key: 'offline', count: 1 }, { key: 'listenersDown', count: 1 }, { key: 'online', count: 2 }, { key: 'queued', count: 5 }]);
    expect(engineLineIsProblem(c)).toBe(true);
    expect(engineLineIsProblem({ ...c, offline: 0, listenersDown: 0 })).toBe(false);
  });

  it('one bad row from the server never stops the rest from showing', () => {
    const res = normaliseEnginesResponse({ serverTime, engines: [
      null, { hosting: 'cloud' }, // no id
      { engineInstanceId: 'e1', hosting: 'weird', lastHeartbeat: { receivedAt: '2026-10-14T11:59:30.000Z', heartbeat: { v: 1, engineInstanceId: 'e1', imageVersion: '1', apiReachable: true, diskFreePercent: 'x', channels: [
        { channelId: 'A', direction: 'sideways', state: 'melting', queued: -3, deadLetters: 'many' }, { direction: 'inbound' }, null,
      ] } } },
      { engineInstanceId: 'e2', hosting: 'onsite', lastHeartbeat: { receivedAt: 'x', heartbeat: { v: 1 } } },
    ] as never });
    expect(res.engines.map(e => [e.engineInstanceId, e.hosting])).toEqual([['e1', 'cloud'], ['e2', 'onsite']]);
    expect(res.engines[0].lastHeartbeat?.heartbeat.channels).toEqual([{ channelId: 'A', direction: 'inbound', state: 'error', queued: 0, deadLetters: 0 }]);
    expect(res.engines[0].lastHeartbeat?.heartbeat.diskFreePercent).toBe(0);
    expect(res.engines[1].lastHeartbeat?.heartbeat.channels).toEqual([]);
    expect(() => engineViews(res)).not.toThrow();
    expect(engineViews(res).map(v => v.status)).toEqual(['offline', 'degraded']);
  });

  it('accepts only a response of this shape', () => {
    expect(isEnginesResponse({ serverTime, engines: [] })).toBe(true);
    expect(isEnginesResponse({ engines: [] })).toBe(false);
    expect(isEnginesResponse(null)).toBe(false);
  });
});

describe('interface monitoring service', () => {
  const api = { engines: vi.fn(async () => ({ ok: true as const, data: { serverTime, engines: [] } })) };
  it('needs interface:engine-status:view, checked before the server is asked', async () => {
    const enforce = vi.fn(async (c: string) => ({ allowed: c === 'interface:engine-status:view' }) as never);
    const s = createInterfaceMonitoringService({ api, authorization: { enforce } });
    expect((await s.engines()).ok).toBe(true);
    expect(enforce).toHaveBeenCalledWith('interface:engine-status:view');
    api.engines.mockResolvedValueOnce({ ok: true, data: { serverTime, engines: [null, { engineInstanceId: 'e1', hosting: 'cloud' }] as never } });
    const cleaned = await s.engines();
    expect(cleaned.ok && cleaned.data.engines.map(e => e.engineInstanceId)).toEqual(['e1']); // normalised
    const refused = createInterfaceMonitoringService({ api, authorization: { enforce: vi.fn(async () => ({ allowed: false }) as never) } });
    api.engines.mockClear();
    expect(await refused.engines()).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(api.engines).not.toHaveBeenCalled();
  });
  it('in the demo there is no engine', async () => {
    const s = createInterfaceMonitoringService({ api: null, authorization: { enforce: vi.fn() } });
    expect(s.viaServer).toBe(false);
    expect(await s.engines()).toEqual({ ok: false, error: 'UNAVAILABLE' });
  });
  it('the HTTP client: path, token, errors, and a malformed answer', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ serverTime, engines: [] }), { status: 200 }));
    const h = createHttpInterfaceMonitoringApi({ baseUrl: 'https://api.example/', fetch: fetchFn as never, accessToken: async () => 't' });
    expect((await h.engines()).ok).toBe(true);
    const [url, init] = (fetchFn.mock.calls[0] as unknown) as [string, RequestInit];
    expect(url).toBe('https://api.example/api/interface/engines');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer t');
    fetchFn.mockResolvedValueOnce(new Response('{"nope":1}', { status: 200 }));
    expect(await h.engines()).toEqual({ ok: false, error: 'UNAVAILABLE' });
    fetchFn.mockRejectedValueOnce(new Error('offline'));
    expect(await h.engines()).toEqual({ ok: false, error: 'UNAVAILABLE' });
    expect((init.signal as AbortSignal | undefined)).toBeTruthy(); // a hung server is given up on
    const hung = createHttpInterfaceMonitoringApi({ baseUrl: 'https://api.example', accessToken: async () => '', timeoutMs: 5,
      fetch: ((_u: string, i: RequestInit) => new Promise((_r, reject) => i.signal?.addEventListener('abort', () => reject(new Error('aborted'))))) as never });
    expect(await hung.engines()).toEqual({ ok: false, error: 'UNAVAILABLE' });
    expect([401, 403, 500].map(interfaceMonitoringError)).toEqual(['SIGNED_OUT', 'NOT_PERMITTED', 'UNAVAILABLE']);
  });
});
