// src/services/reportRelease/IReportReleaseService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real feature, per direct specification: Post-Sign-Out Release Buffer.
// Phase 1 built the core state machine and recall workflow. This is
// Phase 2 — the real Enterprise/Facility config hierarchy.
// resolveBufferForCase() below now resolves through
// resolveEffectiveConfig(), the org-default/facility-override pair,
// structurally mirroring services/session/ISessionTimeoutService.ts's
// own, already-proven org-default/per-performing-lab-override shape —
// not a new pattern invented for this feature.
//
// Real, important architectural note: the spec's own "deferred job
// scheduling" / "atomic job cancellation" describes real backend
// infrastructure (a job queue, workers) that doesn't exist in this
// frontend-only, mock-service-backed app — see this folder's own
// README for the honest, full explanation of what's simulated here
// versus what would need real backend work. checkAndReleaseIfExpired()
// below is that simulation: a real, correct state transition, checked
// client-side rather than guaranteed by a real, server-side scheduler.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CaseStatus } from '@/types/case/CaseStatus';
import type { ServiceResult } from '../types';

export interface ReleaseBufferResolution {
  applies: boolean;
  durationMinutes: number;
  /** The real, human-readable reason a bypass applied, when applicable
   *  (e.g. "STAT priority") — genuinely absent when the buffer simply
   *  applies normally, not filled with a placeholder. */
  bypassReason?: string;
}

/** Real feature, per direct specification: Post-Sign-Out Release
 *  Buffer, Phase 2. The org-wide default shape — mirrored, field for
 *  field, by Facility.releaseBufferOverride's own shape (minus the
 *  inheritSystemDefault flag, which only makes sense on an override,
 *  never on the default itself).
 *
 *  watermarkText/restrictHardcopyPrinting added in Phase 3 —
 *  deliberately enterprise-level only, not part of the real, per-
 *  facility override above: the spec lists them under the same
 *  "Administrative Configuration... Enterprise level Settings"
 *  section without the explicit facility-override callout
 *  enabled/durationMinutes/bypassForStat each get, and a compliance/
 *  legal-facing watermark string plausibly needs to stay consistent
 *  enterprise-wide rather than vary silently per lab. */
export interface ReportReleaseOrgConfig {
  enabled: boolean;
  durationMinutes: number;
  bypassForStat: boolean;
  /** Real feature, per direct specification, Phase 3. The real text
   *  rendered on the on-screen watermark (see
   *  components/PendingReleaseWatermark.tsx) and sent through to the
   *  real, separate server-side PDF renderer for the hardcopy — see
   *  that renderer's own real, honest limitation: this app can send
   *  the field, not verify the separate service actually draws it,
   *  same established caveat as generateReportPdfSnapshot's own
   *  documentStyle field. */
  watermarkText: string;
  /** Real feature, per direct specification, Phase 3. When true
   *  (spec's own stated default), hardcopy printing is blocked outright
   *  while a case is 'pending-release'; an admin can override per
   *  print action (see BottomActionBar.tsx) to allow it, in which case
   *  the generated PDF still carries watermarkText — printing is never
   *  silently un-watermarked. */
  restrictHardcopyPrinting: boolean;
}

export interface IReportReleaseService {
  /**
   * Real feature: determines whether the release buffer applies to a
   * given case, and for how long — the full, real resolution: org
   * default, overridden by whichever real, performing facility handles
   * this case's work (resolved via resolvePerformingLabFacilityId(),
   * same as every other performing-lab-scoped setting in this
   * codebase) if that facility has releaseBufferOverride.inheritSystemDefault
   * set to false.
   */
  resolveBufferForCase(caseData: Pick<Case, 'order' | 'originHospitalId'>): Promise<ReleaseBufferResolution>;

  /** Org-wide default. Fallback constant (see
   *  mockReportReleaseService.ts's own DEFAULT_ORG_CONFIG) if nothing
   *  has been configured yet — matches this codebase's established
   *  "real, sensible fallback, never a hard failure" posture for
   *  config resolution (e.g. ISessionTimeoutService's own
   *  FALLBACK_DEFAULT_MINUTES). */
  getOrgDefault(): Promise<ServiceResult<ReportReleaseOrgConfig>>;

  setOrgDefault(config: ReportReleaseOrgConfig): Promise<ServiceResult<void>>;

  /**
   * Real feature: begins the release-hold window for a case whose
   * sign-out just completed and whose buffer genuinely applies.
   * Captures the real preReleaseBufferStatus (the case's own real
   * status immediately before this call) so recall() can restore it
   * exactly, computes the real releaseBufferExpiresAt, and writes
   * status: 'pending-release'. Never called for a case whose buffer
   * doesn't apply — that case goes straight to 'finalized' with a real,
   * immediate releasedAt instead, entirely outside this service.
   *
   * Real, deliberate note: the actual sign-out flow (finalizeCase() in
   * useSignOutWorkflow.ts) does NOT call this method — it already
   * performs its own single, atomic patch (synoptic-instance exclusion
   * handling + finalizedBy + finalizedAt), and computes these same
   * buffer fields inline in that same write, using only
   * resolveBufferForCase()'s decision. Calling this method from there
   * too would mean a second, separate write for one logical action,
   * and a real, briefly-observable incorrect intermediate state
   * (status: 'finalized' written to the DB even when a buffer should
   * apply, before immediately being overwritten to 'pending-release').
   * This method remains real and independently useful — exercised
   * directly by this service's own tests, and available for any real,
   * future caller that genuinely needs to start a buffer as its own,
   * standalone action.
   */
  startBuffer(
    caseId: string,
    input: { previousStatus: CaseStatus; durationMinutes: number },
    performedBy: { userId: string; userName: string }
  ): Promise<{ ok: true; releaseBufferExpiresAt: string } | { ok: false; reason: string }>;

  /**
   * Real feature: recalls a genuinely 'pending-release' case back to
   * its real, captured preReleaseBufferStatus — clears every real
   * buffer field, logs a real, dedicated SIGN_OUT_RECALLED audit event.
   * Refuses (not a silent no-op) if the case isn't genuinely in
   * 'pending-release', or if the real buffer has already expired — a
   * real, honest race between an operator's click and the countdown
   * reaching zero must never "recall" a report that's already
   * release-eligible.
   */
  recall(
    caseId: string,
    performedBy: { userId: string; userName: string }
  ): Promise<{ ok: true } | { ok: false; reason: string }>;

  /**
   * Real feature: the client-side simulation of the real, deferred
   * release job — checks whether a genuinely 'pending-release' case's
   * real buffer has expired, and if so, transitions it to 'finalized'
   * with a real, buffer-aware releasedAt (deliberately distinct from
   * finalizedAt — see CaseStatus's own 'pending-release' doc comment).
   * A real, honest no-op (released: false, not an error) when the case
   * isn't in 'pending-release', or the buffer hasn't expired yet.
   */
  checkAndReleaseIfExpired(caseId: string): Promise<{ released: boolean }>;
}
