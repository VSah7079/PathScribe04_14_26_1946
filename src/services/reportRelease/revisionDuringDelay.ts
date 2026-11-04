// src/services/reportRelease/revisionDuringDelay.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 540 (Pete, Oct 12, 2026: "Why not block that flow during the delay
// period?"). A correction or addendum revises a report that has been
// released. While the report is still in its release delay nothing has left
// the laboratory, so there is nothing to correct: the pathologist recalls the
// report, edits it and signs again. Starting a correction or addendum is
// refused until the delay has ended.
//
// "In its delay" means:
//   - a surgical or autopsy case in its sign-out buffer (status 'pending-release');
//   - a case whose original report is held: the surgical sign-out, a cytology
//     case report (signed, finalized early, or a specimen signed after an early
//     finalization), or an autopsy report.
// A held correction, addendum or preliminary doesn't count: the report it
// revises (or precedes) is not held by it.
//
// Before this rule, a revision released during the buffer was rendered while
// the case was 'pending-release', so its PDF carried the release-buffer
// watermark and that file went out when the delay ended (found in the
// Batch 538 review).
// ─────────────────────────────────────────────────────────────────────────────

import type { HeldRelease, HeldReleaseKind } from '@/types/reportRelease/HeldRelease';

/** Releases that hold the original report. */
export const ORIGINAL_REPORT_HOLDS: readonly HeldReleaseKind[] = [
  'surgical-sign-out', 'cytology-sign-out', 'cytology-finalize-early', 'cytology-late-sign-out', 'autopsy',
];

/** The refusal, as the services return it (the screens show their own translated text for it). */
export const REVISION_IN_RELEASE_DELAY =
  'This report is still in its release delay, so it has not been sent. Recall it to change it, or wait until the delay ends to correct it or add an addendum.';

/** Whether a correction or addendum must wait (pure). */
export function revisionBlockedByDelay(input: { caseStatus?: string; held: readonly HeldRelease[] }): boolean {
  if (input.caseStatus === 'pending-release') return true;
  return input.held.some(h => h.status === 'held' && ORIGINAL_REPORT_HOLDS.includes(h.kind));
}

export interface RevisionDelayDeps {
  caseStatus(caseId: string): Promise<string | undefined>;
  heldReleases(caseId: string): Promise<HeldRelease[]>;
}

const defaultDeps: RevisionDelayDeps = {
  caseStatus: async caseId => {
    const { caseRouter } = await import('../cases/CaseRouter');
    const c = await caseRouter.getCase(caseId).catch(() => null);
    return (c as { status?: string } | null)?.status;
  },
  heldReleases: async caseId => {
    const { heldReleaseService } = await import('./heldReleaseServiceInstance');
    const res = await heldReleaseService.getByCaseId(caseId);
    return res.ok ? res.data : [];
  },
};

/** True when a correction or addendum may start on this case now. */
export async function revisionAllowedNow(caseId: string, deps: RevisionDelayDeps = defaultDeps): Promise<boolean> {
  const [caseStatus, held] = await Promise.all([deps.caseStatus(caseId), deps.heldReleases(caseId)]);
  return !revisionBlockedByDelay({ caseStatus, held });
}
