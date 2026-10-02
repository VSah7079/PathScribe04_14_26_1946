// src/services/cytology/reviseCytologyReviewForSignOut.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 412 (Pete: "Revise and sign out"; the pathologist is the final
// gatekeeper and shouldn't bounce a draft back to the cytotechnologist).
//
// A pathologist starts from a cytotechnologist's review, copied into their own
// (the CT's review is never edited: Pete, "No, keep separate", so what the CT
// called stays on record for CLIA and the agreement statistics). Saving it:
//   1. saves the pathologist's review (saveCytologyReview: permission, workload,
//      the stored agreement with the initial screen, and resolving any open
//      revision requests);
//   2. makes it the specimen's final diagnosis (selectCytologyFinalDiagnosis:
//      its own permission and gate);
//   3. audits that a pathologist modified the screen, when the diagnosis differs.
// The screen then opens the signature for sign-out.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import type { CytologyWorkspaceDeps } from './cytologyWorkspacePorts';
import type { CytologyGateContext } from './cytologyWorkspaceView';
import { saveCytologyReview, type SaveCytologyReviewInput, type SaveCytologyReviewOutcome } from './saveCytologyReview';
import { selectCytologyFinalDiagnosis } from './cytologyCaseActions';

export interface ReviseForSignOutOutcome {
  outcome: 'notPathologist' | 'saveFailed' | 'selectionRefused' | 'readyToSign';
  save?: SaveCytologyReviewOutcome;
  selection?: 'notPermitted' | 'pathologistOnly' | 'selected';
}

export async function reviseCytologyReviewForSignOut(
  input: SaveCytologyReviewInput & { sourceReview: CytologyReviewRecord; gate: CytologyGateContext },
  deps: CytologyWorkspaceDeps,
): Promise<ReviseForSignOutOutcome> {
  if (!input.isPathologist) return { outcome: 'notPathologist' };
  const save = await saveCytologyReview(input, deps);
  if (save.outcome !== 'saved' || !save.reviewId) return { outcome: 'saveFailed', save };

  // The save may have changed the specimen (review notes): select on the case as it is now.
  const [fresh, reviews] = await Promise.all([deps.getCase(input.caseData.id, input.user.id), deps.getReviewsForSpecimen(input.specimenId)]);
  const review = reviews.ok ? reviews.data.find(r => r.id === save.reviewId) : undefined;
  if (!review) return { outcome: 'saveFailed', save };
  const selection = await selectCytologyFinalDiagnosis({
    caseData: fresh ?? input.caseData, specimenId: input.specimenId, review, user: input.user, gate: input.gate,
  }, deps);
  if (selection !== 'selected') return { outcome: 'selectionRefused', save, selection };

  const a = save.agreement;
  if (a && (a.level !== 'exact' || a.adequacyDiscrepancy || a.addedInterpretationIds.length || a.missedInterpretationIds.length || a.addedRecommendationIds.length || a.missedRecommendationIds.length)) {
    deps.logAudit({
      type: 'user', event: 'Pathologist revised cytology screen before sign-out',
      detail: `${input.user.name} revised ${input.sourceReview.recordedBy.userName}'s review ${input.sourceReview.id} as review ${save.reviewId} (specimen ${input.specimenId}): ${a.level}${a.majorSubtype ? ` (${a.majorSubtype})` : ''}${a.adequacyDiscrepancy ? ', adequacy differs' : ''}; added ${a.addedInterpretationIds.join(', ') || 'none'}; removed ${a.missedInterpretationIds.join(', ') || 'none'}`,
      user: input.user.name || input.user.id, caseId: input.caseData.accession?.fullAccession ?? input.caseData.id, confidence: null,
    });
  }
  return { outcome: 'readyToSign', save, selection };
}
