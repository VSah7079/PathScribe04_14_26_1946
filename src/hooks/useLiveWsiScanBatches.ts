// src/hooks/useLiveWsiScanBatches.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 434: keeps the Slide scanning page current. When a scan batch
// changes (the scanner reports a slide, another tech loads or unloads), it
// calls `onChange` (the page's own re-read), bursts coalesced into one call,
// and again after every reconnection. Like useLiveIntraopUpdates it also
// polls: every 15 s without a live connection, every 60 s while live.
// Returns the connection state for the status badge.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { liveUpdateService } from '@/services';
import type { ILiveUpdateService } from '@/services/liveUpdates/ILiveUpdateService';
import { COALESCE_MS, fallbackPollIntervalMs, type LiveConnectionState } from '@/services/liveUpdates/liveUpdatePolicy';

export function useLiveWsiScanBatches(onChange: () => void, service: ILiveUpdateService = liveUpdateService): LiveConnectionState {
  const [state, setState] = useState<LiveConnectionState>(() => service.getState());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const changed = () => {
      if (timer) return;
      timer = setTimeout(() => { timer = null; onChangeRef.current(); }, COALESCE_MS);
    };
    const subscription = service.subscribeWsiScanBatches(changed);
    const offState = service.onStateChange(setState);
    const offResync = service.onResync(changed);
    setState(service.getState());
    return () => {
      subscription.unsubscribe();
      offState();
      offResync();
      if (timer) clearTimeout(timer);
    };
  }, [service]);

  useEffect(() => {
    const poll = setInterval(() => onChangeRef.current(), fallbackPollIntervalMs(state));
    return () => clearInterval(poll);
  }, [state]);

  return state;
}
