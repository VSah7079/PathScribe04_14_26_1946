// src/services/liveUpdates/dataTopics.test.ts (Batch 559)
// Data topics: the contract, the rules, and the SignalR client's SetDataTopics and DataChanged.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { combineDataScopes, dataEventMatches, dataPollIntervalMs, dataScopeKey, DATA_KEYS_PER_TOPIC_MAX, DATA_TOPICS, KEYED_DATA_TOPICS, type DataChangedEvent } from './dataTopics';
import { HUB_DATA_CHANGED, HUB_SET_DATA_TOPICS, HUB_SET_INTRAOP_SCOPE, parseDataChangedEvent } from './liveUpdateContract';
import { createSignalRLiveUpdateService, CLOSE_GRACE_MS, type HubConnectionLike } from './signalRLiveUpdateService';
import { createLocalLiveUpdateService } from './localLiveUpdateService';

const ev = (over: Partial<DataChangedEvent> = {}): DataChangedEvent => ({
  type: 'DataChanged', v: 1, eventId: 'd1', topic: 'facilityOps', key: 'FAC-1', occurredAt: '2026-10-14T15:00:00Z', ...over,
});

describe('DataChanged contract (Batch 559)', () => {
  it('accepts a well-formed event and rejects anything else', () => {
    expect(parseDataChangedEvent(ev())).toEqual(ev());
    expect(parseDataChangedEvent({ ...ev(), topic: 'patients' })).toBeNull();
    expect(parseDataChangedEvent({ ...ev(), v: 2 })).toBeNull();
    expect(parseDataChangedEvent({ ...ev(), eventId: '' })).toBeNull();
    expect(parseDataChangedEvent({ ...ev(), occurredAt: 'yesterday' })).toBeNull();
    expect(parseDataChangedEvent({ ...ev(), type: 'IntraopChanged' })).toBeNull();
    expect(parseDataChangedEvent(null)).toBeNull();
  });

  it('a keyed topic must name its key; an unkeyed topic drops one; unknown fields (e.g. PHI) never pass', () => {
    const { key: _k, ...noKey } = ev();
    void _k;
    expect(parseDataChangedEvent(noKey)).toBeNull();
    expect(parseDataChangedEvent({ ...ev(), key: '   ' })).toBeNull();
    expect(parseDataChangedEvent({ ...ev(), key: 'x'.repeat(201) })).toBeNull();
    expect(parseDataChangedEvent({ ...ev(), topic: 'messages', key: 'u1' })).toEqual({ type: 'DataChanged', v: 1, eventId: 'd1', topic: 'messages', occurredAt: ev().occurredAt });
    expect(parseDataChangedEvent({ ...ev(), patientName: 'Jane Roe' })).not.toHaveProperty('patientName');
  });
});

describe('data topic rules (Batch 559)', () => {
  it('names the screens that poll today, and which take a key', () => {
    expect(DATA_TOPICS).toEqual(['registryExceptions', 'messages', 'facilityOps', 'heldReleases', 'engravers', 'siteAgents', 'interfaceEngines', 'molecularQueue', 'caseReport']);
    // Held reports are not keyed: a case id can be an accession number, and hub messages never carry one.
    expect(KEYED_DATA_TOPICS).toEqual(['facilityOps', 'siteAgents', 'caseReport']);
  });

  it('combines subscriptions: each topic once, keys merged and sorted, a keyed topic with no keys left out', () => {
    const scope = combineDataScopes([
      { topic: 'siteAgents', keys: ['F2', ' F1 '] }, { topic: 'messages' }, { topic: 'siteAgents', keys: ['F1', '', 'x'.repeat(201)] }, { topic: 'heldReleases', keys: ['S26-1'] },
      { topic: 'facilityOps', keys: [] }, { topic: 'messages', keys: ['ignored'] }, { topic: 'nonsense' as never },
    ]);
    expect(scope).toEqual({ topics: [{ topic: 'messages', keys: [] }, { topic: 'heldReleases', keys: [] }, { topic: 'siteAgents', keys: ['F1', 'F2'] }] });
    // Keys holding separators never make two scopes look the same.
    expect(dataScopeKey(combineDataScopes([{ topic: 'siteAgents', keys: ['a,b'] }]))).not.toBe(dataScopeKey(combineDataScopes([{ topic: 'siteAgents', keys: ['a', 'b'] }])));
    const many = Array.from({ length: 150 }, (_, i) => `F${String(i).padStart(3, '0')}`);
    expect(combineDataScopes([{ topic: 'facilityOps', keys: many }]).topics[0].keys).toHaveLength(DATA_KEYS_PER_TOPIC_MAX);
    expect(dataScopeKey(combineDataScopes([]))).toBe('');
  });

  it('matches an event to the subscriptions that asked for it', () => {
    expect(dataEventMatches(ev(), { topic: 'facilityOps', keys: ['FAC-1'] })).toBe(true);
    expect(dataEventMatches(ev(), { topic: 'facilityOps', keys: ['FAC-2'] })).toBe(false);
    expect(dataEventMatches(ev(), { topic: 'siteAgents', keys: ['FAC-1'] })).toBe(false);
    expect(dataEventMatches(ev({ topic: 'messages', key: undefined }), { topic: 'messages' })).toBe(true);
  });

  it('polls as the screen always did without a live connection, and only as a safety net while live', () => {
    expect(dataPollIntervalMs(false, 20_000, 60_000)).toBe(20_000);
    expect(dataPollIntervalMs(true, 20_000, 60_000)).toBe(60_000);
    expect(dataPollIntervalMs(true, 120_000, 60_000)).toBe(120_000);
  });
});

function fakeHub() {
  const handlers: Record<string, (...a: unknown[]) => void> = {};
  const cb = { reconnecting: [] as (() => void)[], reconnected: [] as (() => void)[], close: [] as (() => void)[] };
  const conn = {
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    on: vi.fn((m: string, h: (...a: unknown[]) => void) => { handlers[m] = h; }),
    invoke: vi.fn(async (m: string, scope: { topics?: unknown[] }) => (m === HUB_SET_DATA_TOPICS ? { accepted: scope.topics, rejected: [] } : { acceptedLocationIds: [], rejectedLocationIds: [], all: false })),
    onreconnecting: (f: () => void) => { cb.reconnecting.push(f); },
    onreconnected: (f: () => void) => { cb.reconnected.push(f); },
    onclose: (f: () => void) => { cb.close.push(f); },
    emit: (m: string, ...a: unknown[]) => handlers[m]?.(...a),
    dropAndReconnect: async () => { cb.reconnecting.forEach(f => f()); cb.reconnected.forEach(f => f()); await flush(); },
  };
  return conn;
}
const flush = () => new Promise(r => setTimeout(r, 0));
const dataCalls = (hub: ReturnType<typeof fakeHub>) => hub.invoke.mock.calls.filter(c => c[0] === HUB_SET_DATA_TOPICS).map(c => c[1]);
const lastData = (hub: ReturnType<typeof fakeHub>) => { const all = dataCalls(hub); return all[all.length - 1]; };

describe('SignalR: data topics (Batch 559)', () => {
  let hub: ReturnType<typeof fakeHub>;
  let timers: { fn: () => void; ms: number }[];
  const make = () => createSignalRLiveUpdateService({
    hubUrl: 'https://api.example/hubs/live', buildConnection: () => hub as unknown as HubConnectionLike,
    setTimer: (fn, ms) => { const t = { fn, ms }; timers.push(t); return t; }, clearTimer: t => { timers = timers.filter(x => x !== t); },
    random: () => 0.5, log: () => {},
  });
  beforeEach(() => { hub = fakeHub(); timers = []; });

  it('connects, sends the combined topics (never an intraop scope it has none of), and delivers matching events once', async () => {
    const svc = make();
    const ops = vi.fn(); const held = vi.fn();
    svc.subscribeData({ topic: 'facilityOps', keys: ['FAC-1'] }, ops);
    svc.subscribeData({ topic: 'heldReleases' }, held);
    await flush();
    expect(hub.start).toHaveBeenCalledTimes(1);
    expect(hub.invoke.mock.calls.some(c => c[0] === HUB_SET_INTRAOP_SCOPE)).toBe(false);
    expect(lastData(hub)).toEqual({ topics: [{ topic: 'facilityOps', keys: ['FAC-1'] }, { topic: 'heldReleases', keys: [] }] });
    hub.emit(HUB_DATA_CHANGED, ev());
    hub.emit(HUB_DATA_CHANGED, ev());                               // redelivered
    hub.emit(HUB_DATA_CHANGED, ev({ eventId: 'd2', key: 'FAC-2' })); // another facility
    hub.emit(HUB_DATA_CHANGED, { ...ev({ eventId: 'd3' }), topic: 'bogus' });
    expect(ops).toHaveBeenCalledTimes(1);
    expect(held).not.toHaveBeenCalled();
  });

  it('sends the topics again after a reconnection, and a smaller set when a screen leaves', async () => {
    const svc = make();
    const a = svc.subscribeData({ topic: 'messages' }, vi.fn());
    svc.subscribeData({ topic: 'registryExceptions' }, vi.fn());
    await flush();
    const before = dataCalls(hub).length;
    await hub.dropAndReconnect();
    expect(dataCalls(hub).length).toBe(before + 1);
    a.unsubscribe();
    await flush();
    expect(lastData(hub)).toEqual({ topics: [{ topic: 'registryExceptions', keys: [] }] });
  });

  it('clears the topics when the last data screen leaves but another screen keeps the connection, and closes when all leave', async () => {
    const svc = make();
    const exports = svc.subscribeExports(vi.fn());
    const d = svc.subscribeData({ topic: 'messages' }, vi.fn());
    await flush();
    d.unsubscribe();
    await flush();
    expect(lastData(hub)).toEqual({ topics: [] });
    exports.unsubscribe();
    timers.find(t => t.ms === CLOSE_GRACE_MS)!.fn();
    expect(hub.stop).toHaveBeenCalled();
  });

  it('the local transport (no API server) never sends DataChanged: screens keep polling', () => {
    const local = createLocalLiveUpdateService({ channelFactory: () => null });
    const sub = local.subscribeData({ topic: 'messages' }, vi.fn());
    expect(local.getState()).toBe('local');
    expect(() => sub.unsubscribe()).not.toThrow();
  });

  it('retries a failed SetDataTopics on the back-off schedule', async () => {
    const svc = make();
    hub.invoke.mockImplementationOnce(async () => { throw new Error('hub busy'); });
    svc.subscribeData({ topic: 'messages' }, vi.fn());
    await flush();
    expect(dataCalls(hub)).toHaveLength(1);
    const retry = timers.find(t => t.ms !== CLOSE_GRACE_MS)!;
    retry.fn();
    await flush();
    expect(dataCalls(hub)).toHaveLength(2);
    expect(lastData(hub)).toEqual({ topics: [{ topic: 'messages', keys: [] }] });
  });

  it('sends one scope at a time, then the latest when a screen changed it meanwhile', async () => {
    const svc = make();
    let release!: () => void;
    hub.invoke.mockImplementationOnce(async (_m: string, scope: { topics?: unknown[] }) => { await new Promise<void>(r => { release = r; }); return { accepted: scope.topics, rejected: [] }; });
    svc.subscribeData({ topic: 'messages' }, vi.fn());
    await flush();
    svc.subscribeData({ topic: 'interfaceEngines' }, vi.fn());
    await flush();
    expect(dataCalls(hub)).toHaveLength(1); // the second waits for the first
    release();
    await flush(); await flush();
    expect(dataCalls(hub)).toHaveLength(2);
    expect(lastData(hub)).toEqual({ topics: [{ topic: 'messages', keys: [] }, { topic: 'interfaceEngines', keys: [] }] });
  });

  it('leaves its topics when the last data screen goes, even if the connection then closes', async () => {
    const svc = make();
    const d = svc.subscribeData({ topic: 'messages' }, vi.fn());
    await flush();
    d.unsubscribe();
    await flush();
    expect(lastData(hub)).toEqual({ topics: [] });
    timers.find(t => t.ms === CLOSE_GRACE_MS)!.fn();
    expect(hub.stop).toHaveBeenCalled();
  });
});

describe('Batch 560: when a live screen counts as out of date', () => {
  it('allows two of its current read intervals', async () => {
    const { dataStaleAfterMs } = await import('./dataTopics');
    expect(dataStaleAfterMs(false, 20_000, 60_000)).toBe(40_000);
    expect(dataStaleAfterMs(true, 20_000, 60_000)).toBe(120_000);
  });
});

describe('Batch 560: whether the hub took a topic, and when to read', () => {
  it('a topic is taken only when the answer accepts it with every key asked for', async () => {
    const { dataSubscriptionAccepted } = await import('./dataTopics');
    const answer = { accepted: [{ topic: 'facilityOps', keys: ['F1'] }, { topic: 'messages', keys: [] }], rejected: [{ topic: 'engravers', keys: [] }] };
    expect(dataSubscriptionAccepted(answer, { topic: 'messages' })).toBe(true);
    expect(dataSubscriptionAccepted(answer, { topic: 'facilityOps', keys: ['F1'] })).toBe(true);
    expect(dataSubscriptionAccepted(answer, { topic: 'facilityOps', keys: ['F1', 'F2'] })).toBe(false);
    expect(dataSubscriptionAccepted(answer, { topic: 'engravers' })).toBe(false);
    expect(dataSubscriptionAccepted(null, { topic: 'messages' })).toBe(false);
    expect(dataSubscriptionAccepted({ ok: true }, { topic: 'messages' })).toBe(false);
  });

  it('an event-driven read waits at least the coalescing, keeps a second between reads, plus up to a second at random', async () => {
    const { dataReadDelayMs } = await import('./dataTopics');
    expect(dataReadDelayMs(10_000, 100, () => 0)).toBe(100);
    expect(dataReadDelayMs(300, 100, () => 0)).toBe(700);
    expect(dataReadDelayMs(10_000, 100, () => 1)).toBe(1_100);
  });

  it('SignalR tells each subscriber whether its topic was taken, and false after a drop', async () => {
    const hub = fakeHub();
    hub.invoke.mockImplementation((async () => ({ accepted: [{ topic: 'messages', keys: [] }], rejected: [{ topic: 'engravers', keys: [] }] })) as never);
    const svc = createSignalRLiveUpdateService({ hubUrl: 'https://api.example/hubs/live', buildConnection: () => hub as unknown as HubConnectionLike, setTimer: () => 0, clearTimer: () => {}, random: () => 0.5, log: () => {} });
    const msgs = vi.fn(); const eng = vi.fn();
    svc.subscribeData({ topic: 'messages' }, vi.fn(), msgs);
    svc.subscribeData({ topic: 'engravers' }, vi.fn(), eng);
    await flush(); await flush();
    expect(msgs).toHaveBeenLastCalledWith(true);
    expect(eng).toHaveBeenLastCalledWith(false);
    hub.dropAndReconnect();
    expect(msgs).toHaveBeenCalledWith(false);
  });
});
