// src/pages/SynopticReportPage/hooks/checkPeerReviewAndMismatch.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 439: two more sign-out checks, run after the stain QC gate on both
// sign-out paths (handleSignOutConfirm and finalizeCase), in this order:
//   1. PS-145 — a suggested clinical-pathologic mismatch the pathologist
//      hasn't decided yet (one decision per case: a recorded
//      Clinical-Pathologic Correlation ends the check);
//   2. PS-144 — the peer-review gate, only where it is switched on.
// Decisions: services/clinical/detectClinicalPathologicMismatch.ts and
// services/quality/peerReviewStatus.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { clinicalMismatchService, peerReviewStatusFor, qaActivityRecordService, type ClinicalMismatchSuggestion, type PeerReviewStatus } from '@/services';
import { CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID } from '@/services/quality/capaRecommendationRules';
import { malignantNow } from '@/services/quality/peerReviewRules';
import { clinicalHistoryText } from '@/services/clinical/clinicalHistoryText';
import type { Case } from '@/types/case/Case';

/** The mismatch suggestion to decide before sign-out, or null. */
export async function checkClinicalMismatch(caseData: Case): Promise<ClinicalMismatchSuggestion | null> {
  const records = await qaActivityRecordService.getAll().catch(() => null);
  if (records?.ok && records.data.some(r => r.caseId === caseData.id && r.activityTypeId === CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID)) return null;
  const res = await clinicalMismatchService.detect({
    clinicalIndication: caseData.order?.clinicalIndication ?? '',
    clinicalHistory: clinicalHistoryText(caseData.order?.clinicalHistory),
    microscopic: caseData.diagnostic?.microscopicDescription ?? '',
    diagnosis: caseData.diagnostic?.primaryDiagnosis ?? '',
    malignantNow: malignantNow(caseData),
  }).catch(() => null);
  return res?.ok ? res.data : null;
}

/** The peer-review status when it stops sign-out, or null. */
export async function checkPeerReviewGate(caseData: Case): Promise<PeerReviewStatus | null> {
  const status = await peerReviewStatusFor(caseData).catch(() => null);
  return status?.blocksSignOut ? status : null;
}
