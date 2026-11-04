// @vitest-environment happy-dom
// src/services/liveUpdates/casePresence.test.ts — Batch 573.
// Who else has a case open: the contract's parsing and rules, the demo's windows (local transport) and the
// hub (SignalR transport).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CASE_PRESENCE_MAX_VIEWERS, HUB_CASE_PRESENCE_CHANGED, HUB_JOIN_CASE_PRESENCE, HUB_LEAVE_CASE_PRESENCE, HUB_SET_CASE_PRESENCE_EDITING,
  LOCAL_PRESENCE_EXPIRE_MS, LOCAL_PRESENCE_HEARTBEAT_MS,
  casePresenceChange, casePresenceSelf, liveLocalViewers, otherViewers, parseCasePresenceChangedEvent, parseCasePresenceViewers, parseLocalPresenceMessage,
  type CasePresenceViewer,
} from './casePresence';
import { createLocalLiveUpdateService } from './localLiveUpdateService';
import { createSignalRLiveUpdateService, type HubConnectionLike } from './signalRLiveUpdateService';

const viewer = (over: Partial<CasePresenceViewer> = {}): CasePresenceViewer => ({
  presenceId: 'p1', userId: 'u1', name: 'Dr Ada Lee', editing: false, since: '2026-10-15T15:00:00Z', ...over,
});
const flush = () => new Promise(r => setTimeout(r, 0));
const last = <T,>(list: readonly T[]): T | undefined => list[list.length - 1];

describe('case presence: contract and rules', () => {
  it('parses a CasePresenceChanged event; bad viewers left out, one per presence, at most the cap', () => {
    const e = parseCasePresenceChangedEvent({ v: 1, ref: 'SR-7K2Q-9MXD', viewers: [viewer(), viewer(), { presenceId: 'x' }, viewer({ presenceId: 'p2', email: ' a@lab.org ', phone: '+1 (520) 555-0100 x204' })] });
    expect(e?.viewers.map(v => v.presenceId)).toEqual(['p1', 'p2']);
    expect(e?.viewers[1]).toMatchObject({ email: 'a@lab.org', phone: '+1 (520) 555-0100 x204' });
    // Contact details that could change a mailto:/tel: link are dropped, not the viewer.
    const odd = parseCasePresenceViewers([viewer({ email: 'a@lab.org?cc=x@evil.org', phone: 'call me' })])[0];
    expect(odd).toBeTruthy();
    expect(odd.email).toBeUndefined();
    expect(odd.phone).toBeUndefined();
    expect(parseCasePresenceChangedEvent({ v: 2, ref: 'SR-1', viewers: [] })).toBeNull();
    expect(parseCasePresenceChangedEvent({ v: 1, viewers: [] })).toBeNull();
    const many = Array.from({ length: CASE_PRESENCE_MAX_VIEWERS + 5 }, (_, i) => viewer({ presenceId: `p${i}` }));
    expect(parseCasePresenceViewers(many)).toHaveLength(CASE_PRESENCE_MAX_VIEWERS);
  });

  it('others: this window left out, the same person elsewhere kept; editing first, then earliest', () => {
    const list = [
      viewer({ presenceId: 'mine', userId: 'me' }),
      viewer({ presenceId: 'a', since: '2026-10-15T15:05:00Z' }),
      viewer({ presenceId: 'b', userId: 'u2', since: '2026-10-15T15:10:00Z', editing: true }),
      viewer({ presenceId: 'me-elsewhere', userId: 'me', since: '2026-10-15T14:00:00Z' }),
    ];
    const others = otherViewers(list, 'mine', 'me');
    expect(others.map(v => v.presenceId)).toEqual(['b', 'me-elsewhere', 'a']);
    expect(others.map(v => v.self)).toEqual([false, true, false]);
  });

  it('one message about a change: editing before opening before closing; nothing for a heartbeat', () => {
    const a = viewer({ presenceId: 'a' });
    const b = viewer({ presenceId: 'b', userId: 'u2', name: 'Dr Ben Ito' });
    expect(casePresenceChange([], [a], 'me')).toEqual({ kind: 'joined', name: 'Dr Ada Lee', self: false });
    expect(casePresenceChange([a], [{ ...a, editing: true }, b], 'me')).toEqual({ kind: 'editing', name: 'Dr Ada Lee', self: false });
    expect(casePresenceChange([a, b], [b], 'me')).toEqual({ kind: 'left', name: 'Dr Ada Lee', self: false });
    expect(casePresenceChange([a], [a], 'me')).toBeNull();
    expect(casePresenceChange([{ ...a, editing: true }], [a], 'me')).toBeNull();
    expect(casePresenceChange([], [viewer({ userId: 'me' })], 'me')?.self).toBe(true);
    // The first list after joining or reconnecting is the starting point: nothing announced.
    expect(casePresenceChange(null, [a, b], 'me')).toBeNull();
  });

  it('who this window is, from the signed-in user; nobody signed in: no presence', () => {
    expect(casePresenceSelf({ id: 'u1', name: 'Dr Ada Lee', email: 'ada@lab.org' })).toEqual({ userId: 'u1', name: 'Dr Ada Lee', email: 'ada@lab.org' });
    expect(casePresenceSelf(null)).toBeNull();
    expect(casePresenceSelf({ id: 'u1' })).toBeNull();
  });

  it('the demo messages between windows, and dropping a window not heard from', () => {
    expect(parseLocalPresenceMessage({ kind: 'casePresence', op: 'here', ref: 'SR-1', viewer: viewer(), ask: true })).toMatchObject({ op: 'here', ask: true });
    expect(parseLocalPresenceMessage({ kind: 'casePresence', op: 'leave', ref: 'SR-1', presenceId: 'p1' })).toMatchObject({ op: 'leave' });
    expect(parseLocalPresenceMessage({ kind: 'intraop' })).toBeNull();
    const heard = new Map([['p1', { viewer: viewer(), at: 1_000 }], ['p2', { viewer: viewer({ presenceId: 'p2' }), at: 1_000 + LOCAL_PRESENCE_EXPIRE_MS }]]);
    expect(liveLocalViewers(heard, 1_000 + LOCAL_PRESENCE_EXPIRE_MS + 1).map(v => v.presenceId)).toEqual(['p2']);
  });
});

/** Several windows of one browser: BroadcastChannels that reach every other window, not the sender. */
function channelBus() {
  const channels: { name: string; ch: { postMessage: (m: unknown) => void; onmessage: ((ev: { data: unknown }) => void) | null; close: () => void } }[] = [];
  return (name: string) => {
    const ch = {
      onmessage: null as ((ev: { data: unknown }) => void) | null,
      postMessage: (m: unknown) => { for (const o of channels) if (o.name === name && o.ch !== ch) o.ch.onmessage?.({ data: JSON.parse(JSON.stringify(m)) }); },
      close: () => {},
    };
    channels.push({ name, ch });
    return ch;
  };
}

describe('case presence without a hub: this browser\'s windows', () => {
  let clock: number;
  let beats: (() => void)[];
  const windowOf = (bus: ReturnType<typeof channelBus>, hide?: (fn: () => void) => void) => createLocalLiveUpdateService({
    channelFactory: bus, now: () => new Date(clock),
    setRepeat: fn => { beats.push(fn); return fn; }, clearRepeat: fn => { beats = beats.filter(b => b !== fn); },
    onPageHide: hide ?? (() => {}),
  });
  beforeEach(() => { clock = Date.parse('2026-10-15T15:00:00Z'); beats = []; });

  it('two windows on the same case see each other; editing and leaving reach the other', () => {
    const bus = channelBus();
    const w1 = windowOf(bus); const w2 = windowOf(bus);
    const seen1: CasePresenceViewer[][] = []; const seen2: CasePresenceViewer[][] = [];
    const h1 = w1.joinCasePresence({ ref: 'SR-1', presenceId: 'w1', editing: false, self: { userId: 'u1', name: 'Dr Ada Lee' } }, v => seen1.push(v));
    w2.joinCasePresence({ ref: 'SR-1', presenceId: 'w2', editing: false, self: { userId: 'u2', name: 'Dr Ben Ito', email: 'ben@lab.org' } }, v => seen2.push(v));
    expect(last(seen1)?.map(v => v.presenceId).sort()).toEqual(['w1', 'w2']);
    expect(last(seen2)?.map(v => v.presenceId).sort()).toEqual(['w1', 'w2']); // w1 answered w2's ask at once
    expect(last(seen1)?.find(v => v.presenceId === 'w2')?.email).toBe('ben@lab.org');
    h1.setEditing(true);
    expect(last(seen2)?.find(v => v.presenceId === 'w1')?.editing).toBe(true);
    h1.leave();
    expect(last(seen2)?.map(v => v.presenceId)).toEqual(['w2']);
  });

  it('another case is not mixed in; a window that closes without a word is dropped after the expiry', () => {
    const bus = channelBus();
    const w1 = windowOf(bus); const w2 = windowOf(bus); const w3 = windowOf(bus);
    const seen1: CasePresenceViewer[][] = [];
    w1.joinCasePresence({ ref: 'SR-1', presenceId: 'w1', editing: false, self: { userId: 'u1', name: 'A' } }, v => seen1.push(v));
    w3.joinCasePresence({ ref: 'SR-2', presenceId: 'w3', editing: false, self: { userId: 'u3', name: 'C' } }, () => {});
    w2.joinCasePresence({ ref: 'SR-1', presenceId: 'w2', editing: false, self: { userId: 'u2', name: 'B' } }, () => {});
    expect(last(seen1)?.map(v => v.presenceId).sort()).toEqual(['w1', 'w2']);
    // w2's window is killed: it says nothing more. w1 keeps beating.
    const w1Beat = beats[0];
    clock += LOCAL_PRESENCE_HEARTBEAT_MS; w1Beat();
    expect(last(seen1)?.map(v => v.presenceId).sort()).toEqual(['w1', 'w2']);
    clock += LOCAL_PRESENCE_EXPIRE_MS; w1Beat();
    expect(last(seen1)?.map(v => v.presenceId)).toEqual(['w1']);
  });

  it('without saying who it is, a window joins nothing', () => {
    const bus = channelBus();
    const w1 = windowOf(bus); const w2 = windowOf(bus);
    const seen1: CasePresenceViewer[][] = [];
    w1.joinCasePresence({ ref: 'SR-1', presenceId: 'w1', editing: false, self: { userId: 'u1', name: 'A' } }, v => seen1.push(v));
    w2.joinCasePresence({ ref: 'SR-1', presenceId: 'w2', editing: false }, () => {});
    expect(last(seen1)?.map(v => v.presenceId)).toEqual(['w1']);
  });

  it('a window going away (pagehide) says goodbye', () => {
    const bus = channelBus();
    let hide: () => void = () => {};
    const w1 = windowOf(bus); const w2 = windowOf(bus, fn => { hide = fn; });
    const seen1: CasePresenceViewer[][] = [];
    w1.joinCasePresence({ ref: 'SR-1', presenceId: 'w1', editing: false, self: { userId: 'u1', name: 'A' } }, v => seen1.push(v));
    w2.joinCasePresence({ ref: 'SR-1', presenceId: 'w2', editing: false, self: { userId: 'u2', name: 'B' } }, () => {});
    hide();
    expect(last(seen1)?.map(v => v.presenceId)).toEqual(['w1']);
  });
});

function fakeHub(joinResult: (join: unknown) => unknown) {
  const handlers: Record<string, (...a: unknown[]) => void> = {};
  const cb = { reconnecting: [] as (() => void)[], reconnected: [] as (() => void)[], close: [] as (() => void)[] };
  return {
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    on: vi.fn((m: string, h: (...a: unknown[]) => void) => { handlers[m] = h; }),
    invoke: vi.fn(async (m: string, ...args: unknown[]) => (m === HUB_JOIN_CASE_PRESENCE ? joinResult(args[0]) : undefined)),
    onreconnecting: (f: () => void) => { cb.reconnecting.push(f); },
    onreconnected: (f: () => void) => { cb.reconnected.push(f); },
    onclose: (f: () => void) => { cb.close.push(f); },
    emit: (m: string, ...a: unknown[]) => handlers[m]?.(...a),
    drop: () => cb.reconnecting.forEach(f => f()),
    back: async () => { cb.reconnected.forEach(f => f()); await flush(); },
  };
}

describe('case presence through the hub', () => {
  const make = (hub: ReturnType<typeof fakeHub>) => createSignalRLiveUpdateService({
    hubUrl: 'https://api.example/hubs/live', buildConnection: () => hub as unknown as HubConnectionLike,
    setTimer: () => null, clearTimer: () => {}, random: () => 0.5, log: () => {},
  });

  it('joins with the reference and its own presence id; shows the hub\'s list; follows CasePresenceChanged for its case only', async () => {
    const hub = fakeHub(() => ({ accepted: true, viewers: [viewer({ presenceId: 'mine', userId: 'me' }), viewer()] }));
    const svc = make(hub);
    const seen: CasePresenceViewer[][] = [];
    svc.joinCasePresence({ ref: 'SR-7K2Q-9MXD', presenceId: 'mine', editing: false, self: { userId: 'me', name: 'Me' } }, v => seen.push(v));
    await flush();
    // `self` is never sent: the hub knows who the user is from the token.
    expect(hub.invoke).toHaveBeenCalledWith(HUB_JOIN_CASE_PRESENCE, { ref: 'SR-7K2Q-9MXD', presenceId: 'mine', editing: false });
    expect(last(seen)?.map(v => v.presenceId)).toEqual(['mine', 'p1']);
    hub.emit(HUB_CASE_PRESENCE_CHANGED, { v: 1, ref: 'SR-OTHER-0000', viewers: [] });
    expect(last(seen)).toHaveLength(2);
    hub.emit(HUB_CASE_PRESENCE_CHANGED, { v: 1, ref: 'SR-7K2Q-9MXD', viewers: [viewer({ presenceId: 'mine', userId: 'me' })] });
    expect(last(seen)?.map(v => v.presenceId)).toEqual(['mine']);
  });

  it('sends editing changes and leaving; nothing shown while reconnecting; joins again after', async () => {
    const hub = fakeHub(() => ({ accepted: true, viewers: [viewer({ presenceId: 'mine' })] }));
    const svc = make(hub);
    const seen: CasePresenceViewer[][] = [];
    const h = svc.joinCasePresence({ ref: 'SR-1', presenceId: 'mine', editing: false }, v => seen.push(v));
    await flush();
    h.setEditing(true);
    h.setEditing(true);
    expect(hub.invoke.mock.calls.filter(c => c[0] === HUB_SET_CASE_PRESENCE_EDITING)).toEqual([[HUB_SET_CASE_PRESENCE_EDITING, 'SR-1', 'mine', true]]);
    hub.drop();
    expect(last(seen)).toEqual([]);
    await hub.back();
    expect(last(hub.invoke.mock.calls.filter(c => c[0] === HUB_JOIN_CASE_PRESENCE))).toEqual([HUB_JOIN_CASE_PRESENCE, { ref: 'SR-1', presenceId: 'mine', editing: true }]);
    expect(last(seen)).toHaveLength(1);
    h.leave();
    expect(hub.invoke).toHaveBeenLastCalledWith(HUB_LEAVE_CASE_PRESENCE, 'SR-1', 'mine');
  });

  it('recognises itself by the id the hub lists it under', async () => {
    const hub = fakeHub(() => ({ accepted: true, presenceId: 'srv-1', viewers: [viewer({ presenceId: 'srv-1', userId: 'me' })] }));
    const own: string[] = [];
    make(hub).joinCasePresence({ ref: 'SR-1', presenceId: 'mine', editing: false }, (_v, id) => own.push(id));
    await flush();
    expect(last(own)).toBe('srv-1');
  });

  it('leaving while the join is on its way takes it back once the hub answers', async () => {
    let answer: (v: unknown) => void = () => {};
    const hub = fakeHub(() => new Promise(r => { answer = r; }));
    const svc = make(hub);
    svc.subscribeData({ topic: 'messages' }, () => {}); // something else keeps the connection open
    const h = svc.joinCasePresence({ ref: 'SR-1', presenceId: 'mine', editing: false }, () => {});
    await flush();
    h.leave();
    expect(hub.invoke.mock.calls.some(c => c[0] === HUB_LEAVE_CASE_PRESENCE)).toBe(false);
    answer({ accepted: true, viewers: [viewer({ presenceId: 'mine' })] });
    await flush();
    expect(hub.invoke).toHaveBeenLastCalledWith(HUB_LEAVE_CASE_PRESENCE, 'SR-1', 'mine');
  });

  it('an editing change while the join is on its way is sent once the join is answered', async () => {
    let answer: (v: unknown) => void = () => {};
    const hub = fakeHub(() => new Promise(r => { answer = r; }));
    const h = make(hub).joinCasePresence({ ref: 'SR-1', presenceId: 'mine', editing: false }, () => {});
    await flush();
    h.setEditing(true);
    expect(hub.invoke.mock.calls.some(c => c[0] === HUB_SET_CASE_PRESENCE_EDITING)).toBe(false);
    answer({ accepted: true, viewers: [viewer({ presenceId: 'mine' })] });
    await flush();
    expect(hub.invoke).toHaveBeenLastCalledWith(HUB_SET_CASE_PRESENCE_EDITING, 'SR-1', 'mine', true);
  });

  it('refused (no such case, or not allowed: the same answer): nobody shown, its events ignored', async () => {
    const hub = fakeHub(() => ({ accepted: false }));
    const svc = make(hub);
    const seen: CasePresenceViewer[][] = [];
    const h = svc.joinCasePresence({ ref: 'SR-NOPE-0000', presenceId: 'mine', editing: false }, v => seen.push(v));
    await flush();
    expect(last(seen)).toEqual([]);
    hub.emit(HUB_CASE_PRESENCE_CHANGED, { v: 1, ref: 'SR-NOPE-0000', viewers: [viewer()] });
    expect(last(seen)).toEqual([]);
    h.setEditing(true);
    h.leave();
    expect(hub.invoke.mock.calls.map(c => c[0])).toEqual([HUB_JOIN_CASE_PRESENCE]);
  });
});
