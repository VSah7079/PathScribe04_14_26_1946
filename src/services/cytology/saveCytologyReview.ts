// src/services/cytology/saveCytologyReview.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 410 (PS-359; Pete: every workspace action gets its own permission,
// today's users keep it). Saving a cytology screening review, moved out of
// CytologyScreeningPage.tsx's two save handlers (Bethesda-style and CISOE-A)
// so the decisions live in one tested service. In order:
//
//   0. Permission: cytology:review:record, for the case (new).
//   1. CISOE-A only: the six-axis score is complete and valid (the errors and
//      warnings go back to the form either way).
//   2. CLIA workload (42 CFR § 493.1274), when the lab has it on (Batch 415:
//      on for a US lab by default, off elsewhere): the review's SCU weight against the
//      reviewer's cap, prorated by active screening hours over the last 24 h
//      (earlier ledger entries plus this session's active seconds). Over
//      capacity, the reviewer's other pending cytology cases go back to the
//      pool. A new review is then refused (and this case goes back too); an
//      escalation of a review already saved (FOV-assisted to full manual
//      rescreen) is let through so no clinical data is orphaned.
//   3. The review is updated (the reviewer's own) or created (in the resolved
//      role), with requiresPathologistReview worked out from its picks.
//   4. A new initial review (primary_screen) is checked for high-risk patient
//      factors (targeted QC); if none, it may be picked for random QC by the
//      effective QC settings. A new QC or secondary review records the
//      secondary-screening QA activity, comparing it with the initial review.
//   5. The workload ledger entry, only after a save that succeeded.
//
// Batch 412: an edit keeps the review as it stood (priorVersions), and saving
// settles the specimen's review notes: the author's acknowledged notes become
// revised, and a pathologist's review resolves open revision requests
// (cytologyReviewNotes.ts). Every change to the specimen is one write.
//
// Any review after the initial screen stores its agreement with it
// (agreementWithInitial: level, subtype, adequacy, what was added or missed;
// Batch 410, Pete). An edit re-assesses it and keeps the earlier assessment.
//
// Returns what happened; the page shows it.
// ─────────────────────────────────────────────────────────────────────────────

import { qcByPrimaryScreener } from './cytologyQueues';
import type { Case } from '@/types/case/Case';
import type { CytologyReviewAgreement, CytologyReviewMode, CytologyReviewRecord, CytologyReviewRole, CytologyReviewVersion } from '@/types/cytology/CytologyReviewRecord';
import { allCytologyInterpretationIds } from '@/types/cytology/CytologyReviewRecord';
import type { CytologyCategoryEntry } from './ICytologyCategoryService';
import type { CytologyWorkspaceDeps } from './cytologyWorkspacePorts';
import type { Draft } from './cytologyReviewDraft';
import { reviewFieldsFromDraft } from './cytologyReviewDraft';
import { type CisoeADraft, resolveCisoeAScoreFromDraft, resolveCisoeAPartialFromDraft } from './cisoeADraft';
import { resolveCisoeAValidation } from './resolveCisoeAValidation';
import { resolveCisoeAToBethesda } from './resolveCisoeAToBethesda';
import { resolveCisoeAAdequacyToBethesda } from './resolveCisoeAAdequacyToBethesda';
import { resolveCytologyReviewRequirement } from './resolveCytologyReviewRequirement';
import { resolveCytologyScuWeight } from './resolveCytologyScuWeight';
import { resolveCytologyWorkloadCapacity, type CytologyWorkloadCapacityStatus } from './resolveCytologyWorkloadCapacity';
import { resolveEffectiveCytologyWorkloadCap } from './resolveEffectiveCytologyWorkloadCap';
import { resolveCytologyWorkloadReassignmentCandidates } from './resolveCytologyWorkloadReassignmentCandidates';
import { resolveIsRetroactiveScuEscalation } from './resolveIsRetroactiveScuEscalation';
import { resolveCytologyReviewMode } from './resolveCytologyReviewMode';
import { resolveCytologyHighRiskFactorsForCase } from './resolveCytologyHighRiskFactorsForCase';
import { resolveCytologyHighRiskStatus } from './resolveCytologyHighRiskStatus';
import { resolveEffectiveCytologyQcSettings } from './resolveEffectiveCytologyQcSettings';
import { resolveCytologyRandomQcSelection } from './resolveCytologyRandomQcSelection';
import { resolveCytologyCategorySetConcordance } from './resolveCytologyCategorySetConcordance';
import { GYN_CYTOLOGY_SECONDARY_SCREENING_ACTIVITY_TYPE_ID } from '../quality/mockQaActivityTypeService';
import { patchCytologyScreening } from './cytologyCaseActions';
import { initialScreenFor, resolveCytologyReviewAgreement } from './resolveCytologyReviewAgreement';
import { reviewNotesAfterSave } from './cytologyReviewNotes';
import { resolveCytologyComplianceFeatures } from './cytologyComplianceFeatures';
import type { Jurisdiction } from '@/types/systemConfig';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SaveCytologyReviewInput {
  form: { kind: 'standard'; draft: Draft } | { kind: 'cisoeA'; draft: CisoeADraft; bethesdaForMapping: CytologyCategoryEntry[] };
  caseData: Case;
  specimenId: string;
  specimen: any;
  user: { id: string; name: string };
  isPathologist: boolean;
  /** How the CT screened this pass; a pathologist's review is always pathologist_review. */
  reviewMode: CytologyReviewMode;
  /** The reviewer's own review on this specimen, when editing it. */
  editingReviewId: string | null;
  /** The specimen's reviews before this save. */
  reviews: CytologyReviewRecord[];
  resolvedRole: CytologyReviewRole;
  categories: CytologyCategoryEntry[];
  /** Seconds this tab has been visible on this specimen (active screening time). */
  activeScreeningSeconds: number;
}

/** One flat shape: this project's tsconfig doesn't narrow unions reliably. */
export interface SaveCytologyReviewOutcome {
  outcome: 'notPermitted' | 'incomplete' | 'invalid' | 'workloadBlocked' | 'saved' | 'failed' | 'qcByPrimaryScreener';
  /** CISOE-A: the score's errors and warnings (empty when valid). */
  validation?: { errors: string[]; warnings: string[] };
  /** The workload check (null when the settings couldn't be read). */
  capacity?: CytologyWorkloadCapacityStatus | null;
  /** Over capacity: blocked (a new review) or let through as an escalation. */
  workloadNotice?: 'blocked' | 'escalation' | null;
  reviewId?: string;
  created?: boolean;
  /** QC applied to the specimen by this save. */
  qcFlagApplied?: 'targeted_high_risk' | 'random_selection';
  /** The agreement with the initial screen stored on the review (a later review only). */
  agreement?: CytologyReviewAgreement;
}

const SECONDARY_SCREENING_TRIGGER_ROLES: CytologyReviewRole[] = ['qc_random_selection', 'qc_targeted_high_risk', 'secondary_reviewer'];
const DAY_MS = 24 * 60 * 60 * 1000;

export async function saveCytologyReview(input: SaveCytologyReviewInput, deps: CytologyWorkspaceDeps): Promise<SaveCytologyReviewOutcome> {
  const { form, caseData, specimenId, user } = input;
  if (form.kind === 'standard' && !form.draft.primaryInterpretationId) return { outcome: 'incomplete' };

  const decision = await deps.enforce('cytology:review:record', { caseId: caseData.id });
  if (!decision.allowed) return { outcome: 'notPermitted' };
  // Batch 440: a QC rescreen is an independent second look; the person who
  // did the primary screen can't record it (editing a review is unaffected).
  if (!input.editingReviewId && qcByPrimaryScreener(input.resolvedRole, input.reviews, user.id)) return { outcome: 'qcByPrimaryScreener' };

  // 1. The review's fields.
  let fields: Record<string, unknown>;
  let validation: SaveCytologyReviewOutcome['validation'];
  if (form.kind === 'cisoeA') {
    const score = resolveCisoeAScoreFromDraft(form.draft);
    const v = resolveCisoeAValidation(score ?? resolveCisoeAPartialFromDraft(form.draft));
    validation = { errors: v.errors, warnings: v.warnings };
    if (!v.valid || !score) return { outcome: 'invalid', validation };
    const { primaryInterpretationId, additionalInterpretationIds } = resolveCisoeAToBethesda(score, form.bethesdaForMapping);
    fields = {
      adequacySelections: [{ categoryId: resolveCisoeAAdequacyToBethesda(score.adequacy) }],
      primaryInterpretationId,
      additionalInterpretations: additionalInterpretationIds.map(id => ({ categoryId: id })),
      cisoeAScore: score,
      requiresPathologistReview: resolveCytologyReviewRequirement([primaryInterpretationId, ...additionalInterpretationIds], form.bethesdaForMapping),
      notes: form.draft.notes || undefined,
      // CISOE-A and the Synoptic drawer are mutually exclusive: never a synoptic block on a CISOE-A review.
      synopticData: undefined,
    };
  } else {
    const d = form.draft;
    fields = {
      ...reviewFieldsFromDraft(d),
      requiresPathologistReview: resolveCytologyReviewRequirement(
        allCytologyInterpretationIds({ primaryInterpretationId: d.primaryInterpretationId, additionalInterpretations: d.additionalInterpretations }),
        input.categories),
    };
  }

  // 2. Workload.
  const existing = input.editingReviewId ? input.reviews.find(r => r.id === input.editingReviewId) : undefined;
  const targetReviewMode: CytologyReviewMode = input.isPathologist ? 'pathologist_review' : input.reviewMode;
  const capacity = await checkWorkloadCapacity(input, targetReviewMode, deps);
  let workloadNotice: SaveCytologyReviewOutcome['workloadNotice'] = null;
  if (capacity?.status === 'exceeded') {
    const escalation = !!existing && resolveIsRetroactiveScuEscalation(resolveCytologyReviewMode(existing), targetReviewMode);
    await reassignPendingCases(input, !escalation, deps);
    if (!escalation) return { outcome: 'workloadBlocked', capacity, workloadNotice: 'blocked', validation };
    workloadNotice = 'escalation';
  }

  // Agreement with the initial screen (CISOE-A reviews are stored as Bethesda ids, so compared in Bethesda).
  const initial = initialScreenFor(input.reviews, existing?.role ?? input.resolvedRole, existing?.id);
  const agreement = initial ? resolveCytologyReviewAgreement(fields as any, initial,
    form.kind === 'cisoeA' ? form.bethesdaForMapping : input.categories,
    { at: deps.now().toISOString(), by: { userId: user.id, userName: user.name } }) : undefined;
  if (agreement) {
    fields.agreementWithInitial = agreement;
    if (existing?.agreementWithInitial) fields.priorAgreements = [...(existing.priorAgreements ?? []), existing.agreementWithInitial];
  }

  // 3. Save.
  if (input.editingReviewId) {
    if (existing) fields.priorVersions = [...(existing.priorVersions ?? []), reviewVersionOf(existing)];
    const updated = await deps.updateReview(input.editingReviewId, user.id, fields);
    if (!updated.ok) return { outcome: 'failed', capacity, workloadNotice, validation };
    await patchSpecimen(input, updated.data.id, {}, deps);
    await recordLedger(input, targetReviewMode, updated.data.id, deps);
    return { outcome: 'saved', capacity, workloadNotice, validation, reviewId: updated.data.id, created: false, agreement };
  }
  const created = await deps.createReview({
    specimenId, caseId: caseData.id, role: input.resolvedRole, ...fields,
    reviewMode: targetReviewMode, recordedBy: { userId: user.id, userName: user.name },
  });
  if (!created.ok) return { outcome: 'failed', capacity, workloadNotice, validation };

  // 4. QC and QA on a new review (a one-time event: never re-rolled by an edit).
  let qc: { reason: NonNullable<SaveCytologyReviewOutcome['qcFlagApplied']>; flag: Record<string, unknown> } | undefined;
  if (created.data.role === 'primary_screen') {
    qc = await selectQc(input, created.data, deps);
  } else {
    await recordSecondaryScreening(input, created.data, agreement, deps);
  }
  const qcFlagApplied = qc?.reason;
  await patchSpecimen(input, created.data.id, qc ? { qcFlag: qc.flag } : {}, deps);
  await recordLedger(input, targetReviewMode, created.data.id, deps);
  return { outcome: 'saved', capacity, workloadNotice, validation, reviewId: created.data.id, created: true, qcFlagApplied, agreement };
}

async function checkWorkloadCapacity(input: SaveCytologyReviewInput, mode: CytologyReviewMode, deps: CytologyWorkspaceDeps): Promise<CytologyWorkloadCapacityStatus | null> {
  const now = deps.now();
  const facilityId = (input.caseData as any).order?.facilityId as string | undefined;
  // Batch 415: the CLIA cap is a feature (on for a US lab by default, off elsewhere).
  const [compliance, jurisdiction] = await Promise.all([
    deps.getComplianceSettings(facilityId), facilityId ? deps.getFacilityJurisdiction(facilityId) : Promise.resolve(undefined),
  ]);
  if (!resolveCytologyComplianceFeatures((jurisdiction as Jurisdiction | undefined) ?? 'US', compliance.enterprise, compliance.facility).workloadCap) return null;
  const [caps, ledger] = await Promise.all([
    deps.getWorkloadCaps(facilityId, input.user.id),
    deps.getLedgerInWindow(input.user.id, new Date(now.getTime() - DAY_MS).toISOString(), now.toISOString()),
  ]);
  if (!caps || !ledger.ok) return null;
  const cap = resolveEffectiveCytologyWorkloadCap(caps.enterprise, caps.facility, caps.staff);
  const priorScu = ledger.data.reduce((sum, e) => sum + e.scuWeight, 0);
  const priorSeconds = ledger.data.reduce((sum, e) => sum + e.activeDurationSeconds, 0);
  // Earlier active time plus this session's, or a first review of the day would show no hours and always block.
  const activeHours = (priorSeconds + input.activeScreeningSeconds) / 3600;
  return resolveCytologyWorkloadCapacity(priorScu + resolveCytologyScuWeight(mode), activeHours, cap.dailySlideCap);
}

/** The reviewer's other pending cytology cases back to the pool (case assignment only; accession status untouched). */
async function reassignPendingCases(input: SaveCytologyReviewInput, includeCurrentCase: boolean, deps: CytologyWorkspaceDeps) {
  const mine = await deps.listCasesForUser(input.user.id);
  const candidates = resolveCytologyWorkloadReassignmentCandidates(mine, input.user.id)
    .filter(c => includeCurrentCase || c.id !== input.caseData.id);
  // Non-blocking: a routing race on the overflow queue must never fail the save.
  await Promise.all(candidates.map(c => Promise.resolve(deps.returnToCytologyPool(c))
    .catch(e => console.error('Workload reassignment routing failed (non-blocking):', e))));
}

async function recordLedger(input: SaveCytologyReviewInput, mode: CytologyReviewMode, reviewRecordId: string, deps: CytologyWorkspaceDeps) {
  await deps.recordLedgerEntry({
    userId: input.user.id, caseId: input.caseData.id, specimenId: input.specimenId, reviewRecordId,
    reviewMode: mode, scuWeight: resolveCytologyScuWeight(mode),
    activeDurationSeconds: input.activeScreeningSeconds, completedAt: deps.now().toISOString(),
  });
}

/**
 * A new initial review: a high-risk patient (HPV genotype, a prior abnormal
 * Pap on the patient's other cases, encounter diagnoses, contact bleeding)
 * goes to targeted QC first; otherwise a negative case may be picked for
 * random QC. The flag's "by" names are stored data.
 */
async function selectQc(input: SaveCytologyReviewInput, review: CytologyReviewRecord, deps: CytologyWorkspaceDeps): Promise<{ reason: 'targeted_high_risk' | 'random_selection'; flag: Record<string, unknown> } | undefined> {
  const { caseData, specimen } = input;
  const now = deps.now();
  const patientId = caseData.patient?.id;
  if (patientId) {
    const [allCases, allReviews, encounters] = await Promise.all([deps.getAllCases(), deps.getAllReviews(), deps.listEncounters(patientId)]);
    if (allCases.ok && allReviews.ok) {
      const otherCaseIds = new Set(allCases.data.filter(c => c.id !== caseData.id && c.patient?.id === patientId).map(c => c.id));
      const factors = resolveCytologyHighRiskFactorsForCase(
        { hpvResult: specimen?.cytologyScreening?.hpvResult, hpvGenotypeDetail: specimen?.cytologyScreening?.hpvGenotypeDetail },
        allReviews.data.filter(r => otherCaseIds.has(r.caseId)),
        encounters.ok ? encounters.data : [],
        specimen?.cytologyScreening?.persistentContactBleedingAtCollection,
        now,
      );
      if (resolveCytologyHighRiskStatus(factors).isHighRisk) {
        return { reason: 'targeted_high_risk', flag: { reason: 'targeted_high_risk', flaggedBy: 'system', flaggedByName: 'Automatic High-Risk Patient Identification', flaggedAt: now.toISOString() } };
      }
    }
  }
  const facilityId = (caseData as any).order?.facilityId as string | undefined;
  if (!facilityId) return undefined;
  const settings = await deps.getQcSettings(facilityId, input.user.id);
  if (!settings) return undefined;
  const effective = resolveEffectiveCytologyQcSettings(settings.enterprise, settings.facility, settings.staff);
  if (!resolveCytologyRandomQcSelection(!review.requiresPathologistReview, effective, deps.random())) return undefined;
  return { reason: 'random_selection', flag: { reason: 'random_selection', flaggedBy: 'system', flaggedByName: 'Automatic Random QC Selection', flaggedAt: now.toISOString() } };
}

/** Batch 412: the review as it stood, kept when it's edited. */
function reviewVersionOf(r: CytologyReviewRecord): CytologyReviewVersion {
  return {
    savedAt: r.updatedAt ?? r.recordedAt,
    adequacySelections: r.adequacySelections, generalCategorizationId: r.generalCategorizationId,
    primaryInterpretationId: r.primaryInterpretationId, primaryInterpretationComment: r.primaryInterpretationComment,
    additionalInterpretations: r.additionalInterpretations, recommendations: r.recommendations,
    cisoeAScore: r.cisoeAScore, synopticData: r.synopticData,
    requiresPathologistReview: r.requiresPathologistReview, notes: r.notes, reviewMode: r.reviewMode,
  };
}

/** One write to the specimen: a QC flag (new initial screen) and the review notes this save settles. */
async function patchSpecimen(input: SaveCytologyReviewInput, reviewId: string, patch: Record<string, unknown>, deps: CytologyWorkspaceDeps) {
  const saved = { reviewId, byUserId: input.user.id, byUserName: input.user.name, isPathologistReview: input.isPathologist };
  const at = deps.now().toISOString();
  // Skip the write when nothing would change, judged on the page's copy; the
  // notes themselves are worked out from the specimen as saved (PS-71, Batch
  // 458), so a note someone else added or acknowledged in between is kept.
  if (!Object.keys(patch).length && !reviewNotesAfterSave(input.specimen, saved, at)) return;
  await patchCytologyScreening(input.caseData, input.specimenId, sp => {
    const notes = reviewNotesAfterSave(sp, saved, at);
    return notes ? { ...patch, reviewNotes: notes } : patch;
  }, deps);
}

/**
 * A QC rescreen or secondary review is a secondary-screening QA event: its
 * interpretations compared with the initial review's. No CAPA trigger on a
 * single discordance (by the activity type's design).
 */
async function recordSecondaryScreening(input: SaveCytologyReviewInput, review: CytologyReviewRecord, agreement: CytologyReviewAgreement | undefined, deps: CytologyWorkspaceDeps) {
  if (!SECONDARY_SCREENING_TRIGGER_ROLES.includes(review.role)) return;
  const primary = input.reviews.find(r => r.role === 'primary_screen');
  if (!primary) return;
  const concordance = resolveCytologyCategorySetConcordance(allCytologyInterpretationIds(primary), allCytologyInterpretationIds(review));
  await deps.createQaActivity({
    activityTypeId: GYN_CYTOLOGY_SECONDARY_SCREENING_ACTIVITY_TYPE_ID,
    caseId: review.caseId,
    specimenId: review.specimenId,
    caseType: input.specimen?.description || 'GYN Cytology',
    fieldValues: {
      trigger: review.role,
      addedByEvent: concordance.addedByComparison.join(', '),
      missedByEvent: concordance.missedByComparison.join(', '),
      // Batch 410: the graded level too (exact / minor / major), as stored on the review.
      ...(agreement ? { agreementLevel: agreement.level } : {}),
      ...(agreement?.majorSubtype ? { majorSubtype: agreement.majorSubtype } : {}),
    },
    outcome: concordance.concordant ? 'concordant' : 'discordant',
    recordedBy: { userId: input.user.id, userName: input.user.name },
  });
}
