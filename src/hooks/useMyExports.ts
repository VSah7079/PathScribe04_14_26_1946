// src/hooks/useMyExports.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 550 (PS-539 phase 2d, D7): the "My exports" list. Reads the
// requester's exports from the API server, and re-reads when one of this
// window's notices changes. Download and Cancel go through the export
// service, which asks the server (it checks the capability again).
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { exportService } from '@/services';
import type { ExportJob } from '@/services/exports/asyncExportContract';
import { readyExportCount, type ExportProblem, type ExportTracker } from '@/services/exports/exportTracker';

export function useMyExports(tracker: ExportTracker = exportService) {
  const [jobs, setJobs] = useState<ExportJob[] | null>(null);
  const [problem, setProblem] = useState<ExportProblem | null>(null);
  /** The export a Download or Cancel just failed for, and why. */
  const [actionProblem, setActionProblem] = useState<{ exportId: string; problem: ExportProblem } | null>(null);

  /** Only the latest read is shown, so an earlier, slower answer never overwrites a newer one. */
  const latest = useRef(0);
  const reload = useCallback(async () => {
    const mine = ++latest.current;
    const res = await tracker.list();
    if (mine !== latest.current) return;
    if (res.ok) { setJobs(res.data); setProblem(null); } else { setProblem(res.problem); setJobs(prev => prev ?? []); }
  }, [tracker]);

  useEffect(() => {
    void reload();
    return tracker.subscribe(() => { void reload(); });
  }, [tracker, reload]);

  const download = useCallback(async (exportId: string) => {
    const r = await tracker.download(exportId);
    setActionProblem(r.ok ? null : { exportId, problem: r.problem });
    if (!r.ok) void reload();
  }, [tracker, reload]);

  const cancel = useCallback(async (exportId: string) => {
    const r = await tracker.cancel(exportId);
    setActionProblem(r.ok ? null : { exportId, problem: r.problem });
    void reload();
  }, [tracker, reload]);

  return { viaServer: tracker.viaServer, simulated: tracker.simulated, simulation: tracker.simulation, jobs, problem, actionProblem, reload, download, cancel };
}

/** Batch 550: for the top bar. Whether exports go through the API server, and how many of this window's are ready to download. */
export function useReadyExportCount(tracker: ExportTracker = exportService): { viaServer: boolean; ready: number } {
  const notices = useSyncExternalStore(tracker.subscribe, tracker.getSnapshot, tracker.getSnapshot);
  return { viaServer: tracker.viaServer, ready: readyExportCount(notices) };
}
