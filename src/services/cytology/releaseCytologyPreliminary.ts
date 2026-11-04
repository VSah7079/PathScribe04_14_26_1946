// src/services/cytology/releaseCytologyPreliminary.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 533 (Pete, Oct 12, 2026: an urgent finding goes out "as a
// preliminary", per specimen). Since Batch 532 nothing on a cytology case is
// published until the case closes; this is the one exception. A pathologist
// can send one specimen's result, built from its chosen final diagnosis,
// ahead of the case report:
//
//   1. permission: cytology:preliminary:release (no built-in role starts with
//      it; each laboratory grants it: Pete, "Configurable");
//   2. a quick-pick reason (cytologyPreliminaryReasons.ts), a note optional;
//   3. the specimen has a final diagnosis and is not yet signed out, and the
//      case report hasn't been released (after that the result is out);
//   4. the electronic signature, when the laboratory requires it (Pete:
//      "configurable"; cytologyComplianceFeatures.ts `preliminarySignature`,
//      Automatic = required everywhere);
//   5. the release is kept on the case (Case.cytologyPreliminaryReleases),
//      audited, and published as PRELIMINARY, Urgent, with its own PDF
//      (a "PRELIMINARY REPORT" banner) to the EMR, print and fax; since
//      Batch 534 after the laboratory's release delay, like every output.
//
// Never sent to a screening registry (registries take the signed result).
// The specimen still signs out as usual, and the case report (FINAL)
// supersedes the preliminary. Dependencies are passed in.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CytologyReportContent } from '@/types/cytology/CytologyReportContent';
import type { CytologyPreliminaryRelease } from '@/types/cytology/CytologyPreliminaryRelease';
import type { SignatureConfirmation } from '../auth/signerConfirmation';
import type { CytologySignOutDeps } from './signOutCytologyCase';
import { updateCaseWithRetry } from '../cases/caseWrite';
import { caseWriteDepsFrom } from './cytologyCaseWriteDeps';
import { resolveCytologyComplianceFeatures } from './cytologyComplianceFeatures';
import { cytologyCaseIsReleased } from './cytologyCaseReportMessage';
import { isCytologyPreliminaryReason } from './cytologyPreliminaryReasons';

export const CYTOLOGY_PRELIMINARY_RELEASE = 'cytology:preliminary:release';

export type CytologyPreliminaryDeps = Pick<CytologySignOutDeps,
  'enforce' | 'signatureGate' | 'getCase' | 'updateCase' | 'getCaseSignOutRecords' | 'getComplianceSettings' | 'logAudit' | 'publishReportReleased' | 'releaseReport' | 'now' | 'newId'
> & {
  /** The preliminary's own PDF (the specimen report with its banner). */
  renderPdfSnapshot: (content: CytologyReportContent) => Promise<{ pdfBase64?: string; generationError?: string }>;
};

export interface CytologyPreliminaryInput {
  caseData: Case;
  specimenId: string;
  /** The specimen's chosen final diagnosis review, and the content built from it (cytologyReviewReportContent). */
  reviewRecordId: string | undefined;
  content: CytologyReportContent | null;
  reason: string;
  note?: string;
  user: { id: string; name: string; isPathologist: boolean };
  /** Needed when the laboratory requires the signature (preliminarySignatureRequired). */
  confirmation?: SignatureConfirmation;
}

export type CytologyPreliminaryOutcome =
  | { ok: true; release: CytologyPreliminaryRelease }
  | { ok: false; error: 'notPermitted' | 'reasonMissing' | 'noFinalDiagnosis' | 'alreadySignedOut' | 'caseReleased' | 'signatureRequired' | 'signatureRefused' | 'notSaved'; reason?: string };

/** Whether the laboratory requires the electronic signature for a preliminary (default: yes). */
export async function preliminarySignatureRequired(caseData: Case, deps: Pick<CytologyPreliminaryDeps, 'getComplianceSettings'>): Promise<boolean> {
  const settings = await deps.getComplianceSettings(caseData.order?.facilityId).catch(() => null);
  return resolveCytologyComplianceFeatures(undefined, settings?.enterprise, settings?.facility).preliminarySignature;
}

/** Whether a specimen can have a preliminary sent now (pure): a final diagnosis, not signed out, case not released. */
export function cytologyPreliminaryBlock(
  caseData: Pick<Case, 'status' | 'cytologyEarlyFinalization'>,
  specimenSigned: boolean,
  hasFinalDiagnosis: boolean,
): 'noFinalDiagnosis' | 'alreadySignedOut' | 'caseReleased' | null {
  if (cytologyCaseIsReleased(caseData)) return 'caseReleased';
  if (specimenSigned) return 'alreadySignedOut';
  if (!hasFinalDiagnosis) return 'noFinalDiagnosis';
  return null;
}

/** The urgent preliminaries already sent for a specimen, newest first (pure). */
export function cytologyPreliminariesFor(caseData: Pick<Case, 'cytologyPreliminaryReleases'> | null | undefined, specimenId: string): CytologyPreliminaryRelease[] {
  return (caseData?.cytologyPreliminaryReleases ?? []).filter(r => r.specimenId === specimenId)
    .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
}

export async function releaseCytologyPreliminary(input: CytologyPreliminaryInput, deps: CytologyPreliminaryDeps): Promise<CytologyPreliminaryOutcome> {
  const { caseData, specimenId, user } = input;
  const decision = await deps.enforce('cytology:preliminary:release', { caseId: caseData.id });
  if (!decision.allowed) return { ok: false, error: 'notPermitted' };
  if (!isCytologyPreliminaryReason(input.reason)) return { ok: false, error: 'reasonMissing' };

  const records = await deps.getCaseSignOutRecords(caseData.id);
  const signed = records.ok && records.data.some(r => r.specimenId === specimenId);
  const block = cytologyPreliminaryBlock(caseData, signed, !!input.reviewRecordId && !!input.content);
  if (block) return { ok: false, error: block };

  const caseRef = caseData.accession?.fullAccession ?? caseData.id;
  const signatureNeeded = await preliminarySignatureRequired(caseData, deps);
  if (signatureNeeded) {
    if (!input.confirmation) return { ok: false, error: 'signatureRequired' };
    const accepted = await deps.signatureGate.accept(input.confirmation, { caseId: caseData.id, caseRef, actions: ['cytology-preliminary'] });
    if (accepted.ok === false) return { ok: false, error: 'signatureRefused', reason: accepted.reason };
  }

  const releasedAt = deps.now().toISOString();
  const note = input.note?.trim() || undefined;
  const release: CytologyPreliminaryRelease = {
    id: `cyto-prelim-${deps.newId()}`,
    specimenId,
    reviewRecordId: input.reviewRecordId!,
    reason: input.reason,
    ...(note ? { note } : {}),
    releasedAt,
    releasedBy: { userId: user.id, userName: user.name },
    signed: signatureNeeded,
    reportContent: {
      ...input.content!,
      signedBy: { name: user.name, isPathologist: user.isPathologist },
      signedAt: releasedAt,
      preliminary: { reason: input.reason, ...(note ? { note } : {}) },
    },
  };

  const saved = await updateCaseWithRetry(caseData.id, current => ({
    cytologyPreliminaryReleases: [...(current.cytologyPreliminaryReleases ?? []), release],
  }), caseWriteDepsFrom(deps.getCase, deps.updateCase));
  if (saved.ok === false) {
    if (signatureNeeded) deps.signatureGate.release(caseData.id);
    return { ok: false, error: 'notSaved' };
  }
  if (signatureNeeded) await deps.signatureGate.commit(caseData.id, 'signed', { kind: 'cytology-preliminary', id: release.id });

  deps.logAudit({
    type: 'user', event: 'CYTOLOGY_PRELIMINARY_RELEASED', caseId: caseData.id, user: user.name || user.id, confidence: null,
    detail: `Urgent preliminary report sent for specimen ${specimenId} (reason: ${input.reason}${note ? `; note: ${note}` : ''}; ${signatureNeeded ? 'signed' : 'no signature required by the laboratory'}).`,
  });

  const event = {
    caseId: caseData.id, reportType: 'PRELIMINARY' as const, instanceId: release.id, priority: 'Urgent' as const,
    releasedAt, releasedBy: { id: user.id, name: user.name }, source: 'CYTOLOGY' as const,
    performingFacilityId: caseData.order?.facilityId,
    generatePdf: () => deps.renderPdfSnapshot(release.reportContent),
  };
  // Batch 534 (Pete): it follows the release delay like every output (STAT bypass included); its sender can recall it.
  if (deps.releaseReport) {
    await deps.releaseReport(event, { kind: 'cytology-preliminary', releasedBy: { userId: user.id, userName: user.name }, subject: { specimenId } });
  } else {
    await deps.publishReportReleased(event);
  }
  return { ok: true, release };
}
