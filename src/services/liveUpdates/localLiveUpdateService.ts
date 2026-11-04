// src/services/liveUpdates/localLiveUpdateService.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-262: live updates without a server. The mock services publish each
// write here (standing in for the API server, which publishes after it
// commits), and a BroadcastChannel carries it to this browser's other
// windows — so two boards open on one computer, or a board and the Intraop
// Queue, update each other instantly. Other devices can't be reached
// without the hub; the screens keep polling for those (state `local`).
//
// Batch 347 (PS-54): network print results travel the same way. With no
// server nobody ever sends one, so the demo publishes a simulated result
// (publishPrintJobStatus) to show the flow end to end.
// ─────────────────────────────────────────────────────────────────────────────

import {
  LIVE_UPDATES_CONTRACT_VERSION, parseIntraopChangedEvent, parsePrintJobStatusEvent, parseReportDeliveryStatusEvent, parseWsiScanBatchChangedEvent,
  type IntraopChangedEvent, type IntraopScope, type PrintJobStatusEvent, type ReportDeliveryStatusEvent, type WsiScanBatchChangedEvent,
} from './liveUpdateContract';
import { createDuplicateFilter, eventMatchesScope, type LiveConnectionState } from './liveUpdatePolicy';
import type { ILiveUpdateService, LiveUpdateSubscription } from './ILiveUpdateService';
import {
  LOCAL_PRESENCE_CHANNEL, LOCAL_PRESENCE_HEARTBEAT_MS, liveLocalViewers, parseLocalPresenceMessage,
  type CasePresenceListener, type CasePresenceViewer, type LocalPresenceMessage,
} from './casePresence';

export const LOCAL_CHANNEL_NAME = 'pathscribe-live-intraop';

interface ChannelLike {
  postMessage(message: unknown): void;
  onmessage: ((ev: { data: unknown }) => void) | null;
  close(): void;
}

export interface LocalLiveUpdateService extends ILiveUpdateService {
  /** What the API server will do after a committed write. */
  publish(change: Omit<IntraopChangedEvent, 'v' | 'eventId' | 'occurredAt'> & { eventId?: string; occurredAt?: string }): IntraopChangedEvent;
  /** What the API server will do when the interface engine reports on a print job. */
  publishPrintJobStatus(result: Omit<PrintJobStatusEvent, 'v' | 'eventId' | 'occurredAt'> & { eventId?: string; occurredAt?: string }): PrintJobStatusEvent;
  /** Batch 434: what the API server will do after a WSI scan batch write. */
  publishWsiScanBatchChange(change: Omit<WsiScanBatchChangedEvent, 'v' | 'eventId' | 'occurredAt'> & { eventId?: string; occurredAt?: string }): WsiScanBatchChangedEvent;
  /** Batch 521 (PS-281): what a fax provider reported (the demo's stand-in for the server). */
  publishReportDeliveryStatus(status: Omit<ReportDeliveryStatusEvent, 'v' | 'eventId' | 'occurredAt'> & { eventId?: string; occurredAt?: string }): ReportDeliveryStatusEvent;
}

let counter = 0;
const newEventId = () => `local-${Date.now().toString(36)}-${(++counter).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createLocalLiveUpdateService(deps: {
  channelFactory?: (name: string) => ChannelLike | null;
  now?: () => Date;
  /** Batch 573: a repeating timer (the presence heartbeat); tests pass a fake. */
  setRepeat?: (fn: () => void, ms: number) => unknown;
  clearRepeat?: (handle: unknown) => void;
  /** Batch 573: called with a function to run when the window is going away (the browser's `pagehide`). */
  onPageHide?: (fn: () => void) => void;
  /** Batch 573: called with a function to run when the window is shown again (a hidden tab's timers are slowed). */
  onShown?: (fn: () => void) => void;
} = {}): LocalLiveUpdateService {
  const now = deps.now ?? (() => new Date());
  const setRepeat = deps.setRepeat ?? ((fn, ms) => setInterval(fn, ms));
  const clearRepeat = deps.clearRepeat ?? (h => clearInterval(h as ReturnType<typeof setInterval>));
  const onPageHide = deps.onPageHide ?? ((fn: () => void) => { if (typeof window !== 'undefined') window.addEventListener('pagehide', fn); });
  const onShown = deps.onShown ?? ((fn: () => void) => {
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') fn(); });
  });
  const channelFactory = deps.channelFactory ?? ((name: string) =>
    (typeof BroadcastChannel === 'undefined' ? null : (new BroadcastChannel(name) as unknown as ChannelLike)));
  const subscribers = new Map<number, { scope: IntraopScope; onEvent: (e: IntraopChangedEvent) => void }>();
  const printSubscribers = new Map<number, (e: PrintJobStatusEvent) => void>();
  const wsiSubscribers = new Map<number, (e: WsiScanBatchChangedEvent) => void>();
  const deliverySubscribers = new Map<number, (e: ReportDeliveryStatusEvent) => void>();
  const isNew = createDuplicateFilter();
  let nextId = 1;
  let channel: ChannelLike | null | undefined;

  const deliver = (event: IntraopChangedEvent) => {
    if (!isNew(event.eventId)) return;
    for (const s of [...subscribers.values()]) {
      if (!eventMatchesScope(event, s.scope)) continue;
      try { s.onEvent(event); } catch (e) { console.error('[liveUpdates] subscriber failed:', e); }
    }
  };

  const deliverPrint = (event: PrintJobStatusEvent) => {
    if (!isNew(event.eventId)) return;
    for (const onEvent of [...printSubscribers.values()]) {
      try { onEvent(event); } catch (e) { console.error('[liveUpdates] print-result subscriber failed:', e); }
    }
  };

  const deliverWsi = (event: WsiScanBatchChangedEvent) => {
    if (!isNew(event.eventId)) return;
    for (const onEvent of [...wsiSubscribers.values()]) {
      try { onEvent(event); } catch (e) { console.error('[liveUpdates] scan-batch subscriber failed:', e); }
    }
  };

  const deliverDelivery = (event: ReportDeliveryStatusEvent) => {
    if (!isNew(event.eventId)) return;
    for (const onEvent of [...deliverySubscribers.values()]) {
      try { onEvent(event); } catch (e) { console.error('[liveUpdates] report-delivery subscriber failed:', e); }
    }
  };

  const ensureChannel = () => {
    if (channel !== undefined) return channel;
    try { channel = channelFactory(LOCAL_CHANNEL_NAME); } catch { channel = null; }
    if (channel) {
      channel.onmessage = ev => {
        const e = parseIntraopChangedEvent(ev.data);
        if (e) { deliver(e); return; }
        const p = parsePrintJobStatusEvent(ev.data);
        if (p) { deliverPrint(p); return; }
        const w = parseWsiScanBatchChangedEvent(ev.data);
        if (w) { deliverWsi(w); return; }
        const d = parseReportDeliveryStatusEvent(ev.data);
        if (d) deliverDelivery(d);
      };
    }
    return channel;
  };

  // ── Batch 573: presence between this browser's windows (casePresence.ts) ──
  /** The case reports open in this window. */
  const ownPresences = new Map<string, { ref: string; viewer: CasePresenceViewer; onChange: CasePresenceListener }>();
  /** Every presence heard of, by case reference: this window's and other windows'. */
  const heard = new Map<string, Map<string, { viewer: CasePresenceViewer; at: number }>>();
  let presenceChannel: ChannelLike | null | undefined;
  let heartbeat: unknown = null;
  let pageHideHooked = false;
  const nowMs = () => now().getTime();
  const tellRef = (ref: string) => {
    const list = liveLocalViewers(heard.get(ref) ?? new Map(), nowMs());
    for (const p of [...ownPresences.values()]) {
      if (p.ref !== ref) continue;
      try { p.onChange(list, p.viewer.presenceId); } catch (e) { console.error('[liveUpdates] presence subscriber failed:', e); }
    }
  };
  const record = (ref: string, viewer: CasePresenceViewer) => {
    const forRef = heard.get(ref) ?? new Map();
    const before = forRef.get(viewer.presenceId)?.viewer;
    forRef.set(viewer.presenceId, { viewer, at: nowMs() });
    heard.set(ref, forRef);
    return !before || before.editing !== viewer.editing;
  };
  const post = (message: LocalPresenceMessage) => { try { presenceChannel?.postMessage(message); } catch { /* closing */ } };
  const sayHere = (p: { ref: string; viewer: CasePresenceViewer }, ask = false) => post({ kind: 'casePresence', op: 'here', ref: p.ref, viewer: p.viewer, ...(ask ? { ask: true } : {}) });
  const ensurePresenceChannel = () => {
    if (presenceChannel !== undefined) return;
    try { presenceChannel = channelFactory(LOCAL_PRESENCE_CHANNEL); } catch { presenceChannel = null; }
    if (!presenceChannel) return;
    presenceChannel.onmessage = ev => {
      const m = parseLocalPresenceMessage(ev.data);
      if (!m || ![...ownPresences.values()].some(p => p.ref === m.ref)) return;
      if (m.op === 'leave') {
        if (heard.get(m.ref)?.delete(m.presenceId)) tellRef(m.ref);
        return;
      }
      const changed = record(m.ref, m.viewer);
      // A window that has just opened the case asks who else is there: answer at once.
      if (m.ask) for (const p of ownPresences.values()) if (p.ref === m.ref) sayHere(p);
      if (changed) tellRef(m.ref);
    };
  };
  const beat = () => {
    for (const p of ownPresences.values()) { record(p.ref, p.viewer); sayHere(p); }
    // Drop windows not heard from (closed without saying goodbye) and tell the screens.
    for (const [ref, forRef] of heard) {
      const alive = new Set(liveLocalViewers(forRef, nowMs()).map(v => v.presenceId));
      let dropped = false;
      for (const id of [...forRef.keys()]) if (!alive.has(id)) { forRef.delete(id); dropped = true; }
      if (dropped) tellRef(ref);
    }
  };
  const leaveAll = () => { for (const p of ownPresences.values()) post({ kind: 'casePresence', op: 'leave', ref: p.ref, presenceId: p.viewer.presenceId }); };

  return {
    transport: 'local',
    joinCasePresence(join, onChange) {
      // Nobody else knows who this window is without the hub: with no `self`, join nothing.
      if (!join.self) return { setEditing: () => {}, leave: () => {} };
      ensurePresenceChannel();
      if (!pageHideHooked) { pageHideHooked = true; onPageHide(leaveAll); onShown(() => { if (ownPresences.size) beat(); }); }
      const self = join.self;
      const p = {
        ref: join.ref, onChange,
        viewer: {
          presenceId: join.presenceId, userId: self.userId, name: self.name, editing: join.editing, since: now().toISOString(),
          ...(self.email ? { email: self.email } : {}), ...(self.phone ? { phone: self.phone } : {}),
        } as CasePresenceViewer,
      };
      ownPresences.set(join.presenceId, p);
      record(p.ref, p.viewer);
      sayHere(p, true);
      if (!heartbeat) heartbeat = setRepeat(beat, LOCAL_PRESENCE_HEARTBEAT_MS);
      tellRef(p.ref);
      return {
        setEditing: (editing: boolean) => {
          if (ownPresences.get(join.presenceId) !== p || p.viewer.editing === editing) return;
          p.viewer = { ...p.viewer, editing };
          record(p.ref, p.viewer);
          sayHere(p);
          tellRef(p.ref);
        },
        leave: () => {
          if (ownPresences.get(join.presenceId) !== p) return;
          ownPresences.delete(join.presenceId);
          heard.get(p.ref)?.delete(join.presenceId);
          post({ kind: 'casePresence', op: 'leave', ref: p.ref, presenceId: join.presenceId });
          tellRef(p.ref);
          if (![...ownPresences.values()].some(o => o.ref === p.ref)) heard.delete(p.ref);
          if (ownPresences.size === 0 && heartbeat) { clearRepeat(heartbeat); heartbeat = null; }
        },
      };
    },
    subscribeIntraop(scope, onEvent): LiveUpdateSubscription {
      ensureChannel();
      const id = nextId++;
      subscribers.set(id, { scope, onEvent });
      return { unsubscribe: () => { subscribers.delete(id); } };
    },
    subscribePrintJobs(onEvent): LiveUpdateSubscription {
      ensureChannel();
      const id = nextId++;
      printSubscribers.set(id, onEvent);
      return { unsubscribe: () => { printSubscribers.delete(id); } };
    },
    subscribeWsiScanBatches(onEvent): LiveUpdateSubscription {
      ensureChannel();
      const id = nextId++;
      wsiSubscribers.set(id, onEvent);
      return { unsubscribe: () => { wsiSubscribers.delete(id); } };
    },
    subscribeReportDeliveries(onEvent): LiveUpdateSubscription {
      ensureChannel();
      const id = nextId++;
      deliverySubscribers.set(id, onEvent);
      return { unsubscribe: () => { deliverySubscribers.delete(id); } };
    },
    // Batch 550: with no API server, exports are made in the browser and nothing sends ExportStatus.
    subscribeExports: (): LiveUpdateSubscription => ({ unsubscribe: () => {} }),
    // Batch 559: with no API server nothing sends DataChanged; the screens keep their own polling.
    subscribeData: (): LiveUpdateSubscription => ({ unsubscribe: () => {} }),
    getState: (): LiveConnectionState => 'local',
    onStateChange: () => () => {},
    onResync: () => () => {},
    retryNow: () => {},
    publish(change) {
      const event: IntraopChangedEvent = {
        ...change,
        v: LIVE_UPDATES_CONTRACT_VERSION,
        eventId: change.eventId ?? newEventId(),
        occurredAt: change.occurredAt ?? now().toISOString(),
      };
      deliver(event);
      try { ensureChannel()?.postMessage(event); } catch { /* another window may be closing */ }
      return event;
    },
    publishPrintJobStatus(result) {
      const event: PrintJobStatusEvent = {
        ...result,
        v: LIVE_UPDATES_CONTRACT_VERSION,
        eventId: result.eventId ?? newEventId(),
        occurredAt: result.occurredAt ?? now().toISOString(),
      };
      deliverPrint(event);
      // Other windows of this browser hear it too; only the one that sent
      // the job knows it and acts on it.
      try { ensureChannel()?.postMessage(event); } catch { /* another window may be closing */ }
      return event;
    },
    publishWsiScanBatchChange(change) {
      const event: WsiScanBatchChangedEvent = {
        ...change,
        v: LIVE_UPDATES_CONTRACT_VERSION,
        eventId: change.eventId ?? newEventId(),
        occurredAt: change.occurredAt ?? now().toISOString(),
      };
      deliverWsi(event);
      try { ensureChannel()?.postMessage(event); } catch { /* another window may be closing */ }
      return event;
    },
    publishReportDeliveryStatus(status) {
      const event: ReportDeliveryStatusEvent = {
        ...status,
        v: LIVE_UPDATES_CONTRACT_VERSION,
        eventId: status.eventId ?? newEventId(),
        occurredAt: status.occurredAt ?? now().toISOString(),
      };
      deliverDelivery(event);
      try { ensureChannel()?.postMessage(event); } catch { /* another window may be closing */ }
      return event;
    },
  };
}

/** The shared instance: the mock services publish to it, and `@/services`
 *  hands it to the screens when no hub is configured. */
export const localLiveUpdateService = createLocalLiveUpdateService();
