// @vitest-environment happy-dom
// src/hooks/useLiveData.test.tsx (Batch 560)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLiveData } from './useLiveData';
import type { ILiveUpdateService } from '@/services/liveUpdates/ILiveUpdateService';
import type { LiveConnectionState } from '@/services/liveUpdates/liveUpdatePolicy';
import type { DataChangedEvent, DataTopicSubscription } from '@/services/liveUpdates/dataTopics';

function fakeService(initial: LiveConnectionState = 'live', accept = true) {
  let state = initial;
  const stateListeners = new Set<(s: LiveConnectionState) => void>();
  const resyncListeners = new Set<() => void>();
  const subs: { sub: DataTopicSubscription; onEvent: (e: DataChangedEvent) => void; live: boolean }[] = [];
  const svc = {
    transport: 'signalr',
    subscribeData: vi.fn((sub: DataTopicSubscription, onEvent: (e: DataChangedEvent) => void, onAccepted?: (a: boolean) => void) => {
      const s = { sub, onEvent, live: true };
      subs.push(s);
      queueMicrotask(() => onAccepted?.(accept));
      return { unsubscribe: () => { s.live = false; } };
    }),
    getState: () => state,
    onStateChange: (l: (s: LiveConnectionState) => void) => { stateListeners.add(l); return () => { stateListeners.delete(l); }; },
    onResync: (l: () => void) => { resyncListeners.add(l); return () => { resyncListeners.delete(l); }; },
  } as unknown as ILiveUpdateService;
  return {
    svc, subs,
    emit: (e: Partial<DataChangedEvent>) => subs.filter(s => s.live).forEach(s => s.onEvent({ type: 'DataChanged', v: 1, eventId: 'e', topic: s.sub.topic, occurredAt: '', ...e })),
    setState: (s: LiveConnectionState) => { state = s; stateListeners.forEach(l => l(s)); },
    resync: () => resyncListeners.forEach(l => l()),
  };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });
const tick = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const signedIn = async () => true;
/** An event-driven read waits for the coalescing, the one-second gap and up to a second at random. */
const EVENT_WAIT = 2_200;

describe('useLiveData (Batch 560)', () => {
  it('subscribes to its topic and key, and re-reads once for a burst of events', async () => {
    const f = fakeService();
    const refresh = vi.fn();
    renderHook(() => useLiveData(refresh, { topic: 'facilityOps', dataKey: 'FAC-1', pollMs: 20_000, service: f.svc, signedIn }));
    await tick(0);
    expect(f.svc.subscribeData).toHaveBeenCalledWith({ topic: 'facilityOps', keys: ['FAC-1'] }, expect.any(Function), expect.any(Function));
    f.emit({ key: 'FAC-1' }); f.emit({ key: 'FAC-1' }); f.emit({ key: 'FAC-1' });
    await tick(EVENT_WAIT);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('re-reads after a reconnection (events may have been missed), but not for the first connection', async () => {
    const f = fakeService();
    const refresh = vi.fn();
    renderHook(() => useLiveData(refresh, { topic: 'messages', pollMs: 20_000, service: f.svc, signedIn }));
    await tick(0);
    f.resync();                       // the first connection: the screen's own first read covers it
    await tick(EVENT_WAIT);
    expect(refresh).not.toHaveBeenCalled();
    await tick(5_000);
    f.resync();
    await tick(EVENT_WAIT);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('a password or demo session (no SSO token) never subscribes, and polls as before', async () => {
    const f = fakeService();
    const refresh = vi.fn();
    const { result } = renderHook(() => useLiveData(refresh, { topic: 'messages', pollMs: 20_000, service: f.svc, signedIn: async () => false }));
    await tick(0);
    expect(f.svc.subscribeData).not.toHaveBeenCalled();
    expect(result.current).toEqual({ state: 'idle', live: false });
    await tick(20_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('a topic the hub refused keeps the screen\'s own interval', async () => {
    const f = fakeService('live', false);
    const refresh = vi.fn();
    const { result } = renderHook(() => useLiveData(refresh, { topic: 'engravers', pollMs: 30_000, service: f.svc, signedIn }));
    await tick(0);
    expect(result.current.live).toBe(false);
    await tick(30_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('one read at a time: a change during a read runs once after it', async () => {
    const f = fakeService();
    let finish!: () => void;
    const refresh = vi.fn(() => new Promise<void>(r => { finish = r; }));
    renderHook(() => useLiveData(refresh, { topic: 'messages', pollMs: 20_000, service: f.svc, signedIn }));
    await tick(0);
    f.emit({});
    await tick(EVENT_WAIT);
    expect(refresh).toHaveBeenCalledTimes(1);
    f.emit({ eventId: 'e2' });
    await tick(EVENT_WAIT);
    expect(refresh).toHaveBeenCalledTimes(1); // still reading
    await act(async () => { finish(); });
    await tick(0);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('polls only as a safety net while live, and at the screen\'s own interval otherwise', async () => {
    const f = fakeService('live');
    const refresh = vi.fn();
    renderHook(() => useLiveData(refresh, { topic: 'messages', pollMs: 20_000, service: f.svc, signedIn }));
    await tick(0); // signed in, subscribed, topic taken
    await tick(40_000);
    expect(refresh).toHaveBeenCalledTimes(0);
    await tick(20_000);
    expect(refresh).toHaveBeenCalledTimes(1); // the minute's safety poll
    act(() => f.setState('reconnecting'));
    await tick(20_000);
    expect(refresh).toHaveBeenCalledTimes(2); // back to every 20 s
  });

  it('a keyed topic without its key subscribes to nothing but still polls; disabled does neither', async () => {
    const f = fakeService('local');
    const refresh = vi.fn();
    const { result } = renderHook(() => useLiveData(refresh, { topic: 'facilityOps', dataKey: null, pollMs: 20_000, service: f.svc, signedIn }));
    expect(f.svc.subscribeData).not.toHaveBeenCalled();
    expect(result.current).toEqual({ state: 'idle', live: false });
    await tick(20_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    const off = vi.fn();
    renderHook(() => useLiveData(off, { topic: 'messages', pollMs: 20_000, enabled: false, service: f.svc, signedIn }));
    await tick(60_000);
    expect(off).not.toHaveBeenCalled();
  });

  it('pauseWhenHidden: no timed re-read while the tab is hidden, one when it is shown', async () => {
    const f = fakeService('local');
    const refresh = vi.fn();
    renderHook(() => useLiveData(refresh, { topic: 'interfaceEngines', pollMs: 60_000, pauseWhenHidden: true, service: f.svc, signedIn }));
    const vis = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await tick(60_000);
    expect(refresh).not.toHaveBeenCalled();
    vis.mockReturnValue('visible');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await tick(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    vis.mockRestore();
  });

  it('leaves the topic when the screen closes, and reads nothing after', async () => {
    const f = fakeService();
    const refresh = vi.fn();
    const { unmount } = renderHook(() => useLiveData(refresh, { topic: 'engravers', pollMs: 30_000, service: f.svc, signedIn }));
    await tick(0);
    f.emit({});
    unmount();
    await tick(EVENT_WAIT);
    expect(refresh).not.toHaveBeenCalled(); // the waiting read was cancelled
    expect(f.subs[0].live).toBe(false);
  });

  it('Batch 561: a connection that keeps dropping and coming back never puts the timed read off', async () => {
    const f = fakeService('reconnecting');
    const refresh = vi.fn();
    renderHook(() => useLiveData(refresh, { topic: 'messages', pollMs: 20_000, service: f.svc, signedIn }));
    await tick(0);
    for (let i = 0; i < 4; i++) {
      await tick(4_000);
      act(() => f.setState(i % 2 ? 'reconnecting' : 'live'));
    }
    act(() => f.setState('reconnecting'));
    await tick(4_500);
    expect(refresh).toHaveBeenCalledTimes(1); // due 20 s after the first read, as without the flapping
  });

  it('Batch 561: a slow read is never piled on by the timer', async () => {
    const f = fakeService('local');
    const refresh = vi.fn(() => new Promise<void>(r => setTimeout(r, 7_000)));
    renderHook(() => useLiveData(refresh, { topic: 'messages', pollMs: 5_000, service: f.svc, signedIn }));
    await tick(5_000);
    expect(refresh).toHaveBeenCalledTimes(1);  // the timed read at 5 s, taking 7 s
    await tick(6_900);
    expect(refresh).toHaveBeenCalledTimes(1);  // at 11.9 s: the 10 s read was skipped (one still running)
    await tick(1_200);
    expect(refresh).toHaveBeenCalledTimes(2);  // once it has finished (12 s), the next due read, and only one
  });

  it('Batch 561: an event read keeps a second after a timed read', async () => {
    const f = fakeService('local');
    const refresh = vi.fn();
    renderHook(() => useLiveData(refresh, { topic: 'messages', pollMs: 5_000, service: f.svc, signedIn: async () => true }));
    await tick(0);
    // The local transport never sends events; drive one through the fake's subscriber directly.
    const sub = f.subs[0];
    expect(sub).toBeDefined();
    await tick(4_950);
    sub.onEvent({ type: 'DataChanged', v: 1, eventId: 'x', topic: 'messages', occurredAt: '' });
    await tick(100);                           // the timed read runs at 5 s
    expect(refresh).toHaveBeenCalledTimes(1);
    await tick(800);
    expect(refresh).toHaveBeenCalledTimes(1);  // the event read waits for the second to pass
    await tick(1_300);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('Batch 562: pollMs null reads on events only, never on a timer', async () => {
    const f = fakeService('local');
    const refresh = vi.fn();
    renderHook(() => useLiveData(refresh, { topic: 'molecularQueue', pollMs: null, service: f.svc, signedIn }));
    await tick(0);
    await tick(10 * 60_000);
    expect(refresh).not.toHaveBeenCalled();
    f.emit({});
    await tick(EVENT_WAIT);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('Batch 562: several keys are asked for together, and a new set re-subscribes', async () => {
    const f = fakeService();
    const { rerender } = renderHook(({ k }) => useLiveData(vi.fn(), { topic: 'siteAgents', dataKeys: k, pollMs: 60_000, service: f.svc, signedIn }), { initialProps: { k: ['S2', 'S1', 'S1'] } });
    await tick(0);
    expect(f.svc.subscribeData).toHaveBeenLastCalledWith({ topic: 'siteAgents', keys: ['S1', 'S2'] }, expect.any(Function), expect.any(Function));
    rerender({ k: ['S1', 'S2'] });                 // the same set: no new subscription
    rerender({ k: ['S2', 'S1'] });                 // nor in another order
    await tick(0);
    expect(f.svc.subscribeData).toHaveBeenCalledTimes(1);
    rerender({ k: ['S1', 'S3'] });
    await tick(0);
    expect(f.svc.subscribeData).toHaveBeenLastCalledWith({ topic: 'siteAgents', keys: ['S1', 'S3'] }, expect.any(Function), expect.any(Function));
    expect(f.subs[0].live).toBe(false);
  });

  it('Batch 562: a keyed topic given no keys only polls', async () => {
    const f = fakeService('local');
    const refresh = vi.fn();
    renderHook(() => useLiveData(refresh, { topic: 'siteAgents', dataKeys: [], pollMs: 60_000, service: f.svc, signedIn }));
    await tick(60_000);
    expect(f.svc.subscribeData).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
