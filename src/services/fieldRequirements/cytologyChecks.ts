// src/services/fieldRequirements/cytologyChecks.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-359, Batch 386. What the Cytology screening page's five forms need before
// they can save, per the organisation's Field Requirements (page "cytology"):
//   - a Bethesda-style review          cytologyReviewMissing
//   - a CISOE-A (PALGA) review         cisoeaMissing
//   - a 5-year retrospective review    retrospectiveMissing
//   - a manual histology correlation   histologyCorrelationMissing
//   - a correction / an addendum        cytologyCorrectionMissing / cytologyAddendumMissing (Batch 390)
// The page decided these inline (the review's Save button looked only at the
// primary interpretation; the correlation's Record button at its two fields).
// The locked fields reproduce that; everything else is a switch. Every path
// that saves (the button and the voice command) asks these.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { missingRequiredFields, type FieldGroup, type ResolvedFieldRequirement } from './fieldRequirementRules';

const filled = (v: string): string => v.trim();
const yes = (present: boolean): string => (present ? 'yes' : '');
const inGroup = (requirements: readonly ResolvedFieldRequirement[], group: FieldGroup) =>
  requirements.filter(f => f.group === group);

/** Whether a Cytology field is required (drives the "*" beside a label). */
export function cytologyFieldRequired(requirements: readonly ResolvedFieldRequirement[], fieldId: string): boolean {
  return requirements.find(f => f.id === fieldId)?.required ?? false;
}

export interface CytologyReviewValues {
  generalCategorizationId: string;
  adequacyCount: number;
  primaryInterpretationId: string;
  primaryInterpretationComment: string;
  additionalCount: number;
  recommendationCount: number;
  notes: string;
  lastMenstrualPeriod: string;
}

/**
 * A Bethesda-style review. The primary interpretation is always required.
 * Its comment can only be asked for once one is chosen, and the last
 * menstrual period only applies to gynaecologic specimens.
 */
export function cytologyReviewMissing(values: CytologyReviewValues, isGynCytology: boolean, requirements: readonly ResolvedFieldRequirement[]): string[] {
  const hasPrimary = values.primaryInterpretationId !== '';
  return missingRequiredFields(inGroup(requirements, 'cytologyReview'), {
    reviewGeneralCategorization: filled(values.generalCategorizationId),
    reviewAdequacy: yes(values.adequacyCount > 0),
    reviewPrimaryInterpretation: filled(values.primaryInterpretationId),
    reviewPrimaryComment: hasPrimary ? filled(values.primaryInterpretationComment) : 'not applicable yet',
    reviewAdditional: yes(values.additionalCount > 0),
    reviewRecommendations: yes(values.recommendationCount > 0),
    reviewNotes: filled(values.notes),
    reviewLmp: isGynCytology ? filled(values.lastMenstrualPeriod) : 'not applicable',
  }).map(f => f.id);
}

export interface CisoeAValues {
  composition: string; compositionComment: string;
  inflammation: string; inflammationComment: string;
  squamous: string; squamousComment: string;
  otherEndometrium: string; otherEndometriumComment: string;
  endocervical: string; endocervicalComment: string;
  adequacy: string;
  notes: string;
}

/** A CISOE-A review: the six components are locked; "comments" means every axis carries one. */
export function cisoeaMissing(values: CisoeAValues, requirements: readonly ResolvedFieldRequirement[]): string[] {
  const comments = [values.compositionComment, values.inflammationComment, values.squamousComment, values.otherEndometriumComment, values.endocervicalComment];
  return missingRequiredFields(inGroup(requirements, 'cisoea'), {
    cisoeaComposition: filled(values.composition),
    cisoeaInflammation: filled(values.inflammation),
    cisoeaSquamous: filled(values.squamous),
    cisoeaOtherEndometrium: filled(values.otherEndometrium),
    cisoeaEndocervical: filled(values.endocervical),
    cisoeaAdequacy: filled(values.adequacy),
    cisoeaComments: yes(comments.every(c => filled(c) !== '')),
    cisoeaNotes: filled(values.notes),
  }).map(f => f.id);
}

/** Outcome that needs no corrective action: the prior result was right. */
export const RETROSPECTIVE_NO_ACTION_OUTCOME = 'confirmed_negative';

/** A 5-year retrospective review: the outcome, and (if the organisation asks) a corrective action for any outcome that isn't Confirmed Negative. */
export function retrospectiveMissing(outcome: string, correctiveAction: string, requirements: readonly ResolvedFieldRequirement[]): string[] {
  const actionApplies = outcome !== '' && outcome !== RETROSPECTIVE_NO_ACTION_OUTCOME;
  return missingRequiredFields(inGroup(requirements, 'retrospective'), {
    retroOutcome: filled(outcome),
    retroCorrectiveAction: actionApplies ? filled(correctiveAction) : 'not applicable',
  }).map(f => f.id);
}

/** A manually entered cyto-histologic correlation: the histology diagnosis and whether it agrees. */
export function histologyCorrelationMissing(diagnosis: string, outcome: string, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'histologyCorrelation'), {
    histologyDiagnosis: filled(diagnosis),
    histologyOutcome: filled(outcome),
  }).map(f => f.id);
}

/**
 * A correction to a signed-out report (Batch 390, PS-340): the corrected review
 * has to satisfy the same fields as any review, except the last menstrual period
 * (a patient fact) and the notes (not part of a correction); the reason is
 * always required.
 */
export function cytologyCorrectionMissing(
  draft: {
    generalCategorizationId: string; adequacySelections: readonly unknown[]; primaryInterpretationId: string; primaryInterpretationComment: string;
    additionalInterpretations: readonly unknown[]; recommendations: readonly unknown[];
  },
  reason: string,
  requirements: readonly ResolvedFieldRequirement[],
): string[] {
  const review = cytologyReviewMissing({
    generalCategorizationId: draft.generalCategorizationId,
    adequacyCount: draft.adequacySelections.length,
    primaryInterpretationId: draft.primaryInterpretationId,
    primaryInterpretationComment: draft.primaryInterpretationComment,
    additionalCount: draft.additionalInterpretations.length,
    recommendationCount: draft.recommendations.length,
    notes: 'not entered here',
    lastMenstrualPeriod: '',
  }, false, requirements).filter(id => id !== 'reviewNotes');
  const revision = missingRequiredFields(inGroup(requirements, 'cytologyRevision').filter(f => f.id === 'revisionReason'), {
    revisionReason: filled(reason),
  }).map(f => f.id);
  return [...review, ...revision];
}

/** An addendum to a signed-out report: what is being added and why. */
export function cytologyAddendumMissing(addendumText: string, reason: string, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'cytologyRevision'), {
    revisionAddendumText: filled(addendumText),
    revisionReason: filled(reason),
  }).map(f => f.id);
}
