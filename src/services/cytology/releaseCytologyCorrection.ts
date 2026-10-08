// src/services/cytology/releaseCytologyCorrection.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up ("Cytology has no amendment mechanism at
// all... work this") — the real correction mechanism this module never
// had. Confirmed directly before designing this: CytologySignOutRecord's
// own header comment states a real, deliberate "always written, never
// edited" posture — a correction is therefore never a mutation of the
// existing record (that would violate this module's own established
// audit architecture); it's a genuinely new, separate
// CytologyReviewRecord (the corrected findings) and a genuinely new,
// separate CytologySignOutRecord (linked back via amendsRecordId),
// exactly mirroring how the module already treats every other real
// review event. The specimen's own real, current result is always the
// most recently signed record — the full, real chain of every prior
// sign-out stays queryable forever via getBySpecimenId(), never
// collapsed or overwritten.
//
// Real, deliberate parameter shape: accepts the same real
// patient/order/specimen context resolveCytologyReportContent.ts's own
// established signature already takes, so a future real UI caller
// (CytologyScreeningPage.tsx's own "Correct Diagnosis" action, not
// built in this pass) can reuse the exact same context-gathering code
// it already has for the initial sign-out, rather than this function
// re-deriving that context from a live case itself and risking drift
// from what the original sign-out actually captured.
// ─────────────────────────────────────────────────────────────────────────────

import { mockCytologyReviewRecordService } from './mockCytologyReviewRecordService';
import { mockCytologySignOutRecordService } from './mockCytologySignOutRecordService';
import { resolveCytologyReportContent } from './resolveCytologyReportContent';
import { publishReportReleasedEvent } from '../reports/publishReportReleasedEvent';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { generateCytologyReportPdfSnapshot } from './generateCytologyReportPdfSnapshot';
import { resolveCytologyReportLocale } from './resolveCytologyReportLanguage';
import type { CytologyCategoryEntry } from './ICytologyCategoryService';
import type { CytologyCategorySelection, CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import type { CisoeAScore } from '@/types/cytology/CisoeAScore';

export interface ReleaseCytologyCorrectionResult {
  ok: boolean;
  signOutRecordId?: string;
  /** Batch 390: the corrected review, so the caller can make it the specimen's Final Diagnosis. */
  review?: CytologyReviewRecord;
  error?: string;
  /** Batch 390: the user lacks cytology:report:correct. */
  notPermitted?: true;
  /** Batch 390: no reason was given. */
  reasonMissing?: true;
}

export async function releaseCytologyCorrection(
  caseId: string,
  specimenId: string,
  correctedFindings: {
    adequacySelections?: CytologyCategorySelection[];
    generalCategorizationId?: string;
    primaryInterpretationId: string;
    primaryInterpretationComment?: string;
    additionalInterpretations?: CytologyCategorySelection[];
    recommendations?: CytologyCategorySelection[];
    cisoeAScore?: CisoeAScore;
    requiresPathologistReview: boolean;
  },
  categories: CytologyCategoryEntry[],
  patient: { name: string; dateOfBirth?: string; mrn?: string; lastMenstrualPeriod?: string; hormonalStatus?: 'premenopausal' | 'perimenopausal' | 'postmenopausal' | 'pregnant'; priorAbnormalPapHpvHistory?: string; iudOrContraceptionUse?: string },
  order: { accessionNumber: string; orderingProvider?: string; facilityId?: string },
  specimen: {
    typeDescription: string;
    collectedAt?: string;
    receivedAt?: string;
    preparationMethod?: 'Liquid-Based' | 'Conventional';
    computerAssistedScreening?: { used: boolean; system?: string };
    hpvResult?: string;
    hpvGenotypeDetail?: { hpv16: boolean; hpv18Or45: boolean; otherHighRisk: boolean };
    hpvOrderReason?: 'co_test' | 'ascus_reflex' | 'post_treatment_surveillance';
    educationalNotes?: string;
  },
  correctingUser: { id: string; name: string; isPathologist: boolean },
  /** Batch 390 (PS-340): why the report is being corrected. Mandatory, stored on the new sign-out record and printed on the PDF. */
  reason: string,
  generatePdf?: () => Promise<{ pdfBase64?: string; generationError?: string }>,
): Promise<ReleaseCytologyCorrectionResult> {
  // Batch 390 (PS-340): a correction needs its own permission and a reason.
  const decision = await authorizationService.enforce('cytology:report:correct', { caseId });
  if (!decision.allowed) return { ok: false, notPermitted: true, error: 'Correcting a signed-out cytology report needs the cytology:report:correct permission.' };
  const revisionReason = (reason ?? '').trim();
  if (revisionReason === '') return { ok: false, reasonMissing: true, error: 'A reason for the correction is required.' };

  // Real, honest requirement — a correction with no real prior sign-out
  // to correct doesn't mean anything. getBySpecimenId returns every
  // real record for this specimen; the most recent by signedAt is the
  // specimen's own current, real result — the one this correction
  // actually replaces.
  const priorRecordsRes = await mockCytologySignOutRecordService.getBySpecimenId(specimenId);
  if (!priorRecordsRes.ok || priorRecordsRes.data.length === 0) {
    return { ok: false, error: 'No prior sign-out exists for this specimen — nothing to correct.' };
  }
  const priorRecord = [...priorRecordsRes.data].sort((a, b) => b.signedAt.localeCompare(a.signedAt))[0];
  // Real, per direct correction ("the previous text for the Final
  // Diagnosis is the previously reported as") — the prior record's own
  // real, verbatim primaryInterpretation, never diffed or reworded.
  const previouslyReportedAs = priorRecord.reportContent.primaryInterpretation;

  const reviewRes = await mockCytologyReviewRecordService.create({
    specimenId, caseId, role: 'pathologist_review',
    ...correctedFindings,
    recordedBy: { userId: correctingUser.id, userName: correctingUser.name },
  });
  if (!reviewRes.ok) return { ok: false, error: 'Could not record the corrected review.' };
  const newReview = reviewRes.data;

  const signedAtIso = new Date().toISOString();
  const resolvedContent = resolveCytologyReportContent(
    newReview, categories, patient, order, specimen,
    // Real, deliberate: a correction has no real "primary screener" of
    // its own — it's the pathologist's own, direct corrected finding.
    undefined,
    { name: correctingUser.name, isPathologist: correctingUser.isPathologist }, signedAtIso,
  );
  // Batch 390 (PS-340): the PDF prints this as the corrected-report banner.
  // Batch 391: a correction keeps the language of the report it corrects.
  const prior = priorRecord.reportContent;
  const { language, locale } = prior.language ? { language: prior.language, locale: prior.locale } : await resolveCytologyReportLocale(order.facilityId);
  const reportContent = { ...resolvedContent, language, locale, revision: { kind: 'correction' as const, reason: revisionReason, previouslyReportedAs } };

  const createRes = await mockCytologySignOutRecordService.create({
    caseId, specimenId, reviewRecordId: newReview.id, reportContent,
    signedBy: { userId: correctingUser.id, userName: correctingUser.name, isPathologist: correctingUser.isPathologist },
    amendsRecordId: priorRecord.id,
    revisionReason,
  });
  if (!createRes.ok) return { ok: false, error: 'Could not create the corrected sign-out record.' };
  const newRecord = createRes.data;

  // Batch 438 (PS-146): a cytology correction changes the diagnosis (its
  // reason is free text, not a dictionary code), so it always recommends a
  // CAPA for the QA lead to confirm or dismiss. Linked to a discordance
  // already recommended for the case (PS-148). Never blocks the release.
  try {
    const { mockCapaRecommendationService } = await import('../quality/mockCapaRecommendationService');
    await mockCapaRecommendationService.recommend({
      caseId, specimenId, source: 'clinical-correction', deficiencyTypeId: 'def-clinically-significant-revision',
      sourceRecordId: newRecord.id, summary: 'Released a cytology diagnosis correction (Correct diagnosis).', createdBy: correctingUser.id,
    });
  } catch (e) {
    console.error('[releaseCytologyCorrection] Failed to recommend a CAPA for the correction:', e);
  }

  await publishReportReleasedEvent({
    caseId,
    instanceId: newRecord.id,
    reportType: 'CORRECTED',
    source: 'CYTOLOGY',
    releasedAt: signedAtIso,
    releasedBy: { id: correctingUser.id, name: correctingUser.name },
    performingFacilityId: order.facilityId,
    previouslyReportedAs,
    // Batch 390: the corrected report's own PDF, unless the caller supplies one.
    generatePdf: generatePdf ?? (() => generateCytologyReportPdfSnapshot(newRecord.reportContent ?? reportContent)),
  });

  return { ok: true, signOutRecordId: newRecord.id, review: newReview };
}
