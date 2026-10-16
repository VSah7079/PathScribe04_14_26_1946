// src/hooks/useHeldReports.ts
// Batch 534 (Pete, Oct 12, 2026). The reports on a case still waiting out the
// release delay, refreshed every few seconds and after a recall, and Recall
// itself (only the person who released it; the service checks it again and
// reopens what was released). Decisions are the services'.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { HeldRelease } from '@/types/reportRelease/HeldRelease';
import { listHeldReports, recallHeldReport } from '@/services/reportRelease/releaseThroughDelay';
import { heldRecallRefusal } from '@/services/reportRelease/heldReleaseRules';
import { useLiveData } from './useLiveData';

const REFRESH_MS = 5_000;

export function useHeldReports(caseId: string | null | undefined, user: { id: string; name: string } | null | undefined, onRecalled?: () => void | Promise<void>) {
  const [held, setHeld] = useState<HeldRelease[]>([]);
  const [now, setNow] = useState(() => new Date());

  // Batch 560: an answer for a case no longer shown (or an older read) is dropped.
  const latest = useRef(0);
  const refresh = useCallback(async () => {
    const mine = ++latest.current;
    if (!caseId) { setHeld([]); return; }
    const list = await listHeldReports(caseId).catch(() => []);
    if (mine !== latest.current) return;
    setHeld(list);
    setNow(new Date());
  }, [caseId]);

  useEffect(() => { setHeld([]); void refresh(); }, [refresh]);
  // Batch 560: re-read when the live-update hub says a held report changed (topic `heldReleases`), with a
  // safety poll; without a live connection, every 5 seconds as before.
  useLiveData(refresh, { topic: 'heldReleases', pollMs: REFRESH_MS, enabled: !!caseId });
  // The clock that decides whether Recall is still open moves on its own (no read needed).
  const anyHeld = held.length > 0;
  useEffect(() => {
    if (!anyHeld) return;
    const tick = setInterval(() => setNow(new Date()), REFRESH_MS);
    return () => clearInterval(tick);
  }, [anyHeld]);

  const recall = useCallback(async (id: string) => {
    if (!user?.id) return { ok: false as const, refusal: 'notReleaser' as const };
    const result = await recallHeldReport(id, { userId: user.id, userName: user.name });
    await refresh();
    if (result.ok) await onRecalled?.();
    return result;
  }, [user?.id, user?.name, refresh, onRecalled]);

  /** Whether this person can recall it now. */
  const canRecall = (h: HeldRelease) => !!user?.id && heldRecallRefusal(h, user.id, now) === null;

  return { held, recall, canRecall, refresh };
}
