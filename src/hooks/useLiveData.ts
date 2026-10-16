// src/hooks/useLiveData.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 560 (PS-539 phase 2d; readiness review §5, "Push, not polling"): keeps
// a screen that used to re-read on a timer current from the live-update hub's
// DataChanged events (services/liveUpdates/dataTopics.ts;
// LIVE_UPDATES_SIGNALR.md §14).
//
//   - On an event for the screen's topic (and key), it calls `refresh`.
//     Events close together become one read; a screen reads at most once a
//     second, one read at a time, after a short random wait so a whole
//     organisation's screens don't read at the same instant.
//   - After a reconnection it reads again (events may have been missed); not
//     for the first connection, which the screen's own first read covers.
//   - It still polls: at the screen's own interval unless the hub has taken
//     this topic on a live connection, and then only as a safety net (every
//     minute, or the screen's own interval if that is longer).
//   - Only a signed-in (SSO) session subscribes: password and demo sessions
//     and wall boards without a user stay on polling (§14), so they never
//     hold a connection the hub would refuse.
//   - `pauseWhenHidden`: no timed read while the browser tab is hidden, and
//     one as soon as it is shown again.
//
// The screen does its own first read; this replaces only its timer.
// `enabled: false` does nothing at all. A `topic` of null, or a keyed topic
// without its key, only polls. `pollMs: null` (Batch 562): events only.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
// The transport module itself, not the barrel: screens whose tests replace `@/services` keep working.
import { liveUpdateService } from '@/services/liveUpdates/liveUpdateService';
import { getAccessToken } from '@/services/auth/accessTokenSource';
import type { ILiveUpdateService } from '@/services/liveUpdates/ILiveUpdateService';
import { COALESCE_MS, LIVE_SAFETY_POLL_MS, type LiveConnectionState } from '@/services/liveUpdates/liveUpdatePolicy';
import { DATA_READ_MIN_GAP_MS, dataPollIntervalMs, dataReadDelayMs, isKeyedDataTopic, type DataTopic } from '@/services/liveUpdates/dataTopics';

export interface UseLiveDataOptions {
  topic: DataTopic | null;
  /** For a keyed topic: the facility or site. */
  dataKey?: string | null;
  /** Batch 562: several keys (the Print Queue's agent line follows every site it counts). Used with `dataKey`. */
  dataKeys?: readonly string[];
  /**
   * The interval the screen polled at before; still used without a live connection. Batch 562: null for a
   * screen that never polled (it reads on open and after its own actions): events only, no timed reads.
   */
  pollMs: number | null;
  enabled?: boolean;
  pauseWhenHidden?: boolean;
  service?: ILiveUpdateService;
  /** Whether a signed-in (SSO) user can use the hub; by default, whether there is an access token. */
  signedIn?: () => Promise<boolean>;
}

const isHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';
const hasToken = async () => !!(await getAccessToken());
/** A resync this soon after subscribing is the first connection; the screen's own first read covers it. */
const FIRST_CONNECT_MS = 5_000;

export interface LiveDataStatus {
  state: LiveConnectionState;
  /** True while the hub has taken this screen's topic on a live connection, so changes arrive as they happen. */
  live: boolean;
}

export function useLiveData(refresh: () => void | Promise<void>, options: UseLiveDataOptions): LiveDataStatus {
  const { topic, dataKey, dataKeys, pollMs, enabled = true, pauseWhenHidden = false, service = liveUpdateService, signedIn = hasToken } = options;
  const [state, setState] = useState<LiveConnectionState>('idle');
  const [accepted, setAccepted] = useState(false);
  const [mayUseHub, setMayUseHub] = useState(service.transport !== 'signalr');

  // One read at a time; a request meanwhile runs once after it.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const reader = useRef({ running: false, again: false, lastStart: 0 });
  const read = () => {
    const r = reader.current;
    if (r.running) { r.again = true; return; }
    r.running = true;
    r.lastStart = Date.now();
    void Promise.resolve().then(() => refreshRef.current()).catch(() => undefined).finally(() => {
      r.running = false;
      if (r.again) { r.again = false; read(); }
    });
  };

  const keys = topic && isKeyedDataTopic(topic)
    ? [...new Set([dataKey, ...(dataKeys ?? [])].map(k => k?.trim() ?? '').filter(Boolean))].sort()
    : [];
  const keysText = JSON.stringify(keys);
  const wantsHub = enabled && !!topic && (!isKeyedDataTopic(topic) || keys.length > 0);

  useEffect(() => {
    if (!wantsHub || service.transport !== 'signalr') { setMayUseHub(service.transport !== 'signalr'); return; }
    let cancelled = false;
    signedIn().then(ok => { if (!cancelled) setMayUseHub(ok); }).catch(() => { if (!cancelled) setMayUseHub(false); });
    return () => { cancelled = true; };
  }, [wantsHub, service, signedIn]);

  const subscribable = wantsHub && mayUseHub;

  useEffect(() => {
    if (!subscribable || !topic) { setAccepted(false); setState('idle'); return; }
    const subscribedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const changed = () => {
      if (timer) return;
      const fire = () => {
        // A timed read may have run meanwhile: keep the second between reads.
        const sinceLast = Date.now() - reader.current.lastStart;
        if (sinceLast < DATA_READ_MIN_GAP_MS) { timer = setTimeout(fire, DATA_READ_MIN_GAP_MS - sinceLast); return; }
        timer = null;
        if (pauseWhenHidden && isHidden()) return; // read when shown instead
        read();
      };
      timer = setTimeout(fire, dataReadDelayMs(Date.now() - reader.current.lastStart, COALESCE_MS));
    };
    const resynced = () => { if (Date.now() - subscribedAt > FIRST_CONNECT_MS) changed(); };
    const subscription = service.subscribeData({ topic, ...(keys.length ? { keys } : {}) }, changed, setAccepted);
    const offState = service.onStateChange(setState);
    const offResync = service.onResync(resynced);
    setState(service.getState());
    return () => {
      subscription.unsubscribe();
      offState();
      offResync();
      setAccepted(false);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `read` reads the latest refresh through a ref
  }, [service, subscribable, topic, keysText, pauseWhenHidden]);

  const live = subscribable && state === 'live' && accepted;
  useEffect(() => {
    if (!enabled || pollMs === null) return;
    // Batch 561: the next timed read is due one interval after the last read of any kind, so a connection
    // that keeps dropping and coming back (changing the interval each time) never keeps putting it off.
    const intervalMs = dataPollIntervalMs(live, pollMs, LIVE_SAFETY_POLL_MS);
    if (!reader.current.lastStart) reader.current.lastStart = Date.now(); // the screen's own first read
    let poll: ReturnType<typeof setTimeout>;
    const schedule = () => {
      // At least a second, so a read still running (it runs again after) never makes this spin.
      const wait = Math.max(1_000, reader.current.lastStart + intervalMs - Date.now());
      poll = setTimeout(() => {
        // A read still running counts as this one (it would otherwise run again straight after).
        if (!reader.current.running && Date.now() - reader.current.lastStart >= intervalMs && !(pauseWhenHidden && isHidden())) read();
        // Hidden: not now; the next check is a full interval on, and showing the tab reads at once.
        if (pauseWhenHidden && isHidden()) reader.current.lastStart = Date.now();
        schedule();
      }, wait);
    };
    schedule();
    const onShow = () => { if (!isHidden()) read(); };
    if (pauseWhenHidden && typeof document !== 'undefined') document.addEventListener('visibilitychange', onShow);
    return () => {
      clearTimeout(poll);
      if (pauseWhenHidden && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onShow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `read` reads the latest refresh through a ref
  }, [enabled, live, pollMs, pauseWhenHidden]);

  return { state: subscribable ? state : 'idle', live };
}
