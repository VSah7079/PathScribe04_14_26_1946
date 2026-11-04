// src/services/cases/caseUpdateNotice.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 572 (Pete, Oct 14, 2026: a live notice instead of a refused save):
// whether an open case report should say "someone else updated this case".
// The page knows the version it last loaded or saved (knownVersion); a
// re-read after a `caseReport` event (or, in the demo, another tab's save)
// gives the latest. A notice shows when the latest is newer than both what
// the page knows and what the user last dismissed. The page's own saves
// move knownVersion on, so they never show one. Pure: tested directly.
// ─────────────────────────────────────────────────────────────────────────────

import type { ILiveUpdateService } from '../liveUpdates/ILiveUpdateService';

/** What the case report's notice reads with (services/cases/caseUpdateNoticeDeps.ts; tests pass their own). */
export interface CaseUpdateNoticeDeps {
  getCase: (caseId: string) => Promise<{ version?: number } | null | undefined>;
  /** The case's support reference (the hub key), or null when there is none. */
  getSupportRef: (caseId: string) => Promise<string | null>;
  /** Demo: cases another tab changed. */
  subscribeElsewhere: (listener: (caseIds: string[]) => void) => () => void;
  liveService?: ILiveUpdateService;
  signedIn?: () => Promise<boolean>;
}

/** The version to tell the user about, or null for none. */
export function caseUpdateToShow(knownVersion: number, latestVersion: number | undefined, dismissedThrough: number): number | null {
  if (latestVersion === undefined || !Number.isFinite(latestVersion)) return null;
  return latestVersion > knownVersion && latestVersion > dismissedThrough ? latestVersion : null;
}

/** Whether a notice already showing is still news (the page may have caught up by its own save or take-up). */
export function caseUpdateStillNews(noticeVersion: number | null, knownVersion: number): boolean {
  return noticeVersion !== null && noticeVersion > knownVersion;
}
