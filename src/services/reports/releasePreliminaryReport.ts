// src/services/reports/releasePreliminaryReport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct research and design recommendation ("Provide a
// Manual Trigger: Give users a clean 'Release as Preliminary' button
// on the diagnostic sign-out screen at any point before final
// verification") — the manual pathologist action identified as the
// primary trigger in over 80% of real preliminary-report cases (a
// bone marrow biopsy showing acute leukemia, a transplant kidney
// biopsy showing acute rejection — the pathologist releases a partial
// finding immediately, then leaves the case open for special stains/
// IHC/flow). Built first, deliberately, ahead of any automatic event
// hooks (ROSE completion, gross-only release, delayed-ancillary
// prompts) — those would all dispatch through this exact same real
// mechanism, just from a different trigger point; this is the one,
// real foundation they'd all need underneath them, not a separate
// pipeline duplicated per trigger.
//
// Real, deliberate default behavior, per the same direct guidance:
// pulls whatever text currently exists in Preliminary Diagnosis and
// Specimen Source (buildOruR01Payload's own real, existing fields —
// nothing new invented here), relies on the real, already-working
// hideIfEmpty engine behavior for unpopulated fields (never this
// function's own concern), and — critically — never changes the
// case's own real CaseStatus. A Preliminary release is explicitly NOT
// a sign-out: the case stays in whatever in-progress/unverified state
// it was already in, exactly as it would if this action had never
// been taken.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '../cases/CaseRouter';
import { resolveIsFinalStatus } from '../reportTemplates/TemplateRoutingService';
import { updateCaseWithRetry } from '../cases/caseWrite';
import i18n from '@/i18n/config';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import type { CapabilityDecision } from '../authorization/evaluateCapability';

/** Batch 649: the capability check (surgical:preliminary:release), passed in for tests. */
export interface ReleasePreliminaryDeps {
  enforce: (capability: string, context?: { caseId?: string | null; facilityId?: string | null }) => Promise<Pick<CapabilityDecision, 'allowed'>>;
}
const defaultPreliminaryDeps: ReleasePreliminaryDeps = { enforce: (c, ctx) => authorizationService.enforce(c, ctx) };

export interface ReleasePreliminaryReportResult {
  ok: boolean;
  /** Real count of real SynopticReportInstances a Preliminary message
   *  was actually dispatched for — 0 alongside ok:true is a real,
   *  honest "nothing to release" (an orchestration case with no real
   *  specimen instances at all yet), never conflated with a failure. */
  dispatchedCount: number;
  error?: string;
  /** Batch 649: refused for want of surgical:preliminary:release (error carries the reason, in the user's language). */
  notPermitted?: boolean;
  /** Batch 534: held for the laboratory's release delay; when it goes (the person who released it can recall it until then). */
  heldUntil?: string;
}

export async function releasePreliminaryReport(
  caseId: string,
  releasingUser: { id: string; name: string; role?: string },
  /** Real, per direct follow-up ("Component B") — optional: only
   *  SynopticReportPage.tsx's own real caller, which has
   *  generateReportPdfSnapshot in scope, can actually supply this.
   *  See publishReportReleasedEvent.ts's own doc comment on this
   *  same field for the full, honest structural reason. */
  generatePdf?: () => Promise<{ pdfBase64?: string; generationError?: string }>,
  deps: ReleasePreliminaryDeps = defaultPreliminaryDeps,
): Promise<ReleasePreliminaryReportResult> {
  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { ok: false, dispatchedCount: 0, error: 'Case not found.' };
  // Batch 649: the capability (checked and audited, with the case's facility), before anything is sent.
  const decision = await deps.enforce('surgical:preliminary:release', { caseId, facilityId: caseData.order?.facilityId ?? null });
  if (!decision.allowed) return { ok: false, dispatchedCount: 0, notPermitted: true, error: i18n.t('caseActionPermissions.preliminaryRelease') };
  if (caseData.reportingMode !== 'orchestrator') {
    return { ok: false, dispatchedCount: 0, error: 'Preliminary release is only available for Orchestration-mode cases.' };
  }
  // Real, deliberate guard: releasing a "Preliminary" report on a case
  // that's already genuinely final doesn't mean anything real — that
  // case should go through the normal sign-out/dispatch path instead,
  // never this one. Reuses resolveIsFinalStatus directly (PS-292's own
  // real, already-decided definition of "genuinely final") rather than
  // a second, separate check that could quietly disagree with it.
  if (resolveIsFinalStatus(caseData.status)) {
    return { ok: false, dispatchedCount: 0, error: 'This case is already final — use the normal sign-out flow instead of a Preliminary release.' };
  }

  const instances = caseData.synopticReports ?? [];
  if (instances.length === 0) return { ok: true, dispatchedCount: 0 };

  // Real, per direct follow-up ("Component A refinement: formalize a
  // real Report_Released_Event") — the real dispatch loop itself now
  // lives in dispatchPreliminaryCaseInstances.ts, called through the
  // one, real, shared publish point every real release (Preliminary
  // or Final) now goes through, rather than this function owning its
  // own, separate copy of the dispatch logic.
  // Batch 534 (Pete: every report output follows the release delay): through releaseReport.
  const { releaseThroughDelay } = await import('../reportRelease/releaseThroughDelay');
  const outcome = await releaseThroughDelay({
    caseId,
    reportType: 'PRELIMINARY',
    releasedAt: new Date().toISOString(),
    releasedBy: { id: releasingUser.id, name: releasingUser.name },
    performingFacilityId: caseData.order?.facilityId,
    generatePdf,
  }, { kind: 'surgical-preliminary', releasedBy: { userId: releasingUser.id, userName: releasingUser.name } });
  const heldUntil = 'held' in outcome ? outcome.held.expiresAt : undefined;
  const dispatchedCount = 'published' in outcome ? outcome.published.dispatchedCount ?? 0 : 0;

  // Real, deliberate: sets the same, real Preliminary Reviewer
  // Attestation fields the Preliminary template itself already
  // renders (DiagnosticMetadata.reviewerRole/preliminaryRecordedAt —
  // types/case/Case.ts) — those fields existed since the templates
  // shipped but nothing ever wrote to them; this action is their real
  // write path. Deliberately does NOT touch caseData.status at all —
  // per direct guidance, the case stays in whatever in-progress/
  // unverified state it was already in.
  if (dispatchedCount > 0 || heldUntil) {
    // PS-71 (Batch 458): the attestation is applied to the case as read for
    // the save (not the copy read before the dispatch), with its version;
    // on a conflict it is re-applied to the newer case, so a diagnostic
    // change saved meanwhile is kept. A lasting conflict is logged and,
    // like any other failure here, never masks the dispatch.
    const preliminaryRecordedAt = new Date().toISOString();
    try {
      const r = await updateCaseWithRetry(caseId, current => ({
        diagnostic: {
          ...current.diagnostic,
          reviewerRole: releasingUser.role ?? 'Pathologist',
          preliminaryRecordedAt,
        },
      } as any), {
        getCase: id => caseRouter.getCase(id),
        updateCase: (id, updates, expectedVersion) => caseRouter.updateCase(id, updates, expectedVersion),
      });
      if (r.ok === false) console.error(`[PS-71] Preliminary attestation for ${caseId} not saved (${r.reason}).`);
    } catch {
      // Real, deliberate: the dispatch itself already succeeded and
      // is the real, meaningful outcome of this action — a failure to
      // also update the attestation fields afterward is a real,
      // separate, secondary concern that must never roll back or mask
      // a dispatch that genuinely already went out.
    }
  }

  return { ok: true, dispatchedCount, ...(heldUntil ? { heldUntil } : {}) };
}
