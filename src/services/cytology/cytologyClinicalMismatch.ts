// src/services/cytology/cytologyClinicalMismatch.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 523 (PS-145, Pete's decision 15): the clinical-pathologic mismatch
// check before a cytology specimen is signed out.
//
//   - Pathologist track only. The cytotechnologist track signs out negatives,
//     and recording the decision needs case:clinical-mismatch:record, which
//     cytotechnologists don't hold.
//   - Once per specimen (each specimen is signed out on its own).
//   - What is compared: services/clinical/clinicalMismatchInputs.ts
//     (cytologyMismatchInput). An abnormal GYN screen is never "unexpected".
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { CytologyCategoryEntry } from './ICytologyCategoryService';
import type { ClinicalMismatchInput } from '../clinical/detectClinicalPathologicMismatch';
import type { ClinicalMismatchAssessment } from '../clinical/clinicalMismatchService';
import type { ClinicalMismatchDecisionInput } from '../clinical/clinicalMismatchDecision';
import { cytologyMismatchInput } from '../clinical/clinicalMismatchInputs';

export interface CytologyMismatchCheckInput {
  caseData: Case;
  specimenId: string;
  isPathologist: boolean;
  finalReview?: Parameters<typeof cytologyMismatchInput>[1];
  categories: readonly CytologyCategoryEntry[];
  gynScreening: boolean;
}

/** Batch 530 (PS-554): clinicalMismatchService.atSignOut — only a high-risk mismatch comes back; a low-risk one is logged. */
export type MismatchAtSignOut = (
  input: ClinicalMismatchInput,
  scope: { caseId: string; specimenId?: string },
  specimenTypeIds: readonly string[],
  meta: Pick<ClinicalMismatchDecisionInput, 'caseType' | 'subspecialtyId' | 'clinicalIndication' | 'discipline'>,
) => Promise<ClinicalMismatchAssessment | null>;

/** The high-risk mismatch to decide before this specimen is signed out, or null. */
export async function cytologyClinicalMismatch(input: CytologyMismatchCheckInput, atSignOut: MismatchAtSignOut): Promise<ClinicalMismatchAssessment | null> {
  if (!input.isPathologist || !input.finalReview) return null;
  const specimen = input.caseData.specimens?.find(s => s.id === input.specimenId);
  return atSignOut(
    cytologyMismatchInput(input.caseData, input.finalReview, input.categories, input.gynScreening),
    { caseId: input.caseData.id, specimenId: input.specimenId },
    specimen?.specimenDictionaryEntryId ? [specimen.specimenDictionaryEntryId] : [],
    { caseType: specimen?.description || input.caseData.id, subspecialtyId: input.caseData.subspecialtyId, clinicalIndication: input.caseData.order?.clinicalIndication, discipline: 'cytology' },
  );
}

/**
 * Batch 531 (Pete, Oct 12: cytology consistent with surgical and autopsy):
 * what the Cytology Workspace checks in the background (Gate A), or null:
 * pathologist track only, once the specimen has a final diagnosis, and not
 * after it is signed out. Pure.
 */
export function cytologyWorkspaceMismatchInput(input: CytologyMismatchCheckInput & { signedOut: boolean }): ClinicalMismatchInput | null {
  if (!input.isPathologist || !input.finalReview || input.signedOut) return null;
  return cytologyMismatchInput(input.caseData, input.finalReview, input.categories, input.gynScreening);
}

