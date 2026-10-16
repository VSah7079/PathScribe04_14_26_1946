// src/pages/CytologyWorklistPage/hooks/useCytologyWorkloadSummary.ts
// Batch 574 (Pete, Oct 15, 2026): the signed-in person's reviews and slides over the last 24 hours, and what is
// left, for the always-visible counter on the Cytology worklist and the screening page. Read again when
// `refreshKey` changes (after each saved review), every minute (older reviews leave the 24-hour window) and
// when the window is shown again. `extraSeconds`: the review open now (the screening page's timer), read at
// each refresh. Orchestration only: services/cytology/cytologyWorkloadSummary.ts.
import { useEffect, useRef, useState } from 'react';
import { cytologyWorkloadSummaryDeps } from '@/services/cytology/cytologyWorkloadSummaryDeps';
import { loadCytologyWorkloadSummary, type CytologyWorkloadScope, type CytologyWorkloadSummary } from '@/services/cytology/cytologyWorkloadSummary';

export const WORKLOAD_SUMMARY_REFRESH_MS = 60_000;

export function useCytologyWorkloadSummary(
  userId: string | null | undefined,
  scope: CytologyWorkloadScope,
  enabled: boolean,
  options: { refreshKey?: number; extraSeconds?: () => number; nextReviewWeight?: number } = {},
): CytologyWorkloadSummary | null {
  const [summary, setSummary] = useState<CytologyWorkloadSummary | null>(null);
  const extra = useRef(options.extraSeconds);
  extra.current = options.extraSeconds;
  const { facilityId, jurisdiction } = scope;
  const { refreshKey = 0, nextReviewWeight } = options;
  useEffect(() => {
    if (!userId || !enabled) { setSummary(null); return; }
    let live = true;
    const read = () => {
      loadCytologyWorkloadSummary(userId, { facilityId, jurisdiction }, cytologyWorkloadSummaryDeps, extra.current?.() ?? 0, nextReviewWeight)
        .then(s => { if (live) setSummary(s); })
        .catch(() => { if (live) setSummary(null); });
    };
    read();
    const timer = setInterval(read, WORKLOAD_SUMMARY_REFRESH_MS);
    const onShow = () => { if (document.visibilityState === 'visible') read(); };
    document.addEventListener('visibilitychange', onShow);
    return () => { live = false; clearInterval(timer); document.removeEventListener('visibilitychange', onShow); };
  }, [userId, facilityId, jurisdiction, enabled, refreshKey, nextReviewWeight]);
  return summary;
}
