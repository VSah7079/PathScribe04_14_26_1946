// src/services/connectivity/pageWaitClock.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 563 (PS-622): when a page opens cold, its code arrives in two steps
// (the app's own Suspense, then the signed-in app's), so one page loader
// replaces another. Checked in a browser: each started its own 3-second clock,
// so "still loading" showed, vanished, and showed again 3 s later. A page
// loader that appears within a second of the previous one going counts from
// when the first appeared: the person has been waiting all along.
// ─────────────────────────────────────────────────────────────────────────────

/** A gap shorter than this between two page loaders is one wait. */
export const PAGE_WAIT_JOIN_MS = 1_000;

export interface PageWaitClock {
  /** When a loader appearing now would count from, without starting it (for its first render). */
  peek(now: number): number;
  /** A loader appears: when its wait counts from. */
  start(now: number): number;
  /** A loader goes. */
  end(now: number): void;
}

export function createPageWaitClock(): PageWaitClock {
  let startedAt: number | null = null;
  let endedAt: number | null = null;
  let open = 0;
  // A loader that follows the last within the join time carries on its wait: the time already waited,
  // not the gap between (so two page opens a moment apart don't add up into one long wait).
  const from = (now: number): number => {
    if (open > 0 && startedAt !== null) return startedAt;
    if (startedAt !== null && endedAt !== null && now - endedAt < PAGE_WAIT_JOIN_MS) return now - (endedAt - startedAt);
    return now;
  };
  return {
    peek: from,
    start(now) {
      startedAt = from(now);
      open += 1;
      return startedAt;
    },
    end(now) {
      open = Math.max(0, open - 1);
      if (open === 0) endedAt = now;
    },
  };
}
/** The app's page loaders share one clock. */
export const pageWaitClock = createPageWaitClock();
