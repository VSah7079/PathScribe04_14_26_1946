// src/pages/SynopticReportPage/hooks/sharedHookTypes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared types and small helpers used across multiple SynopticReportPage
// hooks. Added during a review pass after the initial extraction — several
// of the seven hooks had independently re-declared identical types
// (SigningUser, the setConcurrencyConflict signature,
// sendSynopticReportToLis, generateReportPdfSnapshot), which is exactly
// the kind of drift risk a "pure move" extraction can leave behind: five
// copies of the same type are five places a future change could apply to
// only some of them.
// ─────────────────────────────────────────────────────────────────────────────

import { useAuth } from '@/contexts/AuthContext';
import { ConcurrencyConflictError } from '@/services/cases/ConcurrencyConflictError';

export type SigningUser = ReturnType<typeof useAuth>['user'];

export type ConcurrencyConflictState = { actualVersion: number; blockOverride?: boolean } | null;
export type SetConcurrencyConflict = (conflict: ConcurrencyConflictState) => void;

export type SendSynopticReportToLisPayload = {
  kind: 'corrected' | 'new_instance' | 'corrected_with_addition';
  caseId: string;
  instanceId: string;
  reasonForChange?: string; // only meaningful for 'corrected'
  sequenceNumber?: number; // addendum numbering, for the header label
  addendumTitle?: string;
  /** The actual discrete text block being handed to the LIS — the
   *  embedded header gets prepended to this, not just attached as
   *  separate metadata. */
  payloadBody: string;
};
export type SendSynopticReportToLisFn = (payload: SendSynopticReportToLisPayload) => Promise<{ ok: boolean }>;
export type GenerateReportPdfSnapshotFn = () => Promise<{ pdfBase64?: string; generationError?: string }>;

// ── Shared conflict handling ────────────────────────────────────────────────
// Every hook's write path follows the same shape: try the write, and on
// ConcurrencyConflictError specifically, surface the conflict modal via
// setConcurrencyConflict rather than treating it as a generic failure.
// That check-and-surface step was identical in all 14 call sites across
// five hooks; what genuinely differs per call site is (a) whether this
// particular write is high-stakes enough to force blockOverride (finalize,
// sign-out, amendment release — no "proceed anyway" option) versus a
// routine draft edit that allows one, and (b) what the calling function
// itself needs to do next (some just `return`, one returns `false` since
// its own signature is Promise<boolean>). Rather than force every caller
// into an identical shape, this returns a boolean — true if the error was
// a conflict and has been surfaced, false otherwise — so each call site
// keeps its own return statement and blockOverride choice explicit at the
// call site, not hidden inside a shared function's default.
//
// Usage:
//   } catch (e) {
//     if (handleConcurrencyConflict(e, setConcurrencyConflict, { blockOverride: true })) return;
//     console.error('...', e);
//   }
export function handleConcurrencyConflict(
  e: unknown,
  setConcurrencyConflict: SetConcurrencyConflict,
  options?: { blockOverride?: boolean },
): boolean {
  if (e instanceof ConcurrencyConflictError) {
    setConcurrencyConflict({ actualVersion: e.actualVersion, blockOverride: options?.blockOverride });
    return true;
  }
  return false;
}
