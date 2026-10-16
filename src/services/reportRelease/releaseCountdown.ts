// src/services/reportRelease/releaseCountdown.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 555 (PS-539 phase 2d; readiness review §7): what the surgical report
// page does when a held sign-out's release countdown reaches zero. Without the
// API server running the release job, the open page releases it itself (as
// since Batch 534; the app shell's sweep releases it when no page is open).
// Once the server runs `release.dueSweep` (VITE_SERVER_JOBS), the page only
// reads the case again to see whether the server has released it, so the
// FINAL is never sent twice.
// ─────────────────────────────────────────────────────────────────────────────
import { browserRunsServerJob } from '../serverJobs/browserStandIns';

export interface ReleaseCountdownDeps {
  releaseIfExpired: (caseId: string) => Promise<{ released: boolean }>;
  readStatus: (caseId: string) => Promise<string | undefined>;
  runsHere?: () => boolean;
}

/** `released`: the report is out. `waiting`: the server hasn't released it yet (ask again shortly). */
export async function onReleaseCountdownEnd(caseId: string, deps: ReleaseCountdownDeps): Promise<'released' | 'waiting' | 'notReleased'> {
  const runsHere = deps.runsHere ?? (() => browserRunsServerJob('release.dueSweep'));
  if (runsHere()) return (await deps.releaseIfExpired(caseId)).released ? 'released' : 'notReleased';
  return (await deps.readStatus(caseId)) === 'finalized' ? 'released' : 'waiting';
}

/** How long the page waits before asking the server again. */
export const RELEASE_RECHECK_MS = 15_000;
