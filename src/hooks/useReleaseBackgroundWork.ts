// src/hooks/useReleaseBackgroundWork.ts
// Batch 534 (Pete, Oct 12, 2026): while PathScribe is open on any screen, reports held for the
// release delay go out when it ends, including a surgical sign-out whose page nobody has open
// (services/reportRelease/releaseReportDeps.ts). Mounted once, by the app shell. The decisions
// are in the service. With the API server, the server releases them on its own schedule (PS-539).
import { useEffect } from 'react';
import { browserRunsServerJob } from '@/services/serverJobs/browserStandIns';

export function useReleaseBackgroundWork(enabled: boolean): void {
  useEffect(() => {
    // Batch 555: once the API server runs this job (VITE_SERVER_JOBS), never the browser too.
    if (!enabled || !browserRunsServerJob('release.dueSweep')) return;
    let stop = () => {};
    let cancelled = false;
    void import('@/services/reportRelease/releaseReportDeps').then(m => {
      if (!cancelled) stop = m.startReleaseBackgroundWork();
    });
    return () => { cancelled = true; stop(); };
  }, [enabled]);
}
