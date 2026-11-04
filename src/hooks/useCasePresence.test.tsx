// @vitest-environment happy-dom
// src/hooks/useCasePresence.test.tsx — Batch 573: who else has an open case report open.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import { useCasePresence } from './useCasePresence';
import type { ILiveUpdateService } from '@/services/liveUpdates/ILiveUpdateService';
import type { CasePresenceViewer } from '@/services/liveUpdates/casePresence';

afterEach(cleanup);

function fakeService(transport: 'signalr' | 'local' = 'signalr') {
  const joins: { join: { ref: string; presenceId: string; editing: boolean }; onChange: (v: CasePresenceViewer[], own: string) => void; setEditing: ReturnType<typeof vi.fn>; leave: ReturnType<typeof vi.fn> }[] = [];
  const svc = {
    transport,
    joinCasePresence: (join: { ref: string; presenceId: string; editing: boolean }, onChange: (v: CasePresenceViewer[], own: string) => void) => {
      const j = { join, onChange, setEditing: vi.fn(), leave: vi.fn() };
      joins.push(j);
      return { setEditing: j.setEditing, leave: j.leave };
    },
  } as unknown as ILiveUpdateService;
  return { svc, joins };
}
const me = { userId: 'me', name: 'Dr Me' };
const v = (over: Partial<CasePresenceViewer>): CasePresenceViewer => ({ presenceId: 'x', userId: 'u2', name: 'Dr Ben Ito', editing: false, since: '2026-10-15T15:00:00Z', ...over });

describe('useCasePresence', () => {
  it('joins with the support reference, never the case number; shows the others; leaves on close', async () => {
    const { svc, joins } = fakeService();
    const deps = { getSupportRef: vi.fn(async () => 'SR-7K2Q-9MXD'), liveService: svc, signedIn: async () => true };
    const { result, unmount } = renderHook(() => useCasePresence('S26-4408', false, me, deps));
    await waitFor(() => expect(joins).toHaveLength(1));
    expect(joins[0].join).toMatchObject({ ref: 'SR-7K2Q-9MXD', editing: false });
    const own = joins[0].join.presenceId;
    // The first list is the starting point: shown, not announced.
    act(() => joins[0].onChange([v({ presenceId: own, userId: 'me' }), v({ presenceId: 'b' })], own));
    expect(result.current.others.map(o => o.presenceId)).toEqual(['b']);
    expect(result.current.change).toBeNull();
    act(() => joins[0].onChange([v({ presenceId: own, userId: 'me' }), v({ presenceId: 'b' }), v({ presenceId: 'c', name: 'Dr Cy Park' })], own));
    expect(result.current.change).toMatchObject({ kind: 'joined', name: 'Dr Cy Park', self: false });
    // A dropped connection (an empty list): nobody shown, nothing announced; back again: no "opened" for those already there.
    act(() => joins[0].onChange([], own));
    expect(result.current.others).toEqual([]);
    act(() => joins[0].onChange([v({ presenceId: own, userId: 'me' }), v({ presenceId: 'b' }), v({ presenceId: 'c', name: 'Dr Cy Park' })], own));
    expect(result.current.others).toHaveLength(2);
    expect(result.current.change).toMatchObject({ kind: 'joined', name: 'Dr Cy Park' }); // unchanged
    unmount();
    expect(joins[0].leave).toHaveBeenCalledTimes(1);
  });

  it('tells the hub when this page starts and stops having unsaved changes', async () => {
    const { svc, joins } = fakeService();
    const deps = { getSupportRef: async () => 'SR-1', liveService: svc, signedIn: async () => true };
    let editing = false;
    const { rerender } = renderHook(() => useCasePresence('S26-4408', editing, me, deps));
    await waitFor(() => expect(joins).toHaveLength(1));
    editing = true; rerender();
    expect(joins[0].setEditing).toHaveBeenLastCalledWith(true);
  });

  it('no presence through the hub without a signed-in (SSO) session, without a reference, or with nobody signed in', async () => {
    const a = fakeService();
    renderHook(() => useCasePresence('S26-4408', false, me, { getSupportRef: async () => 'SR-1', liveService: a.svc, signedIn: async () => false }));
    const b = fakeService();
    renderHook(() => useCasePresence('S26-4408', false, me, { getSupportRef: async () => null, liveService: b.svc, signedIn: async () => true }));
    const c = fakeService();
    renderHook(() => useCasePresence('S26-4408', false, null, { getSupportRef: async () => 'SR-1', liveService: c.svc, signedIn: async () => true }));
    await new Promise(r => setTimeout(r, 20));
    expect([a.joins.length, b.joins.length, c.joins.length]).toEqual([0, 0, 0]);
  });

  it('the demo (no hub) needs no sign-in check, and says who this window is', async () => {
    const { svc, joins } = fakeService('local');
    const signedIn = vi.fn(async () => false);
    renderHook(() => useCasePresence('S26-4408', false, me, { getSupportRef: async () => 'SR-1', liveService: svc, signedIn }));
    await waitFor(() => expect(joins).toHaveLength(1));
    expect(joins[0].join).toMatchObject({ self: me });
    expect(signedIn).not.toHaveBeenCalled();
  });
});
