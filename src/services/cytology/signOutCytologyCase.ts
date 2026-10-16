// src/services/cytology/signOutCytologyCase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 409 (PS-359; Pete: "Keep today's users", "Yes, move it"). Signing out a
// cytology specimen, moved whole out of CytologyScreeningPage.tsx (about 350
// lines of the page) so the decisions live in a service and can be tested.
// The steps and their order are unchanged, with one addition at the start:
//
//   0. Permission: cytology:report:sign-out, for the case (new, Batch 409).
//      It sits on top of the signing-authority rules below, never replaces
//      them: a role can now be switched off in the Role Dictionary.
//   1. The CT/pathologist sign-out gate (resolveCytologySignOutGate).
//   2. The electronic signature (Batch 345).
//   3. Signing authority on the pathologist track (PS-327, Batch 332).
//   4. The countersign gate: a resident, an FPPE provisional hire, or a new
//      cytotechnologist under competency assessment releases the case for
//      countersign instead of finalizing it; the reviewer is emailed.
//   5. Otherwise, a pathologist-track sign-out without authority is refused.
//   6. Sign-out side effects, before the record is written: the
//      translation-validation audit entry, the CAP 5-year retrospective
//      lookback, a ROSE discrepancy QC assignment, post-sign-out peer review
//      selection, the QC Rules engine (Batch 501), and cyto-histologic
//      correlation candidates.
//      Batch 501 (Pete, Oct 9 — layered QC): ROSE and the Rules engine create
//      or upgrade ONE open QC assignment per specimen
//      (cytologyQc/resolveQcAssignmentUpsert.ts); peer-review selection stays
//      a passive flag, recorded as a selection reason when a rule or ROSE also
//      selects the specimen.
//   7. The sign-out record, the case finalized, the signature committed, the
//      Report_Released_Event, and (where the facility reports to one) the
//      national screening registry dispatch, with the CSMS eligibility flag.
//      Batch 411: each cytology specimen is signed out on its own, and the
//      case is finalized only when every cytology specimen has been
//      (cytologyCaseFinalization.ts); until then it keeps its status.
//      Batch 532 (Pete, Oct 12): the release event and the registry wait for
//      that. When the last specimen is signed, one consolidated case report
//      is released (FINAL) and every sample goes to the registry together; on
//      a case finalized early, a later sign-out releases the case report
//      again as an ADDENDUM.
//
// Screen text is the caller's; this returns what happened. Email and audit
// text stay English (transport and compliance records).
// ─────────────────────────────────────────────────────────────────────────────

import type { Case, CaseParticipant } from '@/types/case/Case';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import type { CytologySignOutRecord } from '@/types/cytology/CytologySignOutRecord';
import type { CytologyCategoryEntry } from './ICytologyCategoryService';
import type { PathologyLexiconEntry, PathologyLexiconLocale } from '@/types/cytology/PathologyLexicon';
import type { SignatureConfirmation } from '../auth/signerConfirmation';
import type { ProviderCredential } from '@/types/staff/ProviderCredential';
import type { Jurisdiction } from '@/types/systemConfig';
import { resolveCytologySignOutGate } from './resolveCytologySignOutGate';
import { resolveCanSignOutCytology } from './resolveCanSignOutCytology';
import { resolveCytologySignOutAuthority } from './resolveCytologySignOutAuthority';
import { resolveResidentCountersignRequired } from '../cases/resolveResidentCountersignRequired';
import { resolveSynopticTranslationSignOutAuditEvent } from './resolveSynopticTranslationSignOutAuditEvent';
import { ensureCytologySynopticTemplate } from './cytologySynopticTemplateRegistry';
import { cytologySynopticTranslationCheck } from './cytologyWorkspaceView';
import { resolveCytologyFiveYearRetrospectiveLookback } from './resolveCytologyFiveYearRetrospectiveLookback';
import { resolveCytologyRoseDiscrepancy } from './resolveCytologyRoseDiscrepancy';
import { ROSE_DISCREPANCY_QC_CANDIDATE } from '../cytologyQc/resolveNewQcCaseAssignment';
import { resolveQcAssignmentUpsert, qcRuleSelectionReason, peerReviewFlagSelectionReason, type QcAssignmentCandidate } from '../cytologyQc/resolveQcAssignmentUpsert';
import { resolveQcRuleEvaluation } from '../cytologyQc/resolveQcRuleEvaluation';
import { resolveQcEvaluationContextFromCytologyReview } from '../cytologyQc/resolveQcEvaluationContextFromCytologyReview';
import { resolveCaseInFormalConsultation } from '../cytologyQc/resolveCaseInFormalConsultation';
import type { QcSamplingState } from '../cytologyQc/resolveQcSamplingDecision';
import type { CytologyQcCaseAssignment, CytologyQcRule } from '@/types/cytologyQc/CytologyQcRule';
import type { QcTriggerChanges } from '../cytologyQc/ICytologyQcCaseAssignmentService';
import { resolveNormalizedCredentialCapabilities } from '../staff/resolveNormalizedCredentialCapabilities';
import { resolveCytologyPeerReviewTargetedSelection } from './resolveCytologyPeerReviewTargetedSelection';
import { resolveEffectiveCytologyQcSettings } from './resolveEffectiveCytologyQcSettings';
import { resolveCytologyRandomQcSelection } from './resolveCytologyRandomQcSelection';
import { resolveCytologyHistologyCorrelationCandidates, otherPatientCasesForCorrelation } from './resolveCytologyHistologyCorrelationCandidates';
import { resolveCorrelationWindow, resolveEffectiveCorrelationRule, type EffectiveCorrelationRule } from './cytologyHistologyCorrelationWindow';
import { resolveCytologyReportContent } from './resolveCytologyReportContent';
import type { ScreeningRegistryConfig } from '../screeningRegistry/IScreeningRegistryConfigService';
import { submitScreeningRegistryResult } from '../screeningRegistry/submitScreeningRegistryResult';
import type { RegistrySubmissionHeader, PriorRegistrySubmission } from '../registrySubmission/registrySubmissionHeader';
import { FPPE_ACTIVITY_TYPE_ID, CYTOTECH_COMPETENCY_ACTIVITY_TYPE_ID } from '../quality/mockQaSupervisionAssignmentService';
import { latestRecordPerSpecimen } from './resolveCytologyCaseReport';
import { resolveCytologyCaseFinalization } from './cytologyCaseFinalization';
import { resolveCytologyComplianceFeatures } from './cytologyComplianceFeatures';
import { updateCaseWithRetry, updateCaseWithRetryOrThrow } from '../cases/caseWrite';
import { caseWriteDepsFrom, type VersionedCaseUpdate } from './cytologyCaseWriteDeps';
import type { ICountersignService } from '../cases/ICountersignService';

type Result<T> = { ok: true; data: T } | { ok: false; error?: string };
// Loose on purpose: these are the page's existing calls, typed as the page used them.

/** Everything the sign-out uses, passed in (defaults: signOutCytologyCaseDeps.ts). */
export interface CytologySignOutDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  signatureGate: {
    accept: (confirmation: SignatureConfirmation, ctx: { caseId: string; caseRef: string; actions: string[] }) => Promise<{ ok: true } | { ok: false; reason: string }>;
    commit: (caseId: string, outcome: string, detail: Record<string, unknown>) => Promise<unknown>;
    release: (caseId: string) => void;
  };
  getSessionUser: () => any;
  resolveFinalizeAuthorityContext: (caseData: Case) => Promise<any>;
  getActiveSupervisionAssignment: (activityTypeId: string, userId: string, subspecialtyId?: string) => Promise<{ supervisorUserId?: string } | null>;
  /** Batch 483 (PS-359 tracker follow-up): `specimenId` keeps a SECOND
   *  cytology specimen's own release from destroying a first, still-
   *  pending specimen's CountersignRecord (ICountersignService.release's
   *  own doc comment has the full reasoning). */
  releaseForCountersign: (input: { caseId: string; subspecialtyId?: string; residentId: string; residentName: string; releasedAnswersSnapshot: Record<string, Record<string, string | string[]>>; specimenId?: string }) => Promise<unknown>;
  /** Batch 485 (PS-359 tracker follow-up — the cytology countersign
   *  completion gap Batch 483 disclosed but didn't build): the real
   *  per-specimen completion path, mirroring useSignOutWorkflow.ts's
   *  own attending-side countersign completion, but scoped per
   *  specimen — a cytology case can have more than one specimen
   *  independently pending at once, so this only ever checks and
   *  completes THIS specimen's own record, never the case as a whole. */
  countersign: Pick<ICountersignService, 'getForSpecimen' | 'countersign' | 'getAll'>;
  /** PS-71 (Batch 458): every case save reads the case and carries its version (updateCaseWithRetry). */
  getCase: (caseId: string) => Promise<Case | null | undefined>;
  updateCase: VersionedCaseUpdate;
  getAllCases: () => Promise<Result<any[]>>;
  getUserEmail: (userId: string) => Promise<string | undefined>;
  sendEmail: (message: { to: string[]; subject: string; bodyText: string; bodyHtml: string; metadata: Record<string, string> }) => Promise<unknown>;
  logAudit: (event: any) => unknown;
  /** Batch 424: the screening registry submission's send gate (registryGoLive/registrySendGate.ts). */
  sendGate: (registryId: string) => Promise<import('../registryGoLive/registrySendGate').RegistrySendGate>;
  getAllReviews: () => Promise<Result<CytologyReviewRecord[]>>;
  createQcAssignment: (assignment: any) => Promise<Result<{ id: string }>>;
  /** Batch 501: the specimen's existing QC assignments, so a trigger upgrades an open one instead of duplicating it. Absent: treated as none. */
  getQcAssignmentsForCase?: (caseId: string) => Promise<Result<CytologyQcCaseAssignment[]>>;
  /** Batch 501: upgrade an open assignment (cytologyQc applyAdditionalTrigger). */
  applyQcTrigger?: (id: string, changes: QcTriggerChanges) => Promise<Result<{ id: string }>>;
  /** Batch 501: the active QC rules (Configuration → Cytology QC Rules). Absent: the Rules engine step is skipped. */
  getActiveQcRules?: () => Promise<Result<CytologyQcRule[]>>;
  /** Batch 501: each rule's sampling counters ("every Nth", "first N"), read before and saved after evaluation. */
  qcSamplingStates?: { getAll: () => Promise<Map<string, QcSamplingState>>; saveAll: (states: Map<string, QcSamplingState>) => Promise<void> };
  getQcSettings: (facilityId: string, userId: string) => Promise<{ enterprise: any; facility: any; staff: any } | null>;
  random: () => number;
  getSpecimenDictionary: () => Promise<Result<{ id: string; type?: string }[]>>;
  /** Batch 452 (PS-156): the cyto-histo correlation rule for the case's
   *  facility (enterprise → jurisdiction → facility). Optional: absent means
   *  the built-in default, 180 days from collection. */
  getHistologyCorrelationRule?: (facilityId: string | undefined) => Promise<EffectiveCorrelationRule>;
  resolveReportLocale: (facilityId?: string) => Promise<any>;
  /** Batch 411: every sign-out record on the case (which specimens are signed out). */
  getCaseSignOutRecords: (caseId: string) => Promise<Result<CytologySignOutRecord[]>>;
  createSignOutRecord: (input: { caseId: string; specimenId: string; reviewRecordId: string; reportContent: any; signedBy: { userId: string; userName: string; isPathologist: boolean } }) => Promise<Result<CytologySignOutRecord>>;
  publishReportReleased: (event: any) => Promise<unknown>;
  generatePdfSnapshot: (reportContent: any) => Promise<any>;
  /** Batch 532: the consolidated case report PDF, from the case and its records (generateCytologyCaseReportPdfSnapshot). */
  generateCaseReportPdfSnapshot?: (caseData: Case, records: CytologySignOutRecord[]) => Promise<{ pdfBase64?: string; generationError?: string }>;
  /** Batch 534 (Pete: every report output follows the release delay): releaseReport with its services.
   *  Present: the case report and its registry submissions go through it (now, or when the delay ends).
   *  Absent (older tests): published at once, as before. */
  releaseReport?: (event: import('../reports/publishReportReleasedEvent').ReportReleasedEvent, hold: import('../reportRelease/releaseReport').ReleaseHold) => Promise<unknown>;
  getRegistrySettings: (facilityId: string) => Promise<{ enterprise: any; facility: any }>;
  /** Batch 415: the CAP 5-year lookback (and CLIA cap) feature settings. */
  getComplianceSettings: (facilityId: string | undefined) => Promise<{ enterprise: any; facility: any }>;
  /** Batch 414: the lab's configuration of a screening registry (code mappings, what to hold). */
  getRegistryConfig: (registryId: any) => Promise<ScreeningRegistryConfig>;
  registryQueue: {
    enqueue: (entry: { caseId: string; signOutRecordId: string; registryId: string; submission?: RegistrySubmissionHeader; contentHash?: string }) => Promise<Result<{ id: string }>>;
    markSent: (id: string) => Promise<unknown>;
    markFailed: (id: string, failure: { errorCode: string; errorMessage: string; maxRetriesExceeded: boolean }) => Promise<unknown>;
    /** Batch 419: earlier submissions for the case (the header's version and message type). */
    getByCaseId?: (caseId: string) => Promise<Result<PriorRegistrySubmission[]>>;
  };
  dispatchInterfaceMessage: (queueId: string, kind: string, payload: any) => Promise<{ ok: boolean; errorCode?: string; error?: string }>;
  now: () => Date;
  newId: () => string;
  /** Batch 519 (PS-273): a synoptic template's content from the Synoptic Library (the review's template is read
   *  before the translation check and its audit entry). Absent: the templates already held are used. */
  getSynopticTemplate?: (id: string) => Promise<unknown>;
}

export interface CytologySignOutInput {
  caseData: Case;
  specimenId: string;
  /** The specimen as loaded (ROSE evaluations, screening, dates). */
  specimen: any;
  user: { id: string; name: string; role?: string };
  isPathologist: boolean;
  finalReview: CytologyReviewRecord;
  /** Every review on the specimen (the primary screener is named on the report). */
  reviews: CytologyReviewRecord[];
  categories: CytologyCategoryEntry[];
  confirmation: SignatureConfirmation;
  gateInputs: {
    isGynCytology: boolean;
    isFlaggedForQc: boolean;
    labJurisdiction: Jurisdiction;
    signingProviderCredentials: ProviderCredential[] | undefined;
    translationCheck?: { hasUnvalidatedTerms: boolean; hasCurrentAcknowledgment: boolean };
    /** Batch 412: an open revision request on the specimen (stops a cytotechnologist). */
    pendingAuthorRevision?: boolean;
  };
  /** The screen's language and lexicon, for the translation-validation audit entry. */
  uiLanguage: string;
  pathologyLexicon: PathologyLexiconEntry[];
  /** The HPV fields shown on the report. */
  hpv: { hpvResult?: string; hpvGenotypeDetail?: any; hpvOrderReason?: any };
  /** Batch 411: every cytology specimen on the case; the case is finalized when all are signed out. Default: this one. */
  cytologySpecimenIds?: string[];
}

/** One flat shape: this project's tsconfig doesn't narrow unions reliably. */
export interface CytologySignOutOutcome {
  outcome: 'notPermitted' | 'ctNotPermitted' | 'gateBlocked' | 'signatureRefused' | 'releasedForCountersign' | 'authorityRefused' | 'signedOut' | 'failed';
  /** signatureRefused: the signature gate's reason code; authorityRefused: the (already translated) refusal. */
  reason?: string;
  /** signedOut: how many earlier specimens the 5-year lookback flagged (the screen warns). */
  retrospectiveFlagged?: number;
  /** signedOut (Batch 411): whether this was the case's last cytology specimen, and how many are left. */
  caseFinalized?: boolean;
  specimensRemaining?: number;
  /** Batch 532: whether the consolidated case report was published by this sign-out (the case closed, or it adds to an early-finalized case). */
  published?: boolean;
}

const activeParticipant = (participants: CaseParticipant[] | undefined, userId: string, typeId: string) =>
  !!participants?.some(p => p.status === 'active' && p.staffId === userId && p.participationTypeIds?.includes(typeId));

const writeDeps = (deps: Pick<CytologySignOutDeps, 'getCase' | 'updateCase'>) => caseWriteDepsFrom(deps.getCase, deps.updateCase);

/** The specimen with a screening patch applied, as a case update. */
function specimensWithScreeningPatch(caseData: Case, specimenId: string, patch: Record<string, unknown>) {
  return ((caseData.specimens as any[]) ?? []).map(sp =>
    sp.id === specimenId ? { ...sp, cytologyScreening: { ...sp.cytologyScreening, ...patch } } : sp);
}

export async function signOutCytologyCase(input: CytologySignOutInput, deps: CytologySignOutDeps): Promise<CytologySignOutOutcome> {
  const { caseData, specimenId, specimen, user, isPathologist, finalReview, reviews, categories } = input;

  // 0. Batch 409: the permission, for this case.
  const decision = await deps.enforce('cytology:report:sign-out', { caseId: caseData.id });
  if (!decision.allowed) return { outcome: 'notPermitted' };
  // Batch 415 (Pete: "Control via permissions"): a cytotechnologist signing out
  // (negative GYN, or the advanced-CT exception) also needs the cytotechnologist
  // sign-out permission. A lab in a country where cytotechnologists don't sign
  // reports takes it off the role in the Role Dictionary.
  if (!isPathologist) {
    const ct = await deps.enforce('cytology:ct-report:sign-out', { caseId: caseData.id });
    if (!ct.allowed) return { outcome: 'ctNotPermitted' };
  }

  // 1. The sign-out gate. Batch 519 (PS-273): the review's synoptic template comes from the Synoptic Library, so it
  // is read first, and the translation check is worked out here from it (the screen's own check is used only when
  // this one has nothing to say, e.g. no synoptic answers).
  const g = input.gateInputs;
  const templateId = finalReview.synopticData?.templateId;
  if (templateId && deps.getSynopticTemplate) await ensureCytologySynopticTemplate(templateId, { getTemplate: deps.getSynopticTemplate });
  const translationCheck = cytologySynopticTranslationCheck(finalReview, input.uiLanguage, input.pathologyLexicon) ?? g.translationCheck;
  const gate = resolveCytologySignOutGate(
    { adequacyCategoryIds: finalReview.adequacySelections?.map(s => s.categoryId), requiresPathologistReview: finalReview.requiresPathologistReview },
    g.isGynCytology, g.isFlaggedForQc, categories, g.labJurisdiction, g.signingProviderCredentials, undefined, translationCheck,
    !!g.pendingAuthorRevision,
  );
  if (!resolveCanSignOutCytology(isPathologist, gate)) return { outcome: 'gateBlocked' };

  // 2. The signature, before anything is signed.
  const accepted = await deps.signatureGate.accept(input.confirmation, {
    caseId: caseData.id, caseRef: caseData.accession?.fullAccession ?? caseData.id, actions: ['cytology-sign-out'],
  });
  if (accepted.ok === false) return { outcome: 'signatureRefused', reason: accepted.reason };

  // 3. Signing authority (pathologist track only; the CT track keeps its CLIA rules).
  const authority = resolveCytologySignOutAuthority({
    isPathologistTrack: isPathologist,
    session: deps.getSessionUser(),
    participants: caseData.participants,
    context: await deps.resolveFinalizeAuthorityContext(caseData),
  });

  // 4. The countersign gate, before any side effect.
  const subspecialtyId = (caseData as any).subspecialtyId as string | undefined;
  const provisional = activeParticipant(caseData.participants, user.id, 'provisional_hire');
  const cytotech = activeParticipant(caseData.participants, user.id, 'cytotechnologist');
  const attendingToo = activeParticipant(caseData.participants, user.id, 'attending');
  const [fppe, ctCompetency] = await Promise.all([
    provisional && !attendingToo ? deps.getActiveSupervisionAssignment(FPPE_ACTIVITY_TYPE_ID, user.id, subspecialtyId).catch(() => null) : Promise.resolve(null),
    cytotech && !attendingToo ? deps.getActiveSupervisionAssignment(CYTOTECH_COMPETENCY_ACTIVITY_TYPE_ID, user.id, subspecialtyId).catch(() => null) : Promise.resolve(null),
  ]);
  const countersign = resolveResidentCountersignRequired({
    participants: caseData.participants,
    signingUserId: user.id,
    hasActiveFppeAssignment: !!fppe,
    hasActiveCytotechCompetencyAssignment: !!ctCompetency,
    countersignRequiredTypeIds: authority.countersignRequiredTypeIds,
  });
  if (countersign.required) {
    // Batch 483: specimenId scopes the release to THIS specimen, so a
    // second cytology specimen on the same case that also needs
    // countersign (released separately, possibly by a different
    // resident) gets its own independent record rather than replacing
    // this one.
    await deps.releaseForCountersign({
      caseId: caseData.id, subspecialtyId, residentId: user.id, residentName: user.name ?? 'Unknown User',
      specimenId,
      releasedAnswersSnapshot: {
        [specimenId]: {
          primaryInterpretationId: finalReview.primaryInterpretationId ?? '',
          generalCategorizationId: finalReview.generalCategorizationId ?? '',
          adequacySelections: (finalReview.adequacySelections ?? []).map(s => s.categoryId),
        },
      },
    });
    // PS-71 (Batch 458): versioned; a save that still conflicts after the retries is logged, as a failed save was.
    try {
      const r = await updateCaseWithRetry(caseData.id, () => ({ status: 'pending-countersign' }), writeDeps(deps));
      if (r.ok === false) console.error(`Case ${caseData.id}: pending-countersign not saved (${r.reason})`);
    } catch (e) { console.error(e); }
    const attending = caseData.participants?.find(p => p.status === 'active' && p.participationTypeIds?.includes('attending'));
    const reviewerId = fppe?.supervisorUserId ?? ctCompetency?.supervisorUserId ?? attending?.staffId;
    if (reviewerId) {
      const email = await deps.getUserEmail(reviewerId).catch(() => undefined);
      if (email) {
        const who = user.name ?? 'A resident';
        deps.sendEmail({
          to: [email],
          subject: `Case ${caseData.id} ready for your countersign`,
          bodyText: `${who} has released case ${caseData.id} for your review and countersign.`,
          bodyHtml: `<p>${who} has released case <strong>${caseData.id}</strong> for your review and countersign.</p>`,
          metadata: { caseId: caseData.id, action: 'countersign_requested' },
        }).catch(() => {});
      }
    }
    await deps.signatureGate.commit(caseData.id, 'released_for_countersign', { kind: 'cytology-sign-out' });
    return { outcome: 'releasedForCountersign' };
  }

  // 5. A direct pathologist-track sign-out needs signing authority.
  if (authority.finalizeDecision && !authority.finalizeDecision.granted) {
    deps.signatureGate.release(caseData.id);
    return { outcome: 'authorityRefused', reason: authority.finalizeDecision.reason };
  }

  // 6. Side effects at the moment of release.
  const translationAudit = resolveSynopticTranslationSignOutAuditEvent(
    finalReview, input.uiLanguage.split('-')[0] as PathologyLexiconLocale | 'en', input.pathologyLexicon,
    { userId: user.id, displayName: user.name ?? user.id, role: user.role ?? 'unknown' },
    caseData.accession?.fullAccession ?? caseData.id,
  );
  if (translationAudit) deps.logAudit(translationAudit);

  const rankOf = (id: string | undefined) => categories.find(c => c.id === id)?.diagnosticRank;
  const retrospectiveFlagged = await applyFiveYearLookback(input, rankOf(finalReview.primaryInterpretationId), deps);
  // Batch 450: each step below saves the whole specimen list, so each one
  // starts from the specimens the step before it saved. Before, all three
  // started from the case as loaded, and the last write erased the others
  // (an HSIL sign-out with a later biopsy lost its peer-review flag).
  let working = input;
  const carry = (specimens: any[] | undefined) => {
    if (specimens) working = { ...working, caseData: { ...working.caseData, specimens } as Case, specimen: specimens.find(sp => sp.id === specimenId) ?? working.specimen };
  };
  // Batch 501: the peer-review flag is set first, so a ROSE discrepancy or a
  // QC rule that also selects the specimen records it as a selection reason.
  carry(await applyPostSignOutPeerReview(working, rankOf(finalReview.primaryInterpretationId), deps));
  carry(await applyRoseDiscrepancy(working, deps));
  await applyQcRules(working, deps);
  carry(await applyHistologyCorrelationCandidates(working, rankOf(finalReview.primaryInterpretationId), deps));

  // 7. The record, the release and the registry.
  const screener = reviews.find(r => r.role === 'primary_screen');
  const patient = caseData.patient as any;
  const patientName = patient ? `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() : 'Unknown Patient';
  const signedAtIso = deps.now().toISOString();
  const reportContent = resolveCytologyReportContent(
    finalReview, categories,
    { name: patientName, dateOfBirth: patient?.dateOfBirth, mrn: patient?.mrn, lastMenstrualPeriod: patient?.lastMenstrualPeriod, hormonalStatus: patient?.hormonalStatus, priorAbnormalPapHpvHistory: patient?.priorAbnormalPapHpvHistory, iudOrContraceptionUse: patient?.iudOrContraceptionUse },
    { accessionNumber: caseData.accession?.fullAccession ?? caseData.id, orderingProvider: (caseData.order as any)?.requestingProvider },
    {
      typeDescription: specimen?.description ?? 'Cytology specimen',
      collectedAt: specimen?.collectedAt, receivedAt: specimen?.receivedAt,
      preparationMethod: specimen?.cytologyScreening?.preparationMethod,
      computerAssistedScreening: specimen?.cytologyScreening?.computerAssistedScreening,
      hpvResult: input.hpv.hpvResult, hpvGenotypeDetail: input.hpv.hpvGenotypeDetail, hpvOrderReason: input.hpv.hpvOrderReason, educationalNotes: specimen?.cytologyScreening?.educationalNotes,
    },
    screener ? { name: screener.recordedBy.userName } : undefined,
    { name: user.name, isPathologist }, signedAtIso,
    // Batch 391: the report is written in the performing lab's language.
    await deps.resolveReportLocale((caseData.order as any)?.facilityId),
  );

  const created = await deps.createSignOutRecord({
    caseId: caseData.id, specimenId, reviewRecordId: finalReview.id,
    reportContent, signedBy: { userId: user.id, userName: user.name, isPathologist },
  });
  if (!created.ok) return { outcome: 'failed' };
  const record = created.data;

  // Batch 485 (PS-359 tracker follow-up — the deeper gap Batch 483
  // disclosed but didn't build): if THIS specimen itself was earlier
  // released for countersign (by a resident, or a new cytotechnologist
  // under the gate above) and the signer completing it now is not that
  // same person (by definition — that gate above would have intercepted
  // them again otherwise), close the real CountersignRecord out. Without
  // this, the record stayed orphaned at 'pending' forever, even once the
  // attending had, in practice, already re-signed the specimen out —
  // breaking CountersignTurnaroundTab.tsx's QA reporting and competency
  // tracking for cytology specifically.
  const pendingForThisSpecimen = await deps.countersign.getForSpecimen(caseData.id, specimenId);
  const completedCountersignForThisSpecimen = pendingForThisSpecimen.ok && pendingForThisSpecimen.data?.status === 'pending';
  if (completedCountersignForThisSpecimen) {
    await deps.countersign.countersign({
      caseId: caseData.id, specimenId, attendingId: user.id, attendingName: user.name ?? 'Unknown User',
      currentAnswersByInstance: {
        [specimenId]: {
          primaryInterpretationId: finalReview.primaryInterpretationId ?? '',
          generalCategorizationId: finalReview.generalCategorizationId ?? '',
          adequacySelections: (finalReview.adequacySelections ?? []).map(s => s.categoryId),
        },
      },
    }).catch(() => {});
  }

  // Batch 411: the case is final once every cytology specimen is signed out.
  const caseRecords = await deps.getCaseSignOutRecords(caseData.id);
  const finalization = resolveCytologyCaseFinalization(input.cytologySpecimenIds ?? [specimenId],
    [...(caseRecords.ok ? caseRecords.data.map(r => r.specimenId) : []), specimenId]);
  // PS-71 (Batch 458): versioned; a lasting conflict throws, as a failed save did.
  if (finalization.allSignedOut) {
    await updateCaseWithRetryOrThrow(caseData.id, () => ({ status: 'finalized' }), writeDeps(deps));
  } else if (completedCountersignForThisSpecimen) {
    // Batch 485: this specimen's own countersign is now closed, but other
    // cytology specimens on the case remain unsigned — don't finalize yet.
    // Still fix the real, previously-disclosed "stuck" symptom: Case.status
    // was forced to 'pending-countersign' at release time with no memory of
    // WHICH specimen caused it, so once no OTHER specimen on this case is
    // still pending, the case is no longer genuinely awaiting anyone's
    // countersign and shouldn't keep showing as blocked.
    const allRecords = await deps.countersign.getAll();
    const anyOtherPending = allRecords.ok && allRecords.data.some(r => r.caseId === caseData.id && r.status === 'pending' && r.specimenId !== specimenId);
    if (!anyOtherPending && caseData.status === 'pending-countersign') {
      await updateCaseWithRetry(caseData.id, () => ({ status: 'in-progress' }), writeDeps(deps)).catch(() => {});
    }
  }
  await deps.signatureGate.commit(caseData.id, 'signed', { kind: 'cytology-sign-out', id: record.id });

  // Batch 532 (Pete, Oct 12, 2026: one consolidated report per accession,
  // released when the case closes). Each specimen keeps its own signature
  // and record; nothing is published until the last cytology specimen is
  // signed (FINAL), or, on a case finalized early, a later sign-out adds its
  // specimen to the released report (ADDENDUM). Registry: per sample, all
  // sent together at release (Pete).
  const finalizedEarly = !!caseData.cytologyEarlyFinalization;
  const released = finalization.allSignedOut || finalizedEarly;
  if (released) {
    const allRecords = [...(caseRecords.ok ? caseRecords.data : []).filter(r => r.id !== record.id), record];
    const latestCase = (await deps.getCase(caseData.id).catch(() => null)) ?? caseData;
    const event = {
      caseId: caseData.id, reportType: finalizedEarly ? 'ADDENDUM' as const : 'FINAL' as const,
      ...(finalizedEarly ? { instanceId: record.id } : {}),
      releasedAt: deps.now().toISOString(),
      releasedBy: { id: user.id, name: user.name }, source: 'CYTOLOGY' as const,
      performingFacilityId: caseData.order?.facilityId,
      generatePdf: () => (deps.generateCaseReportPdfSnapshot
        ? deps.generateCaseReportPdfSnapshot(latestCase as Case, allRecords)
        : deps.generatePdfSnapshot(record.reportContent)),
    };
    if (deps.releaseReport) {
      // Batch 534: through the release delay; the registry submissions go with the report.
      const recordIds = finalizedEarly ? [record.id] : registryOrder(working, allRecords).map(r => r.id);
      await deps.releaseReport(event, {
        kind: finalizedEarly ? 'cytology-late-sign-out' : 'cytology-sign-out',
        releasedBy: { userId: user.id, userName: user.name },
        subject: { recordId: record.id, specimenId, previousStatus: caseData.status },
        followUps: [{ type: 'cytology-registry', recordIds, isGynCytology: input.gateInputs.isGynCytology, categories: input.categories }],
      });
    } else {
      await deps.publishReportReleased(event);
      if (finalizedEarly) await dispatchToRegistry(working, record, deps);
      else await dispatchCaseToRegistry(working, allRecords, record, deps);
    }
  }
  return { outcome: 'signedOut', retrospectiveFlagged, caseFinalized: finalization.allSignedOut, specimensRemaining: finalization.remaining.length, published: released };
}

/** CAP's 5-year retrospective lookback, for a new HSIL+/AIS/malignant diagnosis. Returns how many specimens were flagged. */
async function applyFiveYearLookback(input: CytologySignOutInput, triggeringRank: number | undefined, deps: CytologySignOutDeps): Promise<number> {
  const { caseData, specimenId, categories } = input;
  const patientId = (caseData.patient as any)?.id;
  if (!patientId || triggeringRank === undefined || triggeringRank < 4) return 0;
  // Batch 415: a CAP rule, so a feature: on for a US lab by default, off elsewhere.
  const compliance = await deps.getComplianceSettings((caseData.order as any)?.facilityId);
  if (!resolveCytologyComplianceFeatures(input.gateInputs.labJurisdiction, compliance.enterprise, compliance.facility).fiveYearLookback) return 0;
  const [allCases, allReviews] = await Promise.all([deps.getAllCases(), deps.getAllReviews()]);
  if (!allCases.ok || !allReviews.ok) return 0;

  const otherCases = allCases.data.filter(c => c.id !== caseData.id && c.patient?.id === patientId);
  const otherIds = new Set(otherCases.map(c => c.id));
  const withRank = allReviews.data.filter(r => otherIds.has(r.caseId)).map(r => ({
    id: r.id, caseId: r.caseId, specimenId: r.specimenId, recordedAt: r.recordedAt,
    diagnosticRank: categories.find(c => c.id === r.primaryInterpretationId)?.diagnosticRank,
  }));
  const flagged = resolveCytologyFiveYearRetrospectiveLookback(triggeringRank, withRank, deps.now());
  if (flagged.length === 0) return 0;

  const byCase = new Map<string, typeof flagged>();
  for (const f of flagged) byCase.set(f.caseId, [...(byCase.get(f.caseId) ?? []), f]);
  for (const [targetCaseId, items] of byCase) {
    const target = otherCases.find(c => c.id === targetCaseId);
    if (!target) continue;
    const triggeredAt = deps.now().toISOString();
    // PS-71 (Batch 458): the flags are applied to the case as read for the
    // save (not the copy from getAllCases), with its version; on a conflict
    // they are re-applied to the newer case.
    await updateCaseWithRetryOrThrow(targetCaseId, current => ({ specimens: ((current.specimens as any[]) ?? []).map(sp => {
      if (!items.some(i => i.specimenId === sp.id)) return sp;
      return {
        ...sp,
        cytologyScreening: {
          ...sp.cytologyScreening,
          retrospectiveReviewFlag: {
            reason: 'five_year_lookback_on_new_high_grade_diagnosis',
            triggeredByCaseId: caseData.id, triggeredBySpecimenId: specimenId, triggeredAt,
          },
        },
      };
    }) }), writeDeps(deps));
  }
  return flagged.length;
}

/** A ROSE bedside adequacy call the final lab call contradicts opens (or upgrades) the specimen's QC assignment. */
async function applyRoseDiscrepancy(input: CytologySignOutInput, deps: CytologySignOutDeps): Promise<any[] | undefined> {
  const { caseData, specimen, finalReview, categories } = input;
  const evaluations = specimen?.roseEvaluations as any[] | undefined;
  if (!evaluations?.length) return;
  const mostRecent = [...evaluations].sort((a, b) => b.performedAt.localeCompare(a.performedAt))[0];
  const lastPass = mostRecent.passes[mostRecent.passes.length - 1];
  if (!lastPass) return;
  const finalIsUnsatisfactory = (finalReview.adequacySelections ?? []).some(s => categories.find(c => c.id === s.categoryId)?.isUnsatisfactory === true);
  if (!resolveCytologyRoseDiscrepancy(lastPass.adequacyAssessment, finalIsUnsatisfactory)) return;
  // Batch 501: creates the specimen's QC assignment, or upgrades its open one (top tier, 4-hour SLA).
  const qcCaseAssignmentId = await upsertQcAssignment(input, ROSE_DISCREPANCY_QC_CANDIDATE, deps);
  if (!qcCaseAssignmentId) return;
  // PS-71 (Batch 458): the QC link is applied to the case as read for the save, with its version.
  const r = await updateCaseWithRetryOrThrow(caseData.id, current => ({
    specimens: ((current.specimens as any[]) ?? []).map(sp => (sp.id === specimen.id
      ? { ...sp, roseEvaluations: ((sp.roseEvaluations as any[]) ?? []).map(ev => (ev.id === mostRecent.id ? { ...ev, qcCaseAssignmentId } : ev)) }
      : sp)),
  }), writeDeps(deps));
  return r.ok ? (r.updates.specimens as any[]) : undefined;
}

/** Batch 501: the specimen's peer-review flag, as a selection reason (it never creates an assignment itself). */
function peerReviewReasons(specimen: any): string[] {
  const flag = specimen?.cytologyScreening?.postSignOutPeerReviewFlag;
  return flag?.reason ? [peerReviewFlagSelectionReason(flag.reason)] : [];
}

/** Batch 501: create the specimen's QC assignment, or upgrade its open one. Returns the assignment id. */
async function upsertQcAssignment(input: CytologySignOutInput, candidate: QcAssignmentCandidate, deps: CytologySignOutDeps): Promise<string | undefined> {
  const { caseData, specimenId, finalReview } = input;
  const existing = deps.getQcAssignmentsForCase ? await deps.getQcAssignmentsForCase(caseData.id) : { ok: true as const, data: [] };
  const upsert = resolveQcAssignmentUpsert({
    existing: existing.ok ? existing.data : [],
    caseId: caseData.id, specimenId, primarySignOutProviderId: finalReview.recordedBy.userId,
    candidate, otherReasons: peerReviewReasons(input.specimen), now: deps.now().toISOString(),
  });
  if (upsert.kind === 'create') {
    const created = await deps.createQcAssignment(upsert.assignment);
    return created.ok ? created.data.id : undefined;
  }
  if (!deps.applyQcTrigger) return upsert.id;
  const r = await deps.applyQcTrigger(upsert.id, upsert.changes);
  return r.ok ? upsert.id : undefined;
}

/**
 * Batch 501: the QC Rules engine at sign-out (Configuration → Cytology QC Rules).
 * Active rules in priority order; the first that matches AND is selected by its
 * sampling wins. Skipped for a case in formal consultation (spec §2.2). Every
 * matching rule's sampling counter advances and is saved.
 */
async function applyQcRules(input: CytologySignOutInput, deps: CytologySignOutDeps): Promise<void> {
  if (!deps.getActiveQcRules) return;
  const { caseData, specimen, user, isPathologist, finalReview, categories } = input;
  const rules = await deps.getActiveQcRules();
  if (!rules.ok || rules.data.length === 0) return;
  const g = input.gateInputs;
  const adequacy = (finalReview.adequacySelections ?? []).some(sel => categories.find(c => c.id === sel.categoryId)?.isUnsatisfactory === true) ? 'unsatisfactory' : 'satisfactory';
  const context = resolveQcEvaluationContextFromCytologyReview({
    jurisdiction: g.labJurisdiction,
    performingFacilityId: (caseData.order as any)?.facilityId,
    primarySignOutProviderId: user.id,
    providerRole: isPathologist ? 'pathologist' : 'cytotechnologist',
    isGynCytology: g.isGynCytology,
    isFna: !!(specimen?.roseEvaluations as any[] | undefined)?.length,
    sampleAdequacy: adequacy,
    resultIsNegative: !finalReview.requiresPathologistReview,
    isHighRiskHpvPositive: !!input.hpv.hpvGenotypeDetail?.otherHighRisk,
    providerCapabilities: resolveNormalizedCredentialCapabilities(g.signingProviderCredentials, g.labJurisdiction, deps.now().toISOString()),
  });
  const states = deps.qcSamplingStates ? await deps.qcSamplingStates.getAll() : new Map<string, QcSamplingState>();
  const evaluation = resolveQcRuleEvaluation(context, resolveCaseInFormalConsultation(caseData), rules.data, states, deps.random());
  if (deps.qcSamplingStates) await deps.qcSamplingStates.saveAll(evaluation.updatedSamplingStates);
  if (!evaluation.matched) return;
  const rule = rules.data.find(r => r.id === evaluation.ruleId);
  await upsertQcAssignment(input, {
    triggerSource: 'rule_match',
    matchedRuleId: evaluation.ruleId,
    priorityTier: evaluation.priorityTier,
    slaHours: evaluation.slaHours,
    eligibleReviewerRoles: rule?.eligibleReviewerRoles,
    selectionReason: qcRuleSelectionReason(evaluation.ruleId),
  }, deps);
}

/** Post-sign-out peer review: targeted high-risk first, else random at the QC rate cascade. */
async function applyPostSignOutPeerReview(input: CytologySignOutInput, signedOutRank: number | undefined, deps: CytologySignOutDeps): Promise<any[] | undefined> {
  const { caseData, specimenId, user, finalReview } = input;
  const isTargeted = resolveCytologyPeerReviewTargetedSelection(signedOutRank);
  let isRandom = false;
  const facilityId = (caseData.order as any)?.facilityId as string | undefined;
  if (!isTargeted && facilityId) {
    const settings = await deps.getQcSettings(facilityId, user.id);
    if (settings) {
      const effective = resolveEffectiveCytologyQcSettings(settings.enterprise, settings.facility, settings.staff);
      isRandom = resolveCytologyRandomQcSelection(!finalReview.requiresPathologistReview, effective, deps.random());
    }
  }
  if (!isTargeted && !isRandom) return undefined;
  const flag = {
    reason: isTargeted ? 'targeted_high_risk' : 'random_selection',
    flaggedBy: 'system', flaggedByName: 'Automatic Post-Sign-Out Peer Review Selection', flaggedAt: deps.now().toISOString(),
  };
  // PS-71 (Batch 458): applied to the case as read for the save, with its version.
  const r = await updateCaseWithRetryOrThrow(caseData.id, current => ({
    specimens: specimensWithScreeningPatch(current, specimenId, { postSignOutPeerReviewFlag: flag }),
  }), writeDeps(deps));
  return r.ok ? (r.updates.specimens as any[]) : undefined;
}

/** CYT-QA-04: the patient's other cases with a non-cytology specimen, as correlation candidates.
 *  Batch 452 (PS-156): the window comes from the configured rule (180 days
 *  from collection by default, deps.getHistologyCorrelationRule) and is kept
 *  on the specimen, so biopsies that arrive later are matched by
 *  sweepCytologyHistologyCorrelationCandidates. The window is stored even
 *  when nothing matches yet. */
async function applyHistologyCorrelationCandidates(input: CytologySignOutInput, finalRank: number | undefined, deps: CytologySignOutDeps): Promise<any[] | undefined> {
  const { caseData, specimenId, finalReview } = input;
  const patientId = (caseData.patient as any)?.id;
  if (!patientId || finalRank === undefined || finalRank < 1) return;
  const specimen = (caseData.specimens as any[] ?? []).find(sp => sp.id === specimenId);
  const rule = deps.getHistologyCorrelationRule
    ? await deps.getHistologyCorrelationRule((caseData.order as any)?.facilityId)
    : resolveEffectiveCorrelationRule(null, null, null);
  const window = resolveCorrelationWindow(specimen ?? {}, deps.now().toISOString(), rule);
  if (!window) return;
  const [allCases, dict] = await Promise.all([deps.getAllCases(), deps.getSpecimenDictionary()]);
  const others = allCases.ok && dict.ok
    ? otherPatientCasesForCorrelation(allCases.data, caseData.id, patientId, new Map(dict.data.map(e => [e.id, e])))
    : [];
  const candidates = resolveCytologyHistologyCorrelationCandidates(
    [{ reviewId: finalReview.id, caseId: caseData.id, specimenId, diagnosticRank: finalRank, window }],
    others,
  );
  const detectedAt = deps.now().toISOString();
  // PS-71 (Batch 458): the candidates already on the specimen are read from
  // the case as read for the save (with its version), so one added by a
  // concurrent sweep is kept.
  const r = await updateCaseWithRetryOrThrow(caseData.id, current => {
    const sp = ((current.specimens as any[]) ?? []).find(s => s.id === specimenId);
    const existing: any[] = sp?.cytologyScreening?.histologyCorrelationCandidates ?? [];
    const known = new Set(existing.map(c => c.candidateCaseId));
    const added = candidates.filter(c => !known.has(c.candidateCaseId)).map(c => ({ candidateCaseId: c.candidateCaseId, detectedAt }));
    return {
      specimens: specimensWithScreeningPatch(current, specimenId, {
        histologyCorrelationWindow: { ...window, diagnosticRank: finalRank, reviewId: finalReview.id },
        ...(added.length || existing.length ? { histologyCorrelationCandidates: [...existing, ...added] } : {}),
      }),
    };
  }, writeDeps(deps));
  return r.ok ? (r.updates.specimens as any[]) : undefined;
}

/**
 * The national cervical screening registry, where the facility reports to one.
 * Batch 414: through the registry engine (services/screeningRegistry/), driven
 * by the registry's definition and the lab's configuration.
 *   • Not eligible (a Non-GYN specimen: every registry here is a cervical
 *     programme, Batch 413): nothing is sent.
 *   • Held (identifier or codes not ready): queued and marked failed with the
 *     reason, so it shows in the transmission audit and can be resent.
 *   • Otherwise sent, and the registry's eligibility flag (CSMS: no reason for
 *     study) raised once per case.
 */
async function dispatchToRegistry(input: CytologySignOutInput, record: CytologySignOutRecord, deps: CytologySignOutDeps): Promise<void> {
  // Batch 419: the submission itself is shared with corrections and addenda (submitScreeningRegistryResult.ts).
  await submitScreeningRegistryResult({
    caseData: input.caseData, record, review: input.finalReview, categories: input.categories,
    isGynCytology: input.gateInputs.isGynCytology, kind: 'signOut',
  }, deps);
}

/**
 * Batch 532 (Pete, Oct 12, 2026: registry "per sample, sent together"): at
 * release, each cytology specimen's newest record goes to the registry, in
 * case order, with the review it was signed on. The one just signed uses the
 * review in hand.
 */
/** Each cytology specimen's newest record, in case order (the registry's order). */
function registryOrder(input: Pick<CytologySignOutInput, 'caseData'>, records: CytologySignOutRecord[]): CytologySignOutRecord[] {
  const order = (input.caseData.specimens ?? []).map(sp => sp.id);
  return [...latestRecordPerSpecimen(records).values()].sort((a, b) => order.indexOf(a.specimenId) - order.indexOf(b.specimenId));
}

async function dispatchCaseToRegistry(input: CytologySignOutInput, records: CytologySignOutRecord[], justSigned: CytologySignOutRecord, deps: CytologySignOutDeps): Promise<void> {
  const latest = registryOrder(input, records);
  const allReviews = latest.some(r => r.id !== justSigned.id) ? await deps.getAllReviews().catch(() => null) : null;
  for (const r of latest) {
    if (r.id === justSigned.id) { await dispatchToRegistry(input, r, deps); continue; }
    const review = allReviews?.ok ? allReviews.data.find(v => v.id === r.reviewRecordId) : undefined;
    if (!review) continue;
    await submitScreeningRegistryResult({
      caseData: input.caseData, record: r, review, categories: input.categories,
      // The registry has had nothing for this sample yet: its first submission, whatever the record.
      isGynCytology: input.gateInputs.isGynCytology, kind: 'signOut',
    }, deps);
  }
}

/**
 * Batch 532 (Pete, Oct 12, 2026): releasing a case that was finalized before
 * every cytology specimen was signed out (cytologyCaseFinalization.ts). The
 * consolidated case report goes out once (FINAL), listing each unsigned
 * specimen as "not reported" with the reason, and each signed sample goes to
 * the registry. Before Batch 532 an early finalization published nothing.
 */
export async function releaseFinalizedCytologyCase(
  input: { caseId: string; categories: CytologySignOutInput['categories']; isGynCytology: boolean; user: { id: string; name: string }; previousStatus?: string },
  deps: CytologySignOutDeps,
): Promise<void> {
  const caseData = await deps.getCase(input.caseId);
  if (!caseData) return;
  const recordsRes = await deps.getCaseSignOutRecords(input.caseId);
  const records = recordsRes.ok ? recordsRes.data : [];
  if (!records.length) return;
  const event = {
    caseId: input.caseId, reportType: 'FINAL' as const, releasedAt: deps.now().toISOString(),
    releasedBy: { id: input.user.id, name: input.user.name }, source: 'CYTOLOGY' as const,
    performingFacilityId: caseData.order?.facilityId,
    generatePdf: () => (deps.generateCaseReportPdfSnapshot
      ? deps.generateCaseReportPdfSnapshot(caseData, records)
      : Promise.resolve({ generationError: 'No case report renderer.' })),
  };
  const latest = [...latestRecordPerSpecimen(records).values()];
  if (deps.releaseReport) {
    // Batch 534: through the release delay; Recall undoes the early finalization.
    await deps.releaseReport(event, {
      kind: 'cytology-finalize-early', releasedBy: { userId: input.user.id, userName: input.user.name },
      subject: { previousStatus: input.previousStatus ?? 'in-progress' },
      followUps: [{ type: 'cytology-registry', recordIds: latest.map(r => r.id), isGynCytology: input.isGynCytology, categories: input.categories }],
    });
    return;
  }
  await deps.publishReportReleased(event);
  const allReviews = await deps.getAllReviews().catch(() => null);
  for (const r of latest) {
    const review = allReviews?.ok ? allReviews.data.find(v => v.id === r.reviewRecordId) : undefined;
    if (!review) continue;
    await submitScreeningRegistryResult({
      caseData, record: r, review, categories: input.categories, isGynCytology: input.isGynCytology, kind: 'signOut',
    }, deps);
  }
}

