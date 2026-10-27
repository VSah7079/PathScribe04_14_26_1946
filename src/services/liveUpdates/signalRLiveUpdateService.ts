// src/services/liveUpdates/signalRLiveUpdateService.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-262: live updates from the PathScribe API server's SignalR hub
// (ASP.NET Core; see docs/architecture/LIVE_UPDATES_SIGNALR.md).
//
//   • One connection per browser window, opened on the first subscription
//     and closed a moment after the last one goes (CLOSE_GRACE_MS), so
//     moving between the board and the queue, or React re-mounting a
//     screen, reuses the connection instead of renegotiating.
//   • The window's subscriptions are combined into one scope and sent with
//     SetIntraopScope, again after every reconnection (SignalR forgets
//     group membership when a connection drops).
//   • It never gives up: SignalR's automatic reconnect uses
//     nextRetryDelayMs, which always returns a delay, and a failed first
//     start or a closed connection is retried on the same schedule. A wall
//     display left running for days recovers on its own.
//   • After each (re)connection subscribers are asked to re-read (onResync),
//     since changes made while disconnected were never delivered.
//   • Batch 347 (PS-54): network print results (PrintJobStatus) use the same
//     connection. They are sent to the user, not a scope, so a print-result
//     subscriber keeps the connection open without changing SetIntraopScope.
// The connection is built through `buildConnection` so tests use a fake.
// ─────────────────────────────────────────────────────────────────────────────

import { HubConnectionBuilder, LogLevel, type IRetryPolicy } from '@microsoft/signalr';
import {
  HUB_DATA_CHANGED, HUB_SET_DATA_TOPICS, parseDataChangedEvent,
  HUB_EXPORT_STATUS, HUB_INTRAOP_CHANGED, HUB_PRINT_JOB_STATUS, HUB_REPORT_DELIVERY_STATUS, HUB_SET_INTRAOP_SCOPE, HUB_WSI_SCAN_BATCH_CHANGED, parseExportStatusEvent, parseIntraopChangedEvent, parsePrintJobStatusEvent, parseReportDeliveryStatusEvent, parseWsiScanBatchChangedEvent,
  type IntraopChangedEvent, type IntraopScope, type PrintJobStatusEvent, type ReportDeliveryStatusEvent, type SetIntraopScopeResult, type WsiScanBatchChangedEvent,
} from './liveUpdateContract';
import type { ExportStatusEvent } from '../exports/asyncExportContract';
import { combineDataScopes, dataEventMatches, dataScopeKey, dataSubscriptionAccepted, type DataChangedEvent, type DataTopicSubscription, type SetDataTopicsResult } from './dataTopics';
import {
  combineScopes, createDuplicateFilter, eventMatchesScope, nextRetryDelayMs, sameScope,
  type LiveConnectionState,
} from './liveUpdatePolicy';
import type { ILiveUpdateService, LiveUpdateSubscription } from './ILiveUpdateService';
import {
  HUB_CASE_PRESENCE_CHANGED, HUB_JOIN_CASE_PRESENCE, HUB_LEAVE_CASE_PRESENCE, HUB_SET_CASE_PRESENCE_EDITING,
  parseCasePresenceChangedEvent, parseCasePresenceViewers, type CasePresenceJoin, type CasePresenceJoinResult, type CasePresenceListener, type CasePresenceViewer,
} from './casePresence';

/** The parts of @microsoft/signalr's HubConnection this uses. */
export interface HubConnectionLike {
  start(): Promise<void>;
  stop(): Promise<void>;
  on(method: string, handler: (...args: unknown[]) => void): void;
  invoke<T = unknown>(method: string, ...args: unknown[]): Promise<T>;
  onreconnecting(callback: (error?: Error) => void): void;
  onreconnected(callback: (connectionId?: string) => void): void;
  onclose(callback: (error?: Error) => void): void;
}

export interface SignalRLiveUpdateDeps {
  hubUrl: string;
  /** Bearer token for the hub (a user's session, or an OR terminal's device token). */
  accessTokenFactory?: () => string | Promise<string>;
  buildConnection?: (hubUrl: string, retryPolicy: IRetryPolicy, accessTokenFactory?: () => string | Promise<string>, logLevel?: LogLevel) => HubConnectionLike;
  /** SignalR's own console logging (default: warnings). */
  logLevel?: LogLevel;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  random?: () => number;
  log?: (message: string, detail?: unknown) => void;
}

/**
 * Batch 655 (Pete, Oct 23, 2026: no access tokens in URLs; the Oct 3 decision, PS-345, says cookie only). A browser
 * WebSocket cannot send an Authorization header, so SignalR's accessTokenFactory puts the token in the URL query
 * string (`?access_token=`), where it lands in server logs and proxies. The connection therefore sends the browser's
 * own HttpOnly session cookie (`withCredentials`) and never a token. Only a factory handed in explicitly (a device
 * token for a terminal, when device tokens exist) is used.
 */
export function hubConnectionOptions(accessTokenFactory?: () => string | Promise<string>): { withCredentials: true; accessTokenFactory?: () => string | Promise<string> } {
  return accessTokenFactory ? { withCredentials: true, accessTokenFactory } : { withCredentials: true };
}

export const defaultBuildConnection: NonNullable<SignalRLiveUpdateDeps['buildConnection']> = (hubUrl, retryPolicy, accessTokenFactory, logLevel = LogLevel.Warning) =>
  new HubConnectionBuilder()
    .withUrl(hubUrl, hubConnectionOptions(accessTokenFactory))
    .withAutomaticReconnect(retryPolicy)
    .configureLogging(logLevel)
    .build() as unknown as HubConnectionLike;

export const CLOSE_GRACE_MS = 1_000;

export function createSignalRLiveUpdateService(deps: SignalRLiveUpdateDeps): ILiveUpdateService {
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? (h => clearTimeout(h as ReturnType<typeof setTimeout>));
  const random = deps.random ?? Math.random;
  const log = deps.log ?? ((m, d) => console.warn(`[liveUpdates] ${m}`, d ?? ''));
  const retryPolicy: IRetryPolicy = { nextRetryDelayInMilliseconds: ctx => nextRetryDelayMs(ctx.previousRetryCount, random) };

  const subscribers = new Map<number, { scope: IntraopScope; onEvent: (e: IntraopChangedEvent) => void }>();
  const printSubscribers = new Map<number, (e: PrintJobStatusEvent) => void>();
  const wsiSubscribers = new Map<number, (e: WsiScanBatchChangedEvent) => void>();
  const deliverySubscribers = new Map<number, (e: ReportDeliveryStatusEvent) => void>();
  const exportSubscribers = new Map<number, (e: ExportStatusEvent) => void>();
  /** Batch 559: screens waiting on a data topic (dataTopics.ts). */
  const dataSubscribers = new Map<number, { sub: DataTopicSubscription; onEvent: (e: DataChangedEvent) => void; onAccepted?: (accepted: boolean) => void }>();
  /** Batch 560: tells each data subscriber whether the hub took its topic (false while not known). */
  const tellAccepted = (result: unknown) => {
    for (const d of [...dataSubscribers.values()]) {
      try { d.onAccepted?.(result === null ? false : dataSubscriptionAccepted(result, d.sub)); } catch (e) { log('data subscriber failed', e); }
    }
  };
  /**
   * Batch 573: the case reports open in this window, and who else has each one open (§15). `sent` is the
   * editing value the hub last heard (null: no join answered on this connection yet); `listedAs` is the id
   * the hub lists this presence under.
   */
  interface Presence {
    join: CasePresenceJoin; onChange: CasePresenceListener; accepted: boolean; joining: boolean;
    sent: boolean | null; listedAs: string; retries: number; retryTimer: unknown;
  }
  const presences = new Map<number, Presence>();
  const tellPresence = (p: Presence, viewers: CasePresenceViewer[]) => {
    try { p.onChange(viewers, p.listedAs); } catch (e) { log('presence subscriber failed', e); }
  };
  /** The hub has the presence (or may have: a join went out): leaving must tell it. */
  const sendLeave = (join: CasePresenceJoin) => {
    if (!connection || state !== 'live') return;
    connection.invoke(HUB_LEAVE_CASE_PRESENCE, join.ref, join.presenceId).catch(e => log('LeaveCasePresence failed', e));
  };
  /** Brings the hub up to date with the editing flag (it may have changed while a join was on its way). */
  const syncEditing = (p: Presence) => {
    if (!connection || state !== 'live' || !p.accepted || p.sent === p.join.editing) return;
    const editing = p.join.editing;
    p.sent = editing;
    connection.invoke(HUB_SET_CASE_PRESENCE_EDITING, p.join.ref, p.join.presenceId, editing).catch(e => { p.sent = null; log('SetCasePresenceEditing failed', e); });
  };
  const subscriberCount = () => subscribers.size + printSubscribers.size + wsiSubscribers.size + deliverySubscribers.size + exportSubscribers.size + dataSubscribers.size + presences.size;
  const stateListeners = new Set<(s: LiveConnectionState) => void>();
  const resyncListeners = new Set<() => void>();
  const isNew = createDuplicateFilter();
  let nextId = 1;
  let state: LiveConnectionState = 'idle';
  let connection: HubConnectionLike | null = null;
  let sentScope: IntraopScope | null = null;
  /** The data scope last accepted by the hub on this connection (its key), or null when not known. */
  let sentDataKey: string | null = null;
  /** Whether this connection may be in some data topic group (so an empty scope must be sent to leave). */
  let dataJoined = false;
  let dataSending = false;
  let dataRetryTimer: unknown = null;
  let dataRetries = 0;
  /** The hub's last answer to SetDataTopics on this connection, or null when not known. */
  let lastDataResult: unknown = null;
  let restartTimer: unknown = null;
  let restartAttempts = 0;
  let stopping = false;
  let closeTimer: unknown = null;
  /** Batch 549: retryNow() stopped a connection that was reconnecting; start it again at once when it closes. */
  let restartWhenClosed = false;

  const setState = (next: LiveConnectionState) => {
    if (next === state) return;
    state = next;
    for (const l of [...stateListeners]) l(next);
  };
  const resync = () => { for (const l of [...resyncListeners]) l(); };

  const currentScope = () => combineScopes([...subscribers.values()].map(s => s.scope));

  const pushScope = async (force = false) => {
    if (!connection || state !== 'live') return;
    // A connection open only for print results (or scan batches) has no intraop scope to send.
    if (!sentScope && subscribers.size === 0) return;
    const scope = currentScope();
    if (!force && sentScope && sameScope(scope, sentScope)) return;
    sentScope = scope;
    try {
      const result = await connection.invoke<SetIntraopScopeResult>(HUB_SET_INTRAOP_SCOPE, scope);
      if (result?.rejectedLocationIds?.length) log('the hub refused some locations for this connection', result.rejectedLocationIds);
    } catch (e) {
      sentScope = null; // try again with the next change or reconnection
      log('SetIntraopScope failed', e);
    }
  };

  /**
   * Batch 559: sends the union of the data subscriptions whenever it differs from what this connection
   * last had accepted. One send at a time; after each, it checks again (a screen may have come or gone
   * meanwhile). A failed send is retried on the reconnect back-off schedule while connected.
   */
  const pushDataScope = async () => {
    if (!connection || state !== 'live' || dataSending) return;
    const scope = combineDataScopes([...dataSubscribers.values()].map(d => d.sub));
    const key = dataScopeKey(scope);
    // A connection that has joined nothing has nothing to clear.
    const current = sentDataKey ?? (dataJoined ? null : '');
    // Unchanged (a second screen on a topic already sent, say): the last answer still applies.
    if (key === current) { if (key) tellAccepted(lastDataResult); return; }
    dataSending = true;
    let failed = false;
    try {
      const result = await connection.invoke<SetDataTopicsResult>(HUB_SET_DATA_TOPICS, scope);
      sentDataKey = key;
      dataJoined = key !== '';
      dataRetries = 0;
      const rejected = result && Array.isArray(result.rejected) ? result.rejected : [];
      if (rejected.length) log('the hub refused some data topics for this connection', rejected);
      // Only if nothing changed meanwhile (otherwise the next send answers for the new set).
      lastDataResult = result ?? null;
      if (dataScopeKey(combineDataScopes([...dataSubscribers.values()].map(d => d.sub))) === key) tellAccepted(lastDataResult);
    } catch (e) {
      failed = true;
      sentDataKey = null;
      dataJoined = dataJoined || key !== ''; // it may have been applied in part
      lastDataResult = null;
      tellAccepted(null);
      log('SetDataTopics failed', e);
    } finally {
      dataSending = false;
    }
    if (failed) {
      if (!dataRetryTimer) dataRetryTimer = setTimer(() => { dataRetryTimer = null; void pushDataScope(); }, nextRetryDelayMs(dataRetries++, random) || 500);
      return;
    }
    void pushDataScope();
  };
  /** The hub forgets groups when a connection drops: start again from nothing joined. */
  const resetDataScope = () => {
    lastDataResult = null;
    tellAccepted(null);
    sentDataKey = null;
    dataJoined = false;
    dataRetries = 0;
    if (dataRetryTimer) { clearTimer(dataRetryTimer); dataRetryTimer = null; }
  };

  /** Batch 573: joins (or joins again, after a reconnection) one open case's presence. */
  const joinPresence = async (id: number) => {
    const p = presences.get(id);
    if (!p || !connection || state !== 'live' || p.joining) return;
    p.joining = true;
    const sentJoin = { ...p.join };
    try {
      const result = await connection.invoke<CasePresenceJoinResult>(HUB_JOIN_CASE_PRESENCE, sentJoin);
      p.joining = false;
      // Left while the join was on its way: the hub has it now, so take it back.
      if (presences.get(id) !== p) { if (result?.accepted) sendLeave(sentJoin); return; }
      p.retries = 0;
      p.accepted = !!result?.accepted;
      p.sent = p.accepted ? sentJoin.editing : null;
      p.listedAs = typeof result?.presenceId === 'string' && result.presenceId ? result.presenceId : sentJoin.presenceId;
      tellPresence(p, p.accepted ? parseCasePresenceViewers(result?.viewers) : []);
      if (!p.accepted) { log('the hub refused presence for a case on this connection'); return; }
      syncEditing(p);
    } catch (e) {
      p.joining = false;
      log('JoinCasePresence failed', e);
      if (presences.get(id) !== p) { sendLeave(sentJoin); return; }
      // Try again on the reconnect back-off while connected (a reconnection joins again anyway).
      if (!p.retryTimer) p.retryTimer = setTimer(() => { p.retryTimer = null; void joinPresence(id); }, nextRetryDelayMs(p.retries++, random) || 500);
    }
  };
  /** Not connected: show nobody rather than a list that may be out of date. */
  const clearPresences = () => {
    for (const p of [...presences.values()]) {
      p.accepted = false; p.sent = null; p.joining = false;
      if (p.retryTimer) { clearTimer(p.retryTimer); p.retryTimer = null; }
      tellPresence(p, []);
    }
  };

  const onConnected = async () => {
    restartAttempts = 0;
    setState('live');
    await Promise.all([pushScope(true), pushDataScope(), ...[...presences.keys()].map(joinPresence)]);
    resync();
  };

  const scheduleRestart = () => {
    if (stopping || subscriberCount() === 0 || restartTimer) return;
    setState('offline');
    const delay = nextRetryDelayMs(restartAttempts++, random);
    restartTimer = setTimer(() => { restartTimer = null; void start(); }, delay);
  };

  const start = async () => {
    if (!connection || stopping) return;
    try {
      await connection.start();
      await onConnected();
    } catch (e) {
      log('could not connect to the live-update hub; retrying', e);
      scheduleRestart();
    }
  };

  const open = () => {
    stopping = false;
    connection = (deps.buildConnection ?? defaultBuildConnection)(deps.hubUrl, retryPolicy, deps.accessTokenFactory, deps.logLevel);
    connection.on(HUB_INTRAOP_CHANGED, (raw: unknown) => {
      const event = parseIntraopChangedEvent(raw);
      if (!event || !isNew(event.eventId)) return;
      for (const s of [...subscribers.values()]) {
        if (!eventMatchesScope(event, s.scope)) continue;
        try { s.onEvent(event); } catch (e) { log('subscriber failed', e); }
      }
    });
    connection.on(HUB_PRINT_JOB_STATUS, (raw: unknown) => {
      const event = parsePrintJobStatusEvent(raw);
      if (!event || !isNew(event.eventId)) return;
      for (const onEvent of [...printSubscribers.values()]) {
        try { onEvent(event); } catch (e) { log('print-result subscriber failed', e); }
      }
    });
    connection.on(HUB_WSI_SCAN_BATCH_CHANGED, (raw: unknown) => {
      const event = parseWsiScanBatchChangedEvent(raw);
      if (!event || !isNew(event.eventId)) return;
      for (const onEvent of [...wsiSubscribers.values()]) {
        try { onEvent(event); } catch (e) { log('scan-batch subscriber failed', e); }
      }
    });
    connection.on(HUB_REPORT_DELIVERY_STATUS, (raw: unknown) => {
      const event = parseReportDeliveryStatusEvent(raw);
      if (!event || !isNew(event.eventId)) return;
      for (const onEvent of [...deliverySubscribers.values()]) {
        try { onEvent(event); } catch (e) { log('report-delivery subscriber failed', e); }
      }
    });
    connection.on(HUB_EXPORT_STATUS, (raw: unknown) => {
      const event = parseExportStatusEvent(raw);
      if (!event || !isNew(event.eventId)) return;
      for (const onEvent of [...exportSubscribers.values()]) {
        try { onEvent(event); } catch (e) { log('export subscriber failed', e); }
      }
    });
    connection.on(HUB_DATA_CHANGED, (raw: unknown) => {
      const event = parseDataChangedEvent(raw);
      if (!event || !isNew(event.eventId)) return;
      for (const d of [...dataSubscribers.values()]) {
        if (!dataEventMatches(event, d.sub)) continue;
        try { d.onEvent(event); } catch (e) { log('data subscriber failed', e); }
      }
    });
    connection.on(HUB_CASE_PRESENCE_CHANGED, (raw: unknown) => {
      const event = parseCasePresenceChangedEvent(raw);
      if (!event) return;
      for (const p of [...presences.values()]) if (p.accepted && p.join.ref === event.ref) tellPresence(p, event.viewers);
    });
    connection.onreconnecting(() => { sentScope = null; resetDataScope(); clearPresences(); setState('reconnecting'); });
    connection.onreconnected(() => { void onConnected(); });
    connection.onclose(() => {
      sentScope = null;
      resetDataScope();
      clearPresences();
      if (stopping) return;
      if (restartWhenClosed) { restartWhenClosed = false; restartAttempts = 0; void start(); return; }
      scheduleRestart();
    });
    setState('connecting');
    void start();
  };

  const close = () => {
    stopping = true;
    if (restartTimer) { clearTimer(restartTimer); restartTimer = null; }
    const c = connection;
    connection = null;
    sentScope = null;
    resetDataScope();
    restartAttempts = 0;
    setState('idle');
    if (c) c.stop().catch(() => {});
  };

  /** Closes the connection a moment after the last subscriber of either kind goes. */
  const closeSoonIfUnused = () => {
    if (subscriberCount() > 0 || closeTimer) return;
    closeTimer = setTimer(() => { closeTimer = null; if (subscriberCount() === 0) close(); }, CLOSE_GRACE_MS);
  };
  const ensureOpen = () => {
    if (closeTimer) { clearTimer(closeTimer); closeTimer = null; }
    if (!connection) { open(); return false; }
    return true;
  };

  return {
    transport: 'signalr',
    subscribeIntraop(scope, onEvent): LiveUpdateSubscription {
      const id = nextId++;
      subscribers.set(id, { scope, onEvent });
      if (ensureOpen()) void pushScope();
      return {
        unsubscribe: () => {
          if (!subscribers.delete(id)) return;
          if (subscriberCount() > 0) { void pushScope(); return; }
          closeSoonIfUnused();
        },
      };
    },
    subscribePrintJobs(onEvent): LiveUpdateSubscription {
      const id = nextId++;
      printSubscribers.set(id, onEvent);
      ensureOpen();
      return {
        unsubscribe: () => {
          if (!printSubscribers.delete(id)) return;
          closeSoonIfUnused();
        },
      };
    },
    subscribeWsiScanBatches(onEvent): LiveUpdateSubscription {
      const id = nextId++;
      wsiSubscribers.set(id, onEvent);
      ensureOpen();
      return {
        unsubscribe: () => {
          if (!wsiSubscribers.delete(id)) return;
          closeSoonIfUnused();
        },
      };
    },
    subscribeReportDeliveries(onEvent): LiveUpdateSubscription {
      const id = nextId++;
      deliverySubscribers.set(id, onEvent);
      ensureOpen();
      return {
        unsubscribe: () => {
          if (!deliverySubscribers.delete(id)) return;
          closeSoonIfUnused();
        },
      };
    },
    subscribeExports(onEvent): LiveUpdateSubscription {
      const id = nextId++;
      exportSubscribers.set(id, onEvent);
      ensureOpen();
      return {
        unsubscribe: () => {
          if (!exportSubscribers.delete(id)) return;
          closeSoonIfUnused();
        },
      };
    },
    subscribeData(sub, onEvent, onAccepted): LiveUpdateSubscription {
      const id = nextId++;
      dataSubscribers.set(id, { sub: { topic: sub.topic, ...(sub.keys ? { keys: [...sub.keys] } : {}) }, onEvent, onAccepted });
      if (ensureOpen()) void pushDataScope();
      return {
        unsubscribe: () => {
          if (!dataSubscribers.delete(id)) return;
          // Leave the topic even if the connection is about to close: another screen may keep it open.
          void pushDataScope();
          closeSoonIfUnused();
        },
      };
    },
    joinCasePresence(join, onChange) {
      const id = nextId++;
      const p: Presence = {
        join: { ref: join.ref, presenceId: join.presenceId, editing: join.editing }, onChange,
        accepted: false, joining: false, sent: null, listedAs: join.presenceId, retries: 0, retryTimer: null,
      };
      presences.set(id, p);
      if (ensureOpen()) void joinPresence(id);
      return {
        setEditing: (editing: boolean) => {
          if (presences.get(id) !== p || p.join.editing === editing) return;
          p.join.editing = editing;
          syncEditing(p); // or, while the join is on its way, once it is answered
        },
        leave: () => {
          if (!presences.delete(id)) return;
          if (p.retryTimer) { clearTimer(p.retryTimer); p.retryTimer = null; }
          // A join still on its way is taken back when it is answered (joinPresence).
          if (p.accepted) sendLeave(p.join);
          closeSoonIfUnused();
        },
      };
    },
    getState: () => state,
    onStateChange(listener) { stateListeners.add(listener); return () => { stateListeners.delete(listener); }; },
    onResync(listener) { resyncListeners.add(listener); return () => { resyncListeners.delete(listener); }; },
    /**
     * Batch 549: the network is back, so try now. A restart waiting out its
     * back-off starts at once. A connection in SignalR's own reconnect loop
     * (which never gives up, so it doesn't close) is stopped and started
     * again, instead of waiting for the loop's next attempt.
     */
    retryNow() {
      if (stopping || !connection) return;
      if (restartTimer) {
        clearTimer(restartTimer);
        restartTimer = null;
        restartAttempts = 0;
        void start();
        return;
      }
      if (state === 'reconnecting' && !restartWhenClosed) {
        restartWhenClosed = true;
        connection.stop().catch(() => { restartWhenClosed = false; });
      }
    },
  };
}
