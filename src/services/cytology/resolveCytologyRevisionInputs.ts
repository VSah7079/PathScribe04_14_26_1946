// src/services/cytology/resolveCytologyRevisionInputs.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-340 (Batch 390): what the Cytology screening page hands to
// releaseCytologyCorrection / releaseCytologyAddendum, decided here rather than
// in the component. Pure.
//
//   latestCytologySignOut        the record a correction or addendum builds on
//   correctionDraftFromReview    the correction form's starting point: the
//                                signed review, comments included (the
//                                pathologist is amending their own report)
//   buildCorrectedFindings       the draft as releaseCytologyCorrection's
//                                correctedFindings, with the review-needed flag
//                                worked out from the categories
//   resolveCytologyReleaseContext  patient, order and specimen as the report
//                                content wants them
//
// Text that goes into the report ("Unknown Patient", "Cytology specimen") stays
// English: it is stored data, as at sign-out.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyReviewRecord, CytologyCategorySelection } from '@/types/cytology/CytologyReviewRecord';
import { allCytologyInterpretationIds } from '@/types/cytology/CytologyReviewRecord';
import type { CytologySignOutRecord } from '@/types/cytology/CytologySignOutRecord';
import type { CytologyCategoryEntry } from './ICytologyCategoryService';
import { resolveCytologyReviewRequirement } from './resolveCytologyReviewRequirement';

export interface CytologyCorrectionDraft {
  generalCategorizationId: string;
  adequacySelections: CytologyCategorySelection[];
  primaryInterpretationId: string;
  primaryInterpretationComment: string;
  additionalInterpretations: CytologyCategorySelection[];
  recommendations: CytologyCategorySelection[];
}

export const EMPTY_CORRECTION_DRAFT: CytologyCorrectionDraft = {
  generalCategorizationId: '', adequacySelections: [], primaryInterpretationId: '', primaryInterpretationComment: '',
  additionalInterpretations: [], recommendations: [],
};

/** The specimen's current signed-out record: the most recently signed. */
export function latestCytologySignOut(records: readonly CytologySignOutRecord[]): CytologySignOutRecord | undefined {
  return [...records].sort((a, b) => b.signedAt.localeCompare(a.signedAt))[0];
}

export function correctionDraftFromReview(review: CytologyReviewRecord | undefined): CytologyCorrectionDraft {
  if (!review) return { ...EMPTY_CORRECTION_DRAFT };
  return {
    generalCategorizationId: review.generalCategorizationId ?? '',
    adequacySelections: (review.adequacySelections ?? []).map(s => ({ ...s })),
    primaryInterpretationId: review.primaryInterpretationId,
    primaryInterpretationComment: review.primaryInterpretationComment ?? '',
    additionalInterpretations: (review.additionalInterpretations ?? []).map(s => ({ ...s })),
    recommendations: (review.recommendations ?? []).map(s => ({ ...s })),
  };
}

export function buildCorrectedFindings(draft: CytologyCorrectionDraft, categories: CytologyCategoryEntry[]) {
  return {
    adequacySelections: draft.adequacySelections.length ? draft.adequacySelections : undefined,
    generalCategorizationId: draft.generalCategorizationId || undefined,
    primaryInterpretationId: draft.primaryInterpretationId,
    primaryInterpretationComment: draft.primaryInterpretationComment.trim() || undefined,
    additionalInterpretations: draft.additionalInterpretations.length ? draft.additionalInterpretations : undefined,
    recommendations: draft.recommendations.length ? draft.recommendations : undefined,
    requiresPathologistReview: resolveCytologyReviewRequirement(
      allCytologyInterpretationIds({ primaryInterpretationId: draft.primaryInterpretationId, additionalInterpretations: draft.additionalInterpretations }),
      categories,
    ),
  };
}

/** Loose on purpose: the case and specimen shapes are the page's own (`any` there too). */
export function resolveCytologyReleaseContext(caseData: any, specimen: any) {
  const patient = caseData?.patient;
  const screening = specimen?.cytologyScreening ?? {};
  return {
    patient: {
      name: patient ? `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() : 'Unknown Patient',
      dateOfBirth: patient?.dateOfBirth,
      mrn: patient?.mrn,
      lastMenstrualPeriod: patient?.lastMenstrualPeriod,
      hormonalStatus: patient?.hormonalStatus,
      priorAbnormalPapHpvHistory: patient?.priorAbnormalPapHpvHistory,
      iudOrContraceptionUse: patient?.iudOrContraceptionUse,
    },
    order: {
      accessionNumber: caseData?.accession?.fullAccession ?? caseData?.id,
      orderingProvider: caseData?.order?.requestingProvider,
      facilityId: caseData?.order?.facilityId,
    },
    specimen: {
      typeDescription: specimen?.description ?? 'Cytology specimen',
      collectedAt: specimen?.collectedAt,
      receivedAt: specimen?.receivedAt,
      preparationMethod: screening.preparationMethod,
      computerAssistedScreening: screening.computerAssistedScreening,
      hpvResult: screening.hpvResult,
      hpvGenotypeDetail: screening.hpvGenotypeDetail,
      hpvOrderReason: screening.hpvOrderReason,
      educationalNotes: screening.educationalNotes,
    },
  };
}
