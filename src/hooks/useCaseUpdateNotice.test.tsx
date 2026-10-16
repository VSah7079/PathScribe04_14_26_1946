// @vitest-environment happy-dom
// src/hooks/useCaseUpdateNotice.test.tsx
// Batch 572: an open case report hears of another user's save: from the hub's caseReport topic (keyed by
// the support reference) or, in the demo, another tab. Its own saves show nothing.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import { useCaseUpdateNotice } from './useCaseUpdateNotice';
import type { ILiveUpdateService } from '@/services/liveUpdates/ILiveUpdateService';

afterEach(cleanup);

function fakeLive() {
  const subs: { sub: { topic: string; keys?: readonly string[] }; on: (e: unknown) => void; accepted?: (ok: boolean) => void }[] = [];
  const svc = {
    transport: 'signalr' as const,
    getState: () => 'connected',
    onStateChange: () => () => {},
    onResync: () => () => {},
    subscribeData: (sub: any, on: any, accepted?: any) => { subs.push({ sub, on, accepted }); accepted?.(true); return { unsubscribe: () => {} }; },
  } as unknown as ILiveUpdateService;
  return { svc, subs };
}

function setup(versions: number[]) {
  let i = 0;
  const elsewhere = new Set<(ids: string[]) => void>();
  const live = fakeLive();
  const deps = {
    getCase: vi.fn(async () => ({ version: versions[Math.min(i++, versions.length - 1)] })),
    getSupportRef: vi.fn(async () => 'SR-7K2Q-9MXD'),
    subscribeElsewhere: (l: (ids: string[]) => void) => { elsewhere.add(l); return () => elsewhere.delete(l); },
    liveService: live.svc,
    signedIn: async () => true,
  };
  return { deps, elsewhere, live };
}

describe('useCaseUpdateNotice', () => {
  it('subscribes to caseReport keyed by the support reference, never the case number', async () => {
    const { deps, live } = setup([3]);
    renderHook(() => useCaseUpdateNotice('S26-4408', () => 3, deps));
    await waitFor(() => expect(live.subs.length).toBe(1));
    expect(live.subs[0].sub).toEqual({ topic: 'caseReport', keys: ['SR-7K2Q-9MXD'] });
  });

  it('another tab saving the case (demo): a notice with the newer version; Later hides it', async () => {
    const { deps, elsewhere } = setup([4]);
    const { result } = renderHook(() => useCaseUpdateNotice('S26-4408', () => 3, deps));
    await act(async () => { elsewhere.forEach(l => l(['S26-4408'])); });
    await waitFor(() => expect(result.current.version).toBe(4));
    act(() => result.current.dismiss());
    expect(result.current.version).toBeNull();
    // The same version again (a second event) stays dismissed.
    await act(async () => { elsewhere.forEach(l => l(['S26-4408'])); });
    expect(result.current.version).toBeNull();
  });

  it("another case's change shows nothing; a notice goes once the page catches up (its own save or take-up)", async () => {
    const { deps, elsewhere } = setup([4]);
    let known = 3;
    const { result, rerender } = renderHook(() => useCaseUpdateNotice('S26-4408', () => known, deps));
    await act(async () => { elsewhere.forEach(l => l(['S26-9999'])); });
    expect(deps.getCase).not.toHaveBeenCalled();
    await act(async () => { elsewhere.forEach(l => l(['S26-4408'])); });
    await waitFor(() => expect(result.current.version).toBe(4));
    known = 4;
    rerender();
    expect(result.current.version).toBeNull();
  });

  it('a caseReport event from the hub: the case is read again and a newer version shown', async () => {
    const { deps, live } = setup([5]);
    const { result } = renderHook(() => useCaseUpdateNotice('S26-4408', () => 4, deps));
    await waitFor(() => expect(live.subs.length).toBe(1));
    await act(async () => { live.subs[0].on({ type: 'DataChanged', v: 1, eventId: 'e1', topic: 'caseReport', key: 'SR-7K2Q-9MXD', occurredAt: new Date().toISOString() }); });
    await waitFor(() => expect(result.current.version).toBe(5), { timeout: 4000 });
    expect(deps.getCase).toHaveBeenCalledWith('S26-4408');
  });

  it('Batch 575: dismissed through the version the page took up, so an event for it shows nothing', async () => {
    const { deps, elsewhere } = setup([6]);
    const { result } = renderHook(() => useCaseUpdateNotice('S26-4408', () => 3, deps));
    act(() => result.current.dismiss(6));
    await act(async () => { elsewhere.forEach(l => l(['S26-4408'])); });
    expect(result.current.version).toBeNull();
  });
});
