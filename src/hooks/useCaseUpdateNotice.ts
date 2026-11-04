// src/hooks/useCaseUpdateNotice.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 572 (Pete, Oct 14, 2026): an open case report hears that someone else
// saved the case, instead of finding out when its own save is refused.
//
//   - With the API server's live-update hub: the `caseReport` topic, keyed by
//     the case's support reference (never its case number;
//     LIVE_UPDATES_SIGNALR.md §14). Events only: no timed reads.
//   - In the demo: another tab of this browser saving the case
//     (subscribeCasesChangedElsewhere, the stand-in for the hub).
//
// Either way the hook re-reads the case and, when it is newer than the
// version the page knows (`knownVersion`), returns a notice for the page to
// show. The page's own saves move knownVersion on, so they show none. The
// version check on save (PS-71) stays as the safety net. Rules:
// services/cases/caseUpdateNotice.ts.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveData } from './useLiveData';
import { caseUpdateStillNews, caseUpdateToShow, type CaseUpdateNoticeDeps } from '@/services/cases/caseUpdateNotice';

export type { CaseUpdateNoticeDeps };

export interface CaseUpdateNotice {
  /** The newer version someone else saved, or null. */
  version: number | null;
  /** Hide the notice; `throughVersion` (Batch 575): the version the page has just taken up, when newer. */
  dismiss: (throughVersion?: number) => void;
}

export function useCaseUpdateNotice(caseId: string | null | undefined, knownVersion: () => number, deps: CaseUpdateNoticeDeps): CaseUpdateNotice {
  const [supportRef, setSupportRef] = useState<string | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const dismissedThrough = useRef(0);
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const knownRef = useRef(knownVersion);
  knownRef.current = knownVersion;

  useEffect(() => {
    setSupportRef(null);
    setVersion(null);
    dismissedThrough.current = 0;
    if (!caseId) return;
    let live = true;
    void depsRef.current.getSupportRef(caseId).then(ref => { if (live) setSupportRef(ref); }).catch(() => undefined);
    return () => { live = false; };
  }, [caseId]);

  const check = useCallback(async () => {
    if (!caseId) return;
    const latest = await depsRef.current.getCase(caseId);
    const show = caseUpdateToShow(knownRef.current(), latest?.version, dismissedThrough.current);
    if (show !== null) setVersion(show);
  }, [caseId]);

  useLiveData(check, {
    topic: 'caseReport', dataKey: supportRef, pollMs: null, enabled: !!caseId && !!supportRef,
    ...(deps.liveService ? { service: deps.liveService } : {}), ...(deps.signedIn ? { signedIn: deps.signedIn } : {}),
  });

  useEffect(() => {
    if (!caseId) return;
    return depsRef.current.subscribeElsewhere(ids => { if (ids.includes(caseId)) void check(); });
  }, [caseId, check]);

  // The page caught up (its own save, or it took up the newer case): the notice is no longer news.
  const current = version !== null && caseUpdateStillNews(version, knownVersion()) ? version : null;

  const dismiss = useCallback((throughVersion?: number) => {
    setVersion(v => {
      dismissedThrough.current = Math.max(dismissedThrough.current, v ?? 0, throughVersion ?? 0);
      return null;
    });
  }, []);

  return { version: current, dismiss };
}
