// src/hooks/useInterfaceEngines.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 554 (PS-539 phase 2d; INTERFACE_ENGINE_EDGE.md §9a): the interface
// engines' status for the Interfaces view, refreshed every minute (as often as
// the engines check in) with the API server. The rules (status, what needs
// attention, the order) are in services/interfaceMonitoring. Only the latest
// read is shown, so a slower earlier answer never overwrites a newer one.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { interfaceMonitoringService } from '@/services';
import type { IInterfaceMonitoringService } from '@/services/interfaceMonitoring/interfaceMonitoringService';
import { engineCounts, engineViews, type EngineView, type InterfaceEnginesResponse, type InterfaceMonitoringError } from '@/services/interfaceMonitoring/interfaceMonitoringContract';
import { useLiveData } from './useLiveData';

export function useInterfaceEngines(service: IInterfaceMonitoringService = interfaceMonitoringService, enabled = true) {
  const [data, setData] = useState<InterfaceEnginesResponse | null>(null);
  const [problem, setProblem] = useState<InterfaceMonitoringError | null>(null);
  const latest = useRef(0);

  const reload = useCallback(async () => {
    if (!service.viaServer || !enabled) return;
    const mine = ++latest.current;
    try {
      const r = await service.engines();
      if (mine !== latest.current) return;
      if (r.ok) { setData(r.data); setProblem(null); } else {
        setProblem(r.error);
        // No longer allowed, or signed out: what was shown goes too. A failed read keeps it, with the problem shown.
        if (r.error !== 'UNAVAILABLE') setData(null);
      }
    } catch {
      if (mine === latest.current) setProblem('UNAVAILABLE');
    }
  }, [service, enabled]);

  useEffect(() => {
    if (!service.viaServer || !enabled) return;
    void reload();
    return () => { latest.current += 1; };
  }, [reload, service, enabled]);
  // Every minute, not while the browser tab is hidden (read again as soon as it's shown). Batch 560:
  // and at once when the live-update hub says an engine changed (topic `interfaceEngines`).
  useLiveData(reload, { topic: 'interfaceEngines', pollMs: 60_000, enabled: service.viaServer && enabled, pauseWhenHidden: true });

  const views: EngineView[] | null = useMemo(() => (data ? engineViews(data) : null), [data]);
  const counts = useMemo(() => (views ? engineCounts(views) : null), [views]);
  return { viaServer: service.viaServer, simulated: !!service.simulated, views, counts, serverTime: data?.serverTime ?? null, problem, reload };
}
