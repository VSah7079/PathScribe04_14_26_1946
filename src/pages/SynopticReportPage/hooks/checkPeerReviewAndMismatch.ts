// src/pages/SynopticReportPage/hooks/checkPeerReviewAndMismatch.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 439: two more sign-out checks, run after the stain QC gate on both
// sign-out paths (handleSignOutConfirm and finalizeCase), in this order:
//   1. PS-145 — a suggested clinical-pathologic mismatch the pathologist
//      hasn't decided yet (one decision per case: a recorded
//      Clinical-Pathologic Correlation ends the check);
//   2. PS-144 — the peer-review gate, only where it is switched on.
// Decisions: services/clinical/detectClinicalPathologicMismatch.ts and
// services/quality/peerReviewStatus.ts. Batch 523: the inputs and the
// "already decided" rule moved to services/clinical/clinicalMismatchInputs.ts,
// and the autopsy FAD check is here too.
// ─────────────────────────────────────────────────────────────────────────────

import { clinicalMismatchService, peerReviewStatusFor, type ClinicalMismatchAssessment, type PeerReviewStatus } from '@/services';
import { autopsyMismatchInput, caseSpecimenTypeIds, surgicalMismatchInput } from '@/services/clinical/clinicalMismatchInputs';
import { addendumMismatchInput, caseHasPendingAmendment } from '@/services/clinical/amendmentMismatch';
import type { Case } from '@/types/case/Case';

// Batch 530 (PS-554): Gate B. Only a high-risk mismatch (a Block rule
// reached) comes back to be decided; a low-risk one is logged to the QA
// dashboard and sign-out goes on (clinicalMismatchService.atSignOut).
const meta = (c: Case, discipline: 'surgical' | 'autopsy') => ({
  caseType: c.specimens?.[0]?.description || c.id, subspecialtyId: c.subspecialtyId,
  clinicalIndication: c.order?.clinicalIndication, discipline,
});

/**
 * The high-risk mismatch to decide before sign-out, or null. Batch 609 (#31):
 * the re-sign-out of an amendment or correction (a report is unlocked for it)
 * is checked the same way, and the lab setting decides whether a Block rule
 * holds that release (clinicalMismatchService.atRevision).
 */
export async function checkClinicalMismatch(caseData: Case): Promise<ClinicalMismatchAssessment | null> {
  if (caseHasPendingAmendment(caseData)) {
    return clinicalMismatchService.atRevision(surgicalMismatchInput(caseData), { caseId: caseData.id }, caseSpecimenTypeIds(caseData), meta(caseData, 'surgical'));
  }
  return clinicalMismatchService.atSignOut(surgicalMismatchInput(caseData), { caseId: caseData.id }, caseSpecimenTypeIds(caseData), meta(caseData, 'surgical'));
}

/** Batch 609 (#31): an addendum's text checked with the report's diagnosis before it is released; the assessment to decide first, or null. */
export async function checkAddendumMismatch(caseData: Case, addendumText: string): Promise<ClinicalMismatchAssessment | null> {
  const input = addendumMismatchInput(caseData, addendumText);
  if (!input) return null;
  return clinicalMismatchService.atRevision(input, { caseId: caseData.id }, caseSpecimenTypeIds(caseData), meta(caseData, caseData.autopsy ? 'autopsy' : 'surgical'));
}

/** Batch 523 (decision 15): the same check before an autopsy's FAD is signed, against the report sections on screen. */
export async function checkAutopsyClinicalMismatch(caseData: Case, sections?: readonly { label?: string; text?: string }[]): Promise<ClinicalMismatchAssessment | null> {
  return clinicalMismatchService.atSignOut(autopsyMismatchInput(caseData, sections), { caseId: caseData.id }, caseSpecimenTypeIds(caseData), meta(caseData, 'autopsy'));
}

/** The peer-review status when it stops sign-out, or null. */
export async function checkPeerReviewGate(caseData: Case): Promise<PeerReviewStatus | null> {
  const status = await peerReviewStatusFor(caseData).catch(() => null);
  return status?.blocksSignOut ? status : null;
}
