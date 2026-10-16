// src/hooks/useCasePresence.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 573 (Pete, Oct 14, 2026: presence on an open case): who else has this
// case report open, and whether they are editing it, so two people find out
// before one of them has a save refused.
//
//   - With the API server's hub: JoinCasePresence with the case's support
//     reference (never its case number; LIVE_UPDATES_SIGNALR.md §15), and
//     only for a signed-in (SSO) session, like every hub screen.
//   - In the demo: this browser's other windows (the local transport).
//
// The page says whether it has unsaved changes (`editing`); others see it.
// Returns everyone else (this window left out; the same person in another
// window kept) and one message for screen readers about the latest change.
// Rules: services/liveUpdates/casePresence.ts.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { liveUpdateService } from '@/services/liveUpdates/liveUpdateService';
import { getAccessToken } from '@/services/auth/accessTokenSource';
import type { ILiveUpdateService } from '@/services/liveUpdates/ILiveUpdateService';
import {
  casePresenceChange, newPresenceId, otherViewers,
  type CasePresenceChange, type CasePresenceHandle, type CasePresenceOther, type CasePresenceSelf, type CasePresenceViewer,
} from '@/services/liveUpdates/casePresence';

export interface CasePresenceDeps {
  /** The case's support reference, or null when there is none (then no presence). */
  getSupportRef: (caseId: string) => Promise<string | null>;
  liveService?: ILiveUpdateService;
  signedIn?: () => Promise<boolean>;
}

export interface CasePresence {
  others: CasePresenceOther[];
  /** The latest change worth announcing (`seq` counts changes, so a repeat still updates state). */
  change: (CasePresenceChange & { seq: number }) | null;
}

const hasToken = async () => !!(await getAccessToken());

export function useCasePresence(caseId: string | null | undefined, editing: boolean, self: CasePresenceSelf | null, deps: CasePresenceDeps): CasePresence {
  const service = deps.liveService ?? liveUpdateService;
  const presenceId = useRef(newPresenceId()).current;
  const [others, setOthers] = useState<CasePresenceOther[]>([]);
  const [change, setChange] = useState<CasePresence['change']>(null);
  const handle = useRef<CasePresenceHandle | null>(null);
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const selfRef = useRef(self);
  selfRef.current = self;
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const userId = self?.userId ?? null;

  useEffect(() => {
    setOthers([]);
    setChange(null);
    if (!caseId || !userId) return;
    let live = true;
    let joined: CasePresenceHandle | null = null;
    let seq = 0;
    /** What was last shown; null after joining or while not connected (the next list is the baseline). */
    let shown: CasePresenceViewer[] | null = null;
    void (async () => {
      const ref = await depsRef.current.getSupportRef(caseId).catch(() => null);
      if (!live || !ref) return;
      const signedIn = depsRef.current.signedIn ?? hasToken;
      if (service.transport === 'signalr' && !(await signedIn().catch(() => false))) return;
      if (!live) return;
      joined = service.joinCasePresence(
        { ref, presenceId, editing: editingRef.current, ...(selfRef.current ? { self: selfRef.current } : {}) },
        (viewers, ownPresenceId) => {
          if (!live) return;
          // An empty list: not connected (this window is always in its own list). Show nobody, say nothing.
          if (viewers.length === 0) { shown = null; setOthers([]); return; }
          const next = otherViewers(viewers, ownPresenceId, userId);
          const c = casePresenceChange(shown, next, userId);
          shown = next;
          setOthers(next);
          if (c) setChange({ ...c, seq: ++seq });
        },
      );
      handle.current = joined;
    })();
    return () => {
      live = false;
      joined?.leave();
      handle.current = null;
    };
  }, [caseId, userId, service, presenceId]);

  useEffect(() => { handle.current?.setEditing(editing); }, [editing]);

  return { others, change };
}
