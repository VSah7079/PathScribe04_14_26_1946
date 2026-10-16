// src/services/autopsy/signAutopsyReport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up ("let's get that signing") — the actual
// PAD/FAD signing action, which never existed anywhere in this
// codebase before this: AutopsyReportSnapshot (padSnapshot/
// fadSnapshot) was, until now, only ever read (by
// resolveAutopsyBodyReleaseGate.ts and resolveAutopsyBodyAlreadyReleased.ts),
// never written.
//
// Same real fetch → check → gate → persist shape as
// releaseAutopsyBody.ts — logic lives here, never inline in a form
// component.
//
// Real, per PS-292's own decided countersign requirements ("stay
// strict... the same countersign needs to work for Cytology as
// well"): a resident's or FPPE provisional hire's own PAD/FAD
// sign-off is intercepted here too, via the exact same, shared
// resolveResidentCountersignRequired.ts decision already wired into
// Cytology's own sign-out — never a third, separate copy of that
// logic. On interception this releases the case for countersign
// (countersignService.release(), CountersignRecord.autopsyReportTier
// set) rather than producing a real snapshot.
//
// Real, per direct follow-up ("continue with attending sign out") —
// the attending's own side. Mirrors useSignOutWorkflow.ts's own real
// pattern exactly: no separate review screen. The attending just
// signs normally (this same action), and if a real, still-pending
// CountersignRecord exists for this same tier, its completion
// (countersignService.countersign()) is captured alongside the real
// snapshot write below, not as a separate step.
//
// Real, per the same session's own decision on FAD vs. CaseStatus:
// signing the FAD (when not intercepted) also transitions the case's
// own CaseStatus to 'finalized' — the case's real terminal event.
// Signing the PAD deliberately does NOT change CaseStatus at all: PAD
// is an interim milestone tracked on AutopsyCaseDetails itself, not a
// case-level status transition — matching resolveAutopsyBodyReleaseGate.ts's
// own design, which already reads padSnapshot directly rather than
// any CaseStatus value.
//
// Batch 478 (PS-261 follow-up; Pete's own locked-in scoping decision):
// resolveAutopsyGrossExaminationGate.ts's hard block, verified before
// this batch to NOT actually be wired to anything — SynopticReportPage.tsx
// only used it to decide whether to show a warning banner; nothing
// stopped a sign from here. This is the one real write site PAD/FAD
// signing goes through, so it's the one real place the gate becomes an
// actual hard stop: a blocked gate now refuses the sign outright
// (AUTHORIZATION_GATE_BLOCKED) unless the caller supplies a written
// `overrideReason`, in which case the brand-new, audited
// `autopsy:gross-exam-gate:override` capability is enforced and, if
// held, the sign proceeds with the override logged to
// AutopsyCaseDetails.gateOverrides (append-only) and to the shared
// audit trail — never silent.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '@/services/cases/CaseRouter';
import { updateCaseWithRetry } from '@/services/cases/caseWrite';
import { countersignService, qaSupervisionAssignmentService, userService } from '@/services';
import { FPPE_ACTIVITY_TYPE_ID } from '@/services/quality/mockQaSupervisionAssignmentService';
import { resolveResidentCountersignRequired } from '@/services/cases/resolveResidentCountersignRequired';
import { canFinalizeCase, getSessionUser, resolveCountersignRequiredTypeIds } from '@/services/auth/caseAccessControl';
import { resolveFinalizeAuthorityContext } from '@/services/auth/resolveFinalizeAuthorityContext';
import { resolveForensicSignOutAuthority } from './resolveForensicSignOutAuthority';
import { resolveAutopsyGrossExaminationGate } from './resolveAutopsyGrossExaminationGate';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import type { AutopsyReportTier, AutopsyReportSnapshot, AutopsyGateOverrideEvent } from '@/types/autopsy/AutopsyCaseDetails';

interface OrchestratorSectionLike { id: string; label: string; text?: string }

// Real, per direct correction ("the Final Diagnosis in an Autopsy
// report is a cause of death, what else could it be? That data exist
// as does the PAD data — let's not over complicate things here"):
// there is no dedicated, Autopsy-specific "cause of death" field
// anywhere in this codebase, and there doesn't need to be one — the
// real, existing report text every specialty already writes
// (Case.orchSections — Gross Description, Diagnosis, etc., the same
// generic mechanism this app already uses for every specialty's own
// report) IS the real data. Snapshotting it directly, honestly,
// rather than inventing a new, structured AutopsyReportContent type
// — this is what makes the PAD-vs-FAD comparison this session already
// wanted buildable now, on real data, not blocked on a type that
// doesn't exist.
function buildReportTextSnapshot(caseData: any): { sections: { id: string; label: string; text: string }[] } {
  const sections: OrchestratorSectionLike[] = caseData?.orchSections ?? [];
  return { sections: sections.map(s => ({ id: s.id, label: s.label, text: s.text ?? '' })) };
}

// Real, per the same correction — the countersign delta computation
// (countChangedFields, mockCountersignService.ts) needs the real
// section text to detect real changes too, not just scope/
// jurisdiction (which rarely change): flattens each real section's
// text into its own key, same generic "field id → value" shape
// Surg Path's own SynopticReportInstance.answers already uses for the
// exact same real comparison.
function buildCountersignComparisonSnapshot(caseData: any): Record<string, string | string[]> {
  const sections: OrchestratorSectionLike[] = caseData?.orchSections ?? [];
  const sectionFields: Record<string, string> = {};
  sections.forEach(s => { sectionFields[`section_${s.id}`] = s.text ?? ''; });
  return {
    scope: JSON.stringify(caseData?.autopsy?.scope ?? {}),
    jurisdiction: caseData?.autopsy?.jurisdiction ?? '',
    ...sectionFields,
  };
}

export type SignAutopsyReportErrorCode =
  | 'CASE_NOT_FOUND' | 'NO_AUTOPSY_RECORD' | 'PAD_REQUIRED'
  /** Signing authority refused (PS-327); `error` is the translated reason. */
  | 'NOT_AUTHORIZED'
  /** A forensic case, and the signer holds no active appointment for its
   *  jurisdiction (resolveForensicSignOutAuthority). */
  | 'NO_FORENSIC_APPOINTMENT'
  /** Batch 478: resolveAutopsyGrossExaminationGate.ts is blocked and no
   *  `overrideReason` was supplied; `error` names the real blocked
   *  reason(s), joined. */
  | 'AUTHORIZATION_GATE_BLOCKED'
  /** Batch 478: an `overrideReason` was supplied, but the signer holds no
   *  `autopsy:gross-exam-gate:override`. */
  | 'GATE_OVERRIDE_NOT_PERMITTED'
  | 'SAVE_FAILED';

export interface SignAutopsyReportResult {
  ok: boolean;
  outcome?: 'signed' | 'released_for_countersign';
  /** The caller shows its own translated text for each code. */
  errorCode?: SignAutopsyReportErrorCode;
  error?: string;
}

export async function signAutopsyReport(
  caseId: string,
  tier: AutopsyReportTier,
  signingUser: { id: string; name: string; isPathologist: boolean },
  /** Real, per direct follow-up ("wire in Autopsy") — optional: only
   *  SynopticReportPage.tsx's own real caller, which has
   *  generateReportPdfSnapshot in scope, can actually supply this.
   *  Same real, established pattern as releasePreliminaryReport.ts's
   *  own identical parameter. */
  generatePdf?: () => Promise<{ pdfBase64?: string; generationError?: string }>,
  /** Batch 478: a written reason, supplied only when the caller already
   *  knows (from a prior, refused attempt) that resolveAutopsyGrossExaminationGate
   *  is blocked and wants to proceed anyway. Ignored when the gate is
   *  actually allowed — never a way to "pre-authorize" a sign that
   *  didn't need overriding. */
  overrideReason?: string,
): Promise<SignAutopsyReportResult> {
  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { ok: false, errorCode: 'CASE_NOT_FOUND', error: 'Case not found.' };
  if (!caseData.autopsy) return { ok: false, errorCode: 'NO_AUTOPSY_RECORD', error: 'Case has no autopsy record.' };

  // Real, deliberate ordering guard: an FAD can never be signed before
  // a real, signed PAD exists — same real-world sequencing
  // resolveAutopsyBodyReleaseGate.ts already assumes (PAD comes before
  // FAD, never the reverse).
  if (tier === 'FAD' && !caseData.autopsy.padSnapshot) {
    return { ok: false, errorCode: 'PAD_REQUIRED', error: 'The PAD must be signed before the FAD can be signed.' };
  }

  // Batch 478: the real hard stop. Checked here — the one real write
  // site a PAD/FAD sign goes through — rather than only in the UI's own
  // warning banner (SynopticReportPage.tsx), which never actually
  // stopped anything before this batch.
  const gate = resolveAutopsyGrossExaminationGate(caseData.autopsy);
  let gateOverrideEvent: AutopsyGateOverrideEvent | undefined;
  if (!gate.allowed) {
    const trimmedReason = overrideReason?.trim();
    if (!trimmedReason) {
      return { ok: false, errorCode: 'AUTHORIZATION_GATE_BLOCKED', error: gate.blockedReasons.join(' ') };
    }
    const overrideDecision = await authorizationService.enforce('autopsy:gross-exam-gate:override', { caseId });
    if (!overrideDecision.allowed) {
      return { ok: false, errorCode: 'GATE_OVERRIDE_NOT_PERMITTED', error: 'Overriding the authorization gate needs the autopsy:gross-exam-gate:override permission.' };
    }
    gateOverrideEvent = {
      id: `gate-override-${caseId}-${tier}-${Date.now()}`,
      occurredAt: new Date().toISOString(),
      tier,
      blockedReasons: gate.blockedReasons,
      reason: trimmedReason,
      overriddenByName: signingUser.name,
    };
  }

  const provisionalParticipant = caseData.participants?.some(
    p => p.status === 'active' && p.staffId === signingUser.id && p.participationTypeIds?.includes('provisional_hire')
  );
  const isAttendingToo = caseData.participants?.some(
    p => p.status === 'active' && p.staffId === signingUser.id && p.participationTypeIds?.includes('attending')
  );
  const activeFppeAssignment = provisionalParticipant && !isAttendingToo
    ? await qaSupervisionAssignmentService.getActiveAssignmentForUser(FPPE_ACTIVITY_TYPE_ID, signingUser.id, (caseData as any)?.subspecialtyId).then(r => r.ok ? r.data : null).catch(() => null)
    : null;

  // PS-327 (Batch 331): the same per-lab / country signing authority as
  // Surgical Pathology. Per Pete, the country profile that applies is the
  // case's legal (coroner) jurisdiction, not the performing lab's country;
  // it falls back to the lab's country if the case has none. A lab's own
  // authorityOverrides still win.
  const authority = await resolveFinalizeAuthorityContext(caseData, {
    jurisdictionOverride: caseData.autopsy.jurisdiction,
  });

  const countersignCheck = resolveResidentCountersignRequired({
    participants: caseData.participants,
    signingUserId: signingUser.id,
    hasActiveFppeAssignment: !!activeFppeAssignment,
    countersignRequiredTypeIds: resolveCountersignRequiredTypeIds(
      authority.participationTypes, authority.performingLabFacilityId, authority.jurisdiction),
  });

  if (countersignCheck.required) {
    // Real, Autopsy-native snapshot of what's actually being released
    // for review — the real autopsy record's own current state,
    // wrapped into the same generic shape CountersignRecord's
    // releasedAnswersSnapshot already uses everywhere else, keyed by
    // this case's own accession rather than a synoptic instanceId
    // (Autopsy has none).
    const releasedAnswersSnapshot: Record<string, Record<string, string | string[]>> = {
      [caseId]: buildCountersignComparisonSnapshot(caseData),
    };

    await countersignService.release({
      caseId,
      subspecialtyId: (caseData as any)?.subspecialtyId,
      residentId: signingUser.id,
      residentName: signingUser.name,
      releasedAnswersSnapshot,
      autopsyReportTier: tier,
    });

    // PS-71 (Batch 458): a status-only change, saved against the newest
    // version (updateCaseWithRetry); a conflict re-reads and re-saves the
    // same status, so nothing anyone else saved is overwritten.
    try {
      const w = await updateCaseWithRetry(caseId, () => ({ status: 'pending-countersign' } as any), caseRouter);
      if (!w.ok) return { ok: false, errorCode: 'SAVE_FAILED', error: 'The case changed while it was being released for countersign; reopen it and try again.' };
    } catch (e) {
      return { ok: false, errorCode: 'SAVE_FAILED', error: e instanceof Error ? e.message : 'Failed to release for countersign.' };
    }

    return { ok: true, outcome: 'released_for_countersign' };
  }

  // PS-327 (Batch 331): a direct PAD/FAD signature (including an
  // attending completing a countersign) needs signing authority. Checked
  // after the countersign gate, as in Surgical Pathology, so a resident
  // is routed for countersign rather than refused. Before this, anyone
  // who reached the button could sign.
  const decision = canFinalizeCase(
    getSessionUser(), caseData.participants,
    authority.participationTypes, authority.performingLabFacilityId, authority.jurisdiction,
  );
  if (!decision.granted) return { ok: false, errorCode: 'NOT_AUTHORIZED', error: decision.reason };

  // Forensic cases also need the signer's active jurisdictional
  // appointment, read live from their staff record. No admin override.
  if (caseData.autopsy.caseAuthority === 'statutory_judicial') {
    const staff = await userService.getById(signingUser.id).catch(() => null);
    const forensic = resolveForensicSignOutAuthority({
      caseAuthority: caseData.autopsy.caseAuthority,
      jurisdiction: caseData.autopsy.jurisdiction,
      signerCredentials: staff?.ok ? staff.data.providerCredentials : undefined,
      asOfDate: new Date().toISOString().slice(0, 10),
    });
    if (!forensic.allowed) {
      return { ok: false, errorCode: 'NO_FORENSIC_APPOINTMENT', error: `No active forensic appointment for ${caseData.autopsy.jurisdiction ?? 'this jurisdiction'}.` };
    }
  }

  const snapshot: AutopsyReportSnapshot = {
    tier,
    frozenPayload: {
      scope: caseData.autopsy.scope,
      jurisdiction: caseData.autopsy.jurisdiction,
      ...buildReportTextSnapshot(caseData),
    },
    signedBy: { name: signingUser.name, isPathologist: signingUser.isPathologist },
    signedAt: new Date().toISOString(),
  };

  // PS-71 (Batch 458): the signed content, as the signer saw it (used below
  // to refuse a save over content that changed since).
  const signedContent = JSON.stringify(snapshot.frozenPayload);

  // Real attending-side countersign completion — mirrors
  // useSignOutWorkflow.ts's own real pattern exactly: the attending
  // never sees a separate review screen; they just sign normally
  // (here, the same Sign PAD/Sign FAD action), and if a real,
  // still-pending CountersignRecord exists for this same tier, its
  // completion is captured alongside the real snapshot write, not as
  // a separate step. Matched on tier, not just caseId — an Autopsy
  // case can have two real, separate releases (PAD, then later FAD)
  // months apart; this must never complete the wrong one.
  const pendingRecordRes = await countersignService.getForCase(caseId).catch(() => null);
  const pendingRecord = pendingRecordRes?.ok ? pendingRecordRes.data : null;
  if (pendingRecord && pendingRecord.status === 'pending' && pendingRecord.autopsyReportTier === tier) {
    const currentAnswersByInstance: Record<string, Record<string, string | string[]>> = {
      [caseId]: buildCountersignComparisonSnapshot(caseData),
    };
    await countersignService.countersign({
      caseId,
      attendingId: signingUser.id,
      attendingName: signingUser.name,
      currentAnswersByInstance,
    }).catch(() => {});
  }

  // PS-71 (Batch 458): the snapshot is added to the newest copy of the
  // autopsy record and saved with its version (updateCaseWithRetry), so a
  // change to another part of the record saved in between is kept. A
  // signature is never applied to content the signer didn't see: if the
  // report content on the newest copy differs from what was signed (or the
  // PAD an FAD needs is gone), nothing is saved and the sign fails.
  try {
    const w = await updateCaseWithRetry(caseId, current => {
      const autopsy = (current as any).autopsy;
      if (!autopsy || (tier === 'FAD' && !autopsy.padSnapshot)) return null;
      const content = { scope: autopsy.scope, jurisdiction: autopsy.jurisdiction, ...buildReportTextSnapshot(current) };
      if (JSON.stringify(content) !== signedContent) return null;
      return {
        autopsy: {
          ...autopsy,
          ...(tier === 'PAD' ? { padSnapshot: snapshot } : { fadSnapshot: snapshot }),
          ...(gateOverrideEvent ? { gateOverrides: [...(autopsy.gateOverrides ?? []), gateOverrideEvent] } : {}),
        },
        ...(tier === 'FAD' ? { status: 'finalized' } : {}),
      } as any;
    }, caseRouter);
    if (!w.ok) return { ok: false, errorCode: 'SAVE_FAILED', error: 'The case changed while it was being signed; reopen it to see the latest report and sign again.' };
  } catch (e) {
    return { ok: false, errorCode: 'SAVE_FAILED', error: e instanceof Error ? e.message : 'Failed to sign the report.' };
  }

  // Batch 478: an override is never silent — the shared audit trail
  // always gets an entry, same real choke point recordAutopsyCustodyTransfer.ts
  // already uses, in addition to the append-only record on the case itself.
  if (gateOverrideEvent) {
    mockAuditService.logEvent({
      type: 'system',
      event: 'AUTOPSY_GATE_OVERRIDDEN',
      detail: `${tier} signed over a blocked authorization gate: ${gateOverrideEvent.blockedReasons.join(' ')} Reason: ${gateOverrideEvent.reason}`,
      user: signingUser.name,
      caseId,
      confidence: null,
    }).catch(() => {});
  }

  // Real, per direct follow-up ("wire in Autopsy") — routes through
  // the same, real, centralized Report_Released_Event every other
  // real dispatch in this app now goes through. Real, deliberate:
  // source defaults to 'SURGPATH' (omitted here), which is correct —
  // an Autopsy case's own gross/tissue-submission specimens are real
  // SynopticReportInstances (Case.synopticReports is a universal,
  // non-specialty-specific field, confirmed directly before this
  // change), so dispatchCaseInstances.ts's own real, existing loop
  // already processes them correctly; the real, Autopsy-specific
  // content itself (PAD/FAD's own frozen sections) reaches the
  // dispatch through buildOruR01Payload.ts's own new
  // narrative.autopsySections field instead, not through a second,
  // separate dispatch function. PAD signs as PRELIMINARY (an interim
  // milestone, matching this file's own header comment on why PAD
  // never changes CaseStatus); FAD as FINAL (the case's own real
  // terminal event).
  // Batch 534 (Pete: every report output follows the release delay). Recall reopens from Batch 535.
  const { releaseThroughDelay } = await import('../reportRelease/releaseThroughDelay');
  await releaseThroughDelay({
    caseId,
    reportType: tier === 'PAD' ? 'PRELIMINARY' : 'FINAL',
    releasedAt: new Date().toISOString(),
    releasedBy: { id: signingUser.id, name: signingUser.name },
    performingFacilityId: caseData.order?.facilityId,
    generatePdf,
  }, { kind: 'autopsy', releasedBy: { userId: signingUser.id, userName: signingUser.name }, subject: { previousStatus: caseData.status ?? 'in-progress' } });
  // Batch 535: previousStatus is the case status before this signature (Recall puts it back for a FAD). Batch 534 stored the tier here by mistake.

  return { ok: true, outcome: 'signed' };
}
