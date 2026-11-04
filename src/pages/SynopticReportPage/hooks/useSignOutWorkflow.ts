// src/pages/SynopticReportPage/hooks/useSignOutWorkflow.ts
// ─────────────────────────────────────────────────────────────────────────────
// Extracted from SynopticReportPage.tsx as the second half of a two-part
// extraction (amendment first, then this) that was originally scoped as
// two separate domains but turned out to be genuinely, deeply cross-
// called — see useAmendmentWorkflow.ts's header for the full rationale.
//
// PURE MOVE, not a rewrite — every function body is unchanged.
//
// This hook depends on useAmendmentWorkflow's output: both
// releasePendingAmendmentOrAddendum and openAmendmentDraft are received
// as parameters here, not redefined. That's the real call-graph
// direction — handlePreFinalConfirm and handleFinalizeConfirm both call
// finalizeCase() then releasePendingAmendmentOrAddendum() in sequence.
//
// STATE OWNED HERE (moved in fully — verified via grep that each is
// only used within this file's original boundary or in JSX, before
// moving): missingFields, showMissingWarning, reviewFields,
// showAiReview, finalizeAndNextPending, showPreFinalise,
// preFinalSynoptics.
//
// STATE DELIBERATELY NOT OWNED HERE, received as parameters instead:
//   - activeReportInstanceId, orchSections: too central/widely-read
//     elsewhere, same reasoning as every prior extraction tonight.
//   - countersignFeedback: defined earlier in the main file, read in
//     JSX (a feedback textarea), so it stays there.
//   - fixativeGateSpecimens/setFixativeGateSpecimens,
//     pendingFinalizeArgs/setPendingFinalizeArgs: defined near the top
//     of the component (before this domain's original boundary) and
//     read directly in JSX for the FixativeTimeGateModal — stay in the
//     main file, only the setters are threaded through.
//   - specimenDictionary: comes from the pre-existing
//     useSpecimenDictionary() hook.
//   - setCaseSigned, showSignOutModal/setShowSignOutModal,
//     setAmendmentMode, setShowAmendmentModal, setShowFinalizeModal:
//     come from the pre-existing useSynopticModals() hook.
//   - pendingReconciliation/setPendingReconciliation: defined before
//     this domain's boundary, drives the FrozenToPermanentReconciliation
//     modal directly in JSX.
//   - sendSynopticReportToLis: from useLisIntegration.
//   - generateReportPdfSnapshot: stays in the main component (reads
//     resolvedContext/orchSections directly).
//   - releasePendingAmendmentOrAddendum, openAmendmentDraft: from
//     useAmendmentWorkflow, per the dependency direction above.
// ─────────────────────────────────────────────────────────────────────────────

import { destroyHistoryCacheAtSignOut } from '@/services/patientHistory/runHistoryRefreshSweep';
import { dispatchQueuedChargesForCase, dispatchFinancialClass } from '@/services/interfaceDispatch/dispatchCharge';
import type { NotificationMethod } from '@/types/reports/AmendmentRecord';
import type { AuditLogFn } from '@/components/Audit/useAuditLog';
import { countBlockMessage, findSynopticEntryChecks, totalWarningsMessage } from '@/services/templates/synopticEntryChecks';
import { useState, useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { createReconciliationQueue, planFrozenReconciliation } from '@/services/quality/frozenReconciliationPlan';
import { useTranslation } from 'react-i18next';
import { getSessionUser, canFinalizeCase, resolveCountersignRequiredTypeIds } from '@/services/auth/caseAccessControl'; import { authorizeSurgicalSignOut } from '@/services/auth/authorizeSurgicalSignOut'; // Batch 649
import { countersignService, userService, qaSupervisionAssignmentService, FPPE_ACTIVITY_TYPE_ID, reportReleaseService, serviceChargeService, ncciEditService, billingDeficiencyService, criticalResultNotificationService, ABNORMAL_FINDING_CONFIRMATION_ACTIVITY_TYPE_ID, outboundChargeQueueService, codeReviewPoolService, billingTypeTriggerConfigService } from '@/services';

import { intraoperativeService, codeSystemPolicyService, auditService } from '@/services';
import { getCurrentJurisdiction } from '@/services/retentionPolicy/RetentionPolicy';
import { collectCaseEntries, signOutCodeCheck, isoDayOf, codeSignOutOverrideAudit } from '@/services/coding/codePolicyEnforcement';
import { concordanceReviewSettingsService } from '@/services';
import { runSignOutReviewGates, findMicroscopicBlockingSpecimens, findSynopticSignOutFieldProblems, unacceptedAiNarrativeSections, recordAiOmittedAtSignOut } from '@/services/signoutGates/signOutReviewGates';
import { completeSurgicalSignOut, commitCountersignRelease } from '@/services/surgicalSignOut/completeSurgicalSignOut';
import { releaseRevisionsAtSignOut, type RevisionsOutcome } from '@/services/surgicalSignOut/releaseRevisionsAtSignOut';
import { releaseSurgicalFinal, surgicalFinalReleaseDeps, surgicalFinalGoesToRegistry } from '@/services/surgicalSignOut/releaseSurgicalFinal';
import { amendmentService, reportVersionService, signatureGate } from '@/services';
import type { SignatureConfirmation } from '@/services/auth/signerConfirmation';
import { caseRouter } from '@/services/cases/CaseRouter';
import { syncPrimaryAssignee } from '@/services/cases/caseAssignmentSync';

import { publishReportReleasedEvent } from '@/services/reports/publishReportReleasedEvent';
import { publishReleasedRevision, releasedRevisionDeps } from '@/services/reports/publishReleasedRevision';
import { finalizedAssistWorkups } from '@/services/reports/assistFinalize';

import type { BillingDeficiencyType, BillingDeficiencySeverity } from '@/types/billing/BillingDeficiencyRecord';
import { checkSignOutBillingDeficiencies } from '@/services/billing/checkSignOutBillingDeficiencies';
import { narrativeForDetection } from '@/services/clinical/narrativeForDetection';
import { loadCriticalFindings, saveCriticalFindings } from '@/services/clinical/criticalFindingStore';
import { detectCriticalFindings } from '@/services/clinical/detectCriticalFindings';
import type { CriticalFindingFlag } from '@/services/clinical/detectCriticalFindings';

import { dispatchCriticalAlerts } from '@/services/clinical/dispatchCriticalAlerts';
import { abnormalTriggerRuleService } from '@/services';
import { evaluateAbnormalTriggerRules, toCriticalFindingFlag } from '@/services/abnormalDetection/evaluateAbnormalTriggerRules';
import { resolveSyntheticCoding } from '@/services/abnormalDetection/resolveSyntheticCoding';
import { activeLicensedSystems, todayIso } from '@/services/terminologyLicence/terminologyLicence';
import { abnormalDetectionSignalService, qaActivityRecordService } from '@/services';

import { applySurgicalPostSignOutQa } from '@/services/quality/applySurgicalPostSignOutQa';
import { runMarginRuleEvaluation } from '@/services/tumorBoardRules/runMarginRuleEvaluation';
import { recordAbnormalDetectionOutcomes, type AbnormalDetectionOutcome } from '@/services/abnormalDetection/recordAbnormalDetectionOutcomes';
import { resolveActiveStudyId } from '@/services/validationStudies/resolveActiveStudyId';
import { resolveAnswers } from '@/orchestrator/contextBuilder';
import { resolveAbnormalDetectionEnabled } from '@/services/abnormalDetection/resolveAbnormalDetectionEnabled';
import { useSystemConfig } from '@/contexts/SystemConfigContext';

import { shouldRandomlySampleForCodeReview } from '@/services/billing/shouldRandomlySampleForCodeReview';

import { facilityService } from '@/services';
import { markFollowUpExpectedLive, followUpMarkFailureKey } from '@/services';
import { resolvePerformingLabFacilityId } from '@/services/facilities/IFacilityService';
import { resolveFinalizeAuthorityContext } from '@/services/auth/resolveFinalizeAuthorityContext';
import { sweepChargesForOutbox } from '@/services/billing/sweepChargesForOutbox';

import { validateChargeMetadata } from '@/services/billing/validateChargeMetadata';
import { sendEmail } from '@/services/communications/notificationService';
import { resolveResidentCountersignRequired } from '@/services/cases/resolveResidentCountersignRequired';
import type { FixativeGateSpecimen } from '../modals/FixativeTimeGateModal';
import type { PreAnalyticDateGateSpecimen } from '../modals/PreAnalyticDateGateModal';
import { PreFinalisationModal, type SynopticForReview } from '../modals/PreFinalisationModal';
import { buildSynopticReviewEntries, type ReviewTemplate } from '@/services/reports/synopticReviewEntries';
import { getTemplate } from '@/services/templates/templateService';
import { PathScribeAIService } from '@/services/aiIntegration/PathScribeAIService';
import type { EditorTemplate } from '@/components/Config/Protocols/SynopticEditor';
import { buildReviewFieldsFromAiSuggestions } from './buildReviewFieldsFromAiSuggestions';
import type { Case, SynopticReportInstance, CaseParticipant } from '@/types/case/Case';
import type { CaseStatus } from '@/types/case/CaseStatus';
import type { Specimen } from '@/types/case/Specimen';
import type { SpecimenEntry } from '@/services/specimenDictionary/specimenTypes';
import type { FrozenCategory } from '@/types/intraop/IntraoperativeEntry';
import type { MissingRequiredField, ReviewField } from '../components/RightSynopticPanel';
import type { RightSynopticPanelHandle } from '../components/RightSynopticPanel';
import type { OrchestratorSection } from '../components/OrchestratorSectionEditor';
import type { SigningUser, SetConcurrencyConflict, SendSynopticReportToLisFn, GenerateReportPdfSnapshotFn } from './sharedHookTypes';
import { handleConcurrencyConflict } from './sharedHookTypes';
import { completeAssistFinalize } from '@/services/surgicalSignOut/completeAssistFinalize';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';
import { checkStainQcGate } from './checkStainQcGate';
import { checkInkingSignOutGate } from './checkInkingSignOutGate';
import type { InkingGateResult } from '@/services/grossing/evaluateInkingGate';
import { checkClinicalMismatch, checkPeerReviewGate } from './checkPeerReviewAndMismatch';
import type { ClinicalMismatchAssessment, PeerReviewStatus } from '@/services';
import type { StainQcGateBlockingItem } from './checkStainQcGate';
import { partGridRowsOf } from '@/services/templates/partGrid';
import { findDerivedMarginConflicts, findInvasiveMarginGaps, findMohsBlockGaps, findStaleOrganMapFigures } from '@/services/organMapping/organMapLive';
import { invasiveMarginGapsMessage } from '@/services/organMapping/organMapLabels';
import { findMolecularResultDifferencesLive, molecularDifferencesMessage } from '@/services/molecularOrders/molecularSignOutCheck';

// PreFinalisationModal imported only for its co-located SynopticForReview
// type re-export — not rendered from this hook.
void PreFinalisationModal;

interface UseSignOutWorkflowParams {
  caseData: Case | null;
  /** Batch 465b: asks the person to go past a warning (a hand-entered total that differs from its grid); false = stop. */
  confirmWarnings?: (message: string) => Promise<boolean>;
  setCaseData: React.Dispatch<React.SetStateAction<Case | null>>;
  signingUser: SigningUser;
  /** The report page's toast; messages naming the case pass `{ containsPhi: true }`. */
  showToast: import('@/pages/Synoptic/useSynopticToast').ShowToast;
  activeReportInstanceId: string;
  knownVersionRef: MutableRefObject<number>;
  setConcurrencyConflict: SetConcurrencyConflict;
  sendSynopticReportToLis: SendSynopticReportToLisFn;
  generateReportPdfSnapshot: GenerateReportPdfSnapshotFn;
  isOrchestrationMode: boolean;
  // Real fix (review pass): this was previously typed as the narrow,
  // incorrect { id: string; text: string }[] — code below reads
  // s.aiGenerated and s.label, neither of which exist on that type, and
  // only worked because the map/filter callbacks re-cast each item to
  // `any` internally. The declared type was wrong, not the code; fixed
  // to the real OrchestratorSection type shared with useOrchestratorDraft
  // and useReportGeneration, which is what the caller actually passes.
  orchSections: OrchestratorSection[];
  setCaseSigned: (signed: boolean) => void;
  setShowSignOutModal: (show: boolean) => void;
  setPendingReconciliation: (rec: { specimenId: string; caseType: string; frozenCategory: FrozenCategory; frozenDx: string } | null) => void;
  countersignFeedback: string;
  /** Batch 454: the signer ticked "follow-up specimen expected" in the sign-out modal. */
  followUpExpected?: boolean;
  specimenDictionary: SpecimenEntry[];
  setFixativeGateSpecimens: (specs: FixativeGateSpecimen[] | null) => void;
  /** Real, per PS-289/PS-292's own Gating Strategy — see
   *  checkStainQcGate.ts's own header for the full reasoning. Same
   *  real "hard block, own gate-resolution modal" shape as the
   *  fixative/pre-analytic gates above. */
  setStainQcGateBlocking: (items: StainQcGateBlockingItem[] | null) => void;
  /** Batch 439 (PS-145): a suggested clinical-pathologic mismatch to decide
   *  before sign-out (ClinicalMismatchModal). Same resume shape as the gates.
   *  Batch 530 (PS-554): only a high-risk one; a low-risk one is logged. */
  setClinicalMismatch: (assessment: ClinicalMismatchAssessment | null) => void;
  /** Batch 439 (PS-144): the peer-review gate stopped sign-out (PeerReviewGateModal). */
  setPeerReviewGate: (status: PeerReviewStatus | null) => void;
  /** Batch 484 (Structured Inking Sign-Out & Grossing Gate Logic Engine;
   *  PS-519 follow-up). Gate B — null when nothing interrupts sign-out
   *  (a clean case or Severity-2-only, advisory, never a block); set only
   *  for BLOCK, OVERRIDE_REQUIRED or PALETTE_UNAVAILABLE (InkingGateModal). */
  setInkingGateBlocking: (result: InkingGateResult | null) => void;
  setPreAnalyticDateGateSpecimens: (specs: PreAnalyticDateGateSpecimen[] | null) => void;
  setPendingFinalizeArgs: (args: string[]) => void;
  /** Real, per direct guidance (retiring Finalize for Orchestration
   *  Mode): tells the gate-resolution callbacks in
   *  SynopticReportPage.tsx to resume handleSignOutConfirm() rather
   *  than finalizeCase(args) once a pre-analytic/fixative gate this
   *  function itself raised is resolved. */
  setPendingActionIsSignOut: (v: boolean) => void;
  synopticPanelRef: MutableRefObject<RightSynopticPanelHandle | null>;
  /** Real fix, per direct product decision: navigates the pathologist
   *  directly to a specific field (via RightSynopticPanel's existing
   *  scrollToField/alertFieldId mechanism) rather than opening a
   *  separate review modal — used to redirect to the first blocking
   *  unverified field when finalize is stopped. */
  setAlertFieldId: (id: string | null) => void;
  /** Same tab-switch-before-navigate need as the existing
   *  handleMissingFieldClick — if the pathologist is on a different
   *  tab (e.g. Material) when Finalize is blocked, alertFieldId alone
   *  won't visibly land them anywhere, since RightSynopticPanel needs
   *  to actually be mounted/visible for its scrollToField effect to
   *  do anything. */
  safeSetLeftTab: (tab: string) => void;
  /** Real feature, per direct follow-up: "Wire evaluateMicroscopicFinalizeGate
   *  into handleRequestFinalize." Redirects the pathologist straight
   *  to the blocking specimen's Microscopic panel — same real
   *  "navigate to what's actually blocking" pattern setAlertFieldId
   *  above already uses for the unverified-AI-suggestion check. */
  setActiveSpecimenId: (id: string) => void;
  setActiveReportType: (type: 'grossing' | 'microscopic' | 'synoptic') => void;
  setAmendmentMode: (mode: 'amendment' | 'correction' | 'addendum') => void;
  setShowAmendmentModal: (show: boolean) => void;
  setShowFinalizeModal: (show: boolean) => void;
  openAmendmentDraft: (mode: 'amendment' | 'correction' | 'addendum') => Promise<void>;
  releasePendingAmendmentOrAddendum: (onVersion?: (version: ReportVersionRecord) => void) => Promise<string | undefined>;
  // Batch 511 (PS-478): the page's typed audit logger, so each event and its details are checked against the audit catalogue.
  log: AuditLogFn;
}

// Real, per direct guidance's own severity categorization for each real
// Trigger A-F: NCCI bundling is a genuinely never-bypassable rejection
// risk. Missing ICD-10 and a wrong/omitted TC/26 modifier are both
// real, well-known claim-rejection causes in practice - CRITICAL_REJECTION_RISK,
// not merely a warning. An unattached ancillary order and a specimen
// billed above its own configured default are both real, but
// genuinely could be legitimate - COMPLIANCE_WARNING, routed to QA for
// a human judgment call, never auto-rejected. A $0.00 fee-schedule
// mapping gap is real, uncollected revenue, not a compliance/rejection
// risk at all - REVENUE_LEAKAGE, the one real trigger that
// legitimately uses this severity.
const BILLING_DEFICIENCY_SEVERITY: Record<BillingDeficiencyType, BillingDeficiencySeverity> = {
  UNSUPPORTED_CPT_LEVEL: 'COMPLIANCE_WARNING',
  NCCI_BUNDLING_VIOLATION: 'CRITICAL_REJECTION_RISK',
  MISSING_DIAGNOSTIC_ICD10: 'CRITICAL_REJECTION_RISK',
  UNATTACHED_ANCILLARY_ORDER: 'COMPLIANCE_WARNING',
  MODIFIER_MISMATCH: 'CRITICAL_REJECTION_RISK',
  ZERO_FEE_MAPPING_ERROR: 'REVENUE_LEAKAGE',
  // Batch 433: raised by billing staff, not at sign-out.
  MISSING_CHARGE: 'REVENUE_LEAKAGE',
  POST_SIGNOUT_CORRECTION: 'COMPLIANCE_WARNING',
  // Batch 588: raised when a block is deleted (services/material/deleteBlockInProcess.ts), not at sign-out.
  BLOCK_DELETED: 'COMPLIANCE_WARNING',
};

// Real, per direct guidance (retiring Finalize for Orchestration Mode,
// per "Path B Execution Plan": "Lift the pre-analytic date gate and
// the fixative-time gate directly out of finalizeCase() and insert
// them into handleSignOutConfirm()"). Extracted as a pure, shared
// helper rather than duplicated inline in both real callers —
// finalizeCase() (still real and active for Assist Mode's own
// Finalize) and handleSignOutConfirm() (Orchestration Mode's Sign Out
// Case, which now also needs these same real, hard-block gates since
// Finalize is being retired there). Same real gate logic either way,
// never two independently-maintained copies that could quietly drift.
// Real, per direct guidance ("Yes, complete the work" — wiring real
// enforcement for the per-performing-lab sign-out-authority flags added
// in the prior pass): resolves the two real facts canFinalizeCase() needs
// to make a data-driven decision instead of the old hardcoded literal —
// every real ParticipationTypeRecord (so .canFinalize/.authorityOverrides
// are actually read, not just displayed on the admin screen) and this
// case's own real performing-lab facility id (so a lab's own override
// actually takes effect) — same real resolvePerformingLabFacilityId()
// resolution already used elsewhere in this file (fetchCriticalFindings
// above, fetchBillingDeficiencyFindings below), reused rather than
// re-derived.
//
// Best-effort by design: a failed fetch resolves to an empty
// participationTypes array / undefined lab id rather than throwing —
// canFinalizeCase()'s own FINALIZE_ELIGIBLE_PARTICIPATION_TYPES_FALLBACK
// still applies in that case, so a transient service hiccup can never
// silently lock out every legitimate finalizer, only fall back to the
// pre-existing hardcoded behavior for that one attempt.
//
// Real, per direct correction (jurisdiction-bound signing authority):
// also resolves the performing lab's own `Facility.jurisdiction`, fed
// into resolveParticipationTypeAuthority()'s new middle tier
// (`ParticipationTypeRecord.jurisdictionProfiles` — see
// IParticipationTypeService.ts), via the shared
// resolveCasePerformingLabScope() — the same resolution CaseTeamModal.tsx
// uses, so the editor and this gate can never disagree on which
// country's rules govern a case.
// resolveFinalizeAuthorityContext() moved to
// services/auth/resolveFinalizeAuthorityContext.ts (Batch 331, PS-327) so
// Cytology and Autopsy sign-out resolve authority the same way.

function checkPreAnalyticAndFixativeGates(
  caseData: Case,
  specimenDictionary: SpecimenEntry[],
): { preAnalyticBlocking: PreAnalyticDateGateSpecimen[]; fixativeBlocking: FixativeGateSpecimen[] } {
  const preAnalyticBlocking: PreAnalyticDateGateSpecimen[] = (caseData.specimens ?? [])
    .filter((sp: Specimen) => (!sp.collectedAt && !sp.collectedAtAdministrativeOverride)
      || (!sp.receivedAt && !sp.receivedAtAdministrativeOverride))
    .map((sp: Specimen) => ({
      specimenId: sp.id,
      label: sp.label,
      description: sp.description,
      missingCollectedAt: !sp.collectedAt && !sp.collectedAtAdministrativeOverride,
      missingReceivedAt: !sp.receivedAt && !sp.receivedAtAdministrativeOverride,
    }));

  const fixativeBlocking: FixativeGateSpecimen[] = (caseData.specimens ?? [])
    .filter((sp: Specimen) => {
      const entry = sp.specimenDictionaryEntryId
        ? specimenDictionary.find(e => e.id === sp.specimenDictionaryEntryId)
        : undefined;
      return entry?.requireFixativeTimeBeforeSignout && !sp.processing?.processedAt;
    })
    .map((sp: Specimen) => ({ specimenId: sp.id, label: sp.label, description: sp.description }));

  return { preAnalyticBlocking, fixativeBlocking };
}

export function useSignOutWorkflow({
  caseData, setCaseData, signingUser, showToast, activeReportInstanceId,
  knownVersionRef, setConcurrencyConflict, sendSynopticReportToLis,
  generateReportPdfSnapshot, isOrchestrationMode, orchSections,
  setCaseSigned, setShowSignOutModal, setPendingReconciliation,
  countersignFeedback, followUpExpected, specimenDictionary, setFixativeGateSpecimens, setStainQcGateBlocking, setClinicalMismatch, setPeerReviewGate, setInkingGateBlocking,
  setPreAnalyticDateGateSpecimens, setPendingActionIsSignOut,
  setPendingFinalizeArgs, synopticPanelRef, setAlertFieldId, safeSetLeftTab,
  setActiveSpecimenId, setActiveReportType,
  setShowFinalizeModal,
  releasePendingAmendmentOrAddendum, log, confirmWarnings,
}: UseSignOutWorkflowParams) {
  // Real, per direct guidance (PS-105): "If the enterprise level is
  // disabled then the performing facility level is disabled and
  // cannot be overridden." Resolved once per hook instance — the real
  // facility-level value is looked up per-case inside
  // fetchCriticalFindings below (the case's own real ordering
  // facility isn't known until then).
  const { enterpriseConfig } = useSystemConfig();
  // i18n note: `canFinalizeCase()`'s own `.reason` (from
  // @/services/auth/caseAccessControl, shown as-is at the two
  // `showToast(...Decision.reason)` spots below) is now translated at
  // its own source — that file resolves it via a direct i18next
  // instance call (it's a plain service, not a hook), so both call
  // sites here stay correct simply by displaying whatever it returns,
  // in any language, with no wrapping needed here.
  const { t, i18n } = useTranslation();

  // Batch 345: the case's accession as the signing screens pass it, so a
  // signature confirmed for one case can't be used on another.
  const signingCaseRef = caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? null;

  // Batch 649 (sign-out audit): every sign-out ends here, the frozen-section reconciliation resume included. The
  // writes go in an order that keeps status, version and signature consistent (status first; a later failure puts
  // the status back), the signature is linked to the exact version and its PDF hash, a countersign failure is
  // shown and stops, and the FINAL with its registry submission goes when released (services/surgicalSignOut/).
  const reconciliationQueue = useRef(createReconciliationQueue());
  const finalizeSignOut = useCallback(async () => {
    if (!caseData?.id) return;
    const nextReconciliation = reconciliationQueue.current.next();
    if (nextReconciliation) { setPendingReconciliation(nextReconciliation); return; }
    const caseId = caseData.id;
    let current: Case = caseData;
    const update = async (patch: Partial<Case>) => {
      await caseRouter.updateCase(caseId, patch, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
      current = { ...current, ...patch };
      setCaseData(current);
    };
    const createdBy = { userId: signingUser?.id ?? 'unknown', userName: signingUser?.name ?? 'Unknown User' };
    const releasedBy = { id: signingUser?.id ?? '', name: signingUser?.name ?? signingUser?.id ?? '' };
    const pdfSnapshot = async () => {
      const pdf = await generateReportPdfSnapshot();
      if (pdf.generationError) showToast(t('useSignOutWorkflow.toast.versionSavedPdfSnapshotFailed', { error: pdf.generationError }), 'warning');
      return pdf;
    };
    let revisions: RevisionsOutcome | null = null;
    const result = await completeSurgicalSignOut({ caseData, orchestration: isOrchestrationMode, signerId: signingUser?.id ?? null }, {
      update, now: () => new Date(),
      resolveBuffer: c => reportReleaseService.resolveBufferForCase(c),
      completeCountersign: async () => {
        const r = await countersignService.countersign({ caseId, attendingId: createdBy.userId, attendingName: createdBy.userName,
          currentAnswersByInstance: answersByInstance(caseData), attendingFeedback: countersignFeedback.trim() || undefined });
        if (r.ok) await recordFppeCaseReviewed(caseData);
        return r;
      },
      releaseRevisions: async () => {
        revisions = await releaseRevisionsAtSignOut(current, {
          release: (id, body) => amendmentService.release(id, { body }),
          publish: (instance, record) => publishReleasedRevision({
            caseId, instance: { instanceId: instance.instanceId, templateId: instance.templateId, lastRevisionType: instance.lastRevisionType },
            record, releasedBy, performingFacilityId: caseData.order?.facilityId, previousStatus: caseData.status, generatePdf: generateReportPdfSnapshot,
          }, releasedRevisionDeps),
          sendToLis: (instance, payloadBody) => sendSynopticReportToLis({ kind: 'corrected', caseId, instanceId: instance.instanceId, payloadBody }),
          createAssistVersion: async instance => reportVersionService.create({ caseId, mode: 'assist', trigger: 'amendment', createdBy, ...(await pdfSnapshot()),
            synopticAnswersSnapshot: instance.answers, instanceId: instance.instanceId, amendmentRecordId: instance.pendingAmendmentId }),
          saveReports: update,
        });
      },
      createVersion: async () => {
        const existing = await reportVersionService.getByCaseId(caseId);
        return reportVersionService.create({ caseId, mode: 'orchestration', trigger: (existing.ok ? existing.data.length : 0) === 0 ? 'initial_signout' : 'amendment', createdBy, ...(await pdfSnapshot()) });
      },
      commitSignature: link => signatureGate.commit(caseData.id, 'signed', link),
    });
    const done = revisions as RevisionsOutcome | null;
    if (done?.notTransmitted) showToast(t('useSignOutWorkflow.toast.correctedInstancesNotTransmitted', { count: done.notTransmitted }), 'warning');
    if (done?.notReleased) showToast(t('useSignOutWorkflow.toast.revisionsNotReleased', { count: done.notReleased }), 'warning');
    if (result.ok === false) {
      setShowSignOutModal(false);
      if (handleConcurrencyConflict(result.error, setConcurrencyConflict, { blockOverride: true })) return;
      console.error(`[useSignOutWorkflow] Sign-out stopped at ${result.step}:`, result.error);
      showToast(result.step === 'countersign' ? t('useSignOutWorkflow.toast.countersignFailed', { error: String(result.error) })
        : t(result.compensated ? 'useSignOutWorkflow.toast.signOutNotCompleted' : 'useSignOutWorkflow.toast.signOutNotCompletedStatusKept'), 'warning');
      return;
    }
    if (!result.signature) console.error('[useSignOutWorkflow] Signed out, but no signature record was saved for case', caseId);

    setCaseSigned(true);
    setShowSignOutModal(false);
    setPendingReconciliation(null);
    showToast(t('useSignOutWorkflow.toast.caseSignedOutSuccessfully'));

    // Batch 454: a follow-up specimen the signer said is expected; a failure is said but never undoes the sign-out.
    if (followUpExpected && signingUser?.id) {
      const marked = await markFollowUpExpectedLive(caseId, { id: signingUser.id, name: signingUser.name ?? signingUser.id });
      if (marked.ok === false) showToast(t(`useSignOutWorkflow.toast.followUpNotMarked.${followUpMarkFailureKey(marked.reason)}`), 'warning');
    }

    // PS-324 post-sign-out QA and Batch 491 Tumor Board auto-flagging: fire-and-forget, surgical only.
    applySurgicalPostSignOutQa(caseId).catch(e => console.error('[useSignOutWorkflow] Could not apply surgical post-sign-out QA selection/correlation detection:', e));
    resolveFinalizeAuthorityContext(caseData).then(({ performingLabFacilityId }) => runMarginRuleEvaluation({
      caseId, caseAccession: signingCaseRef ?? caseId, facilityId: performingLabFacilityId,
      instances: (caseData.synopticReports ?? []).map((r: SynopticReportInstance) => ({ instanceId: r.instanceId, templateId: r.templateId, answers: r.answers ?? {} })),
      getTemplateFields: async (templateId: string) => {
        const detail = await getTemplate(templateId);
        return (detail.template.sections ?? []).flatMap(s => (s.fields ?? []).map(f => ({ id: f.id, label: f.label, type: f.type })));
      },
      byUserId: createdBy.userId, byUserName: createdBy.userName,
    })).then(r => {
      if (r.flagged && r.board) showToast(t('useSignOutWorkflow.toast.autoFlaggedForTumorBoard', { board: t(`tumorBoard.boards.${r.board}`) }));
    }).catch(e => console.error('[useSignOutWorkflow] Could not run the Tumor Board auto-flag rule evaluation:', e));

    // The release: held for the delay (released when it ends, registry included), or now.
    if (result.buffer?.applies && result.statusPatch?.releaseBufferExpiresAt) {
      trackSignOutBufferLazy(caseId, result.statusPatch.releaseBufferExpiresAt, signingUser, caseData.order?.facilityId);
      log('sign_out_buffered', { caseId, accession: caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber, durationMinutes: result.buffer.durationMinutes, facilityId: caseData.originHospitalId });
      showToast(t('useSignOutWorkflow.toast.reportSignedDispatchIn', { minutes: result.buffer.durationMinutes }));
    } else if (result.buffer) {
      void releaseSurgicalFinal(current, { caseId, reportType: 'FINAL', releasedAt: new Date().toISOString(),
        releasedBy: signingUser?.id ? releasedBy : undefined, performingFacilityId: caseData.order?.facilityId }, surgicalFinalReleaseDeps);
    } else if (surgicalFinalGoesToRegistry(caseData)) {
      // No PathScribe-held release on this path (the case's status isn't PathScribe's): the registry goes now, as before.
      surgicalFinalReleaseDeps.dispatchRegistry(caseData, caseData.order!.facilityId!, caseData.order?.facilityName).catch(() => {});
    }
  }, [caseData, sendSynopticReportToLis, generateReportPdfSnapshot, isOrchestrationMode, signingUser, setCaseSigned, setShowSignOutModal, showToast, setCaseData, knownVersionRef, setConcurrencyConflict, setPendingReconciliation, followUpExpected, countersignFeedback, signingCaseRef, log, t]);

  // Real, per direct guidance ("Yes we should scope 'Return to
  // Trainee'/'Reject with Notes'. I think the delegation workflow
  // might be a good method"): the attending's real alternative to
  // countersign() — declines the resident's submission and sends the
  // case back, rather than accepting and finalizing it. Deliberately
  // a separate, standalone action from handleSignOutConfirm() (never
  // called from within it) — an attending choosing to reject a case
  // never touches finalizeSignOut()/reportVersionService.create() at
  // all, since nothing about this case is being finalized.
  const handleReturnToTrainee = useCallback(async () => {
    if (!caseData?.id || caseData.status !== 'pending-countersign') return;

    const trimmedFeedback = countersignFeedback.trim();
    if (!trimmedFeedback) {
      showToast(t('useSignOutWorkflow.toast.feedbackRequiredForReturn'), 'warning');
      return;
    }

    const result = await countersignService.reject({
      caseId: caseData.id,
      attendingId: signingUser?.id ?? 'unknown',
      attendingName: signingUser?.name ?? 'Unknown User',
      attendingFeedback: trimmedFeedback,
    });
    if (!result.ok) {
      showToast((result as { ok: false; error: string }).error ?? t('useSignOutWorkflow.toast.couldNotReturnCase'), 'warning');
      return;
    }
    const record = result.data;

    // Real, per direct guidance: the same real ownership-transfer
    // primitive delegateCase()'s own transfersOwnership branch uses
    // (services/cases/caseAssignmentSync.ts) — deliberately reused
    // directly rather than going through delegateCase()/creating a
    // second, parallel DelegationRecord for the same event; the
    // real CountersignRecord above is already this specific
    // relationship's own audit trail.
    const syncUpdates = syncPrimaryAssignee(caseData, record.residentId, signingUser?.id ?? 'unknown', record.residentName);

    // Real, per direct guidance, same reasoning as Phase 4's own
    // per-instance sync fix (release() above): the per-instance
    // 'pending-countersign' status set at release time must be
    // reverted too, or the resident can't actually re-edit their own
    // synoptic reports — RightSynopticPanel.tsx's own tab-dot
    // indicator, and any other real UI gated on instance status,
    // would stay stuck showing pending-countersign forever.
    const revertedReports = (caseData.synopticReports ?? []).map((r: SynopticReportInstance) =>
      r.status === 'pending-countersign' ? { ...r, status: 'draft' as const } : r
    );

    const patch: Partial<Case> = {
      ...syncUpdates,
      status: 'returned' as CaseStatus,
      returnedBy: signingUser?.id ?? 'unknown',
      synopticReports: revertedReports,
    };

    try {
      await caseRouter.updateCase(caseData.id, patch, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
      setCaseData({ ...caseData, ...patch } as typeof caseData);
      setShowSignOutModal(false);
      showToast(t('useSignOutWorkflow.toast.caseReturnedForRevision', { name: record.residentName }));
    } catch (e) {
      if (handleConcurrencyConflict(e, setConcurrencyConflict, { blockOverride: true })) return;
      console.error('[useSignOutWorkflow] Failed to apply the real return-to-trainee state transition:', e);
      showToast(t('useSignOutWorkflow.toast.feedbackRecordedUpdateFailed'), 'warning');
    }
  }, [caseData, countersignFeedback, signingUser, showToast, setShowSignOutModal, knownVersionRef, setCaseData, setConcurrencyConflict, t]);

  // ── Build SynopticForReview[] for PreFinalisationModal ─────────────────
  // Batch 738: built in services/reports/synopticReviewEntries.ts (template labels; option labels, not stored ids).
  const buildSynopticsForReview = useCallback(async (): Promise<SynopticForReview[]> => {
    if (!caseData?.synopticReports?.length) return [];
    return buildSynopticReviewEntries(caseData.synopticReports, (caseData.specimens ?? []) as Specimen[], async id => {
      try { return ((await getTemplate(id)).template ?? null) as ReviewTemplate | null; }
      catch (e) { console.error(`[PreFinalisation] Could not load template sections for ${id}:`, e); return null; }
    });
  }, [caseData]);

  const [missingFields,          setMissingFields]          = useState<MissingRequiredField[]>([]);
  const [showMissingWarning,     setShowMissingWarning]     = useState(false);
  const [reviewFields,           setReviewFields]           = useState<ReviewField[]>([]);
  const [showAiReview,           setShowAiReview]           = useState(false);
  const [isSuggestingSynoptic,   setIsSuggestingSynoptic]   = useState(false);
  const [isGeneratingNarrative,  setIsGeneratingNarrative]  = useState(false);
  const [showNarrativeReview,    setShowNarrativeReview]    = useState(false);
  const [generatedNarrativeText, setGeneratedNarrativeText] = useState('');
  const [finalizeAndNextPending, setFinalizeAndNextPending] = useState(false);

  // ── Pre-finalisation + protocol review state ───────────────────────
  const [showPreFinalise,   setShowPreFinalise]   = useState(false);
  const [preFinalSynoptics, setPreFinalSynoptics] = useState<SynopticForReview[]>([]);

  // Real, per direct guidance's own PS-105 scope ("Sign-Out
  // Guardrails" - soft block, not a hard block): a real, detected
  // 'critical' severity finding must be acknowledged or recorded
  // before finalize can proceed to PreFinalisationModal; an
  // 'abnormal' finding is real but non-blocking, same posture as the
  // existing billing-warning check just above. acknowledgedCritical
  // is deliberately session-scoped (not per-finding) - once the
  // pathologist has actually seen and acted on the real modal once,
  // re-detecting the same, unchanged text on a second Finalize click
  // would be pure friction, not a real safeguard.
  const [criticalFindings,        setCriticalFindings]        = useState<CriticalFindingFlag[]>([]);
  // PS-323: findings flagged earlier for this case come back when it is reopened.
  const findingsCaseId = caseData?.id;
  useEffect(() => {
    if (findingsCaseId) setCriticalFindings(loadCriticalFindings(findingsCaseId));
  }, [findingsCaseId]);
  const [showCriticalFindingsModal, setShowCriticalFindingsModal] = useState(false);
  const [acknowledgedCritical,    setAcknowledgedCritical]    = useState(false);

  // Real, shared detection step for Trigger A (UNSUPPORTED_CPT_LEVEL),
  // Trigger B (NCCI_BUNDLING_VIOLATION), Trigger C
  // (MISSING_DIAGNOSTIC_ICD10), Trigger D (UNATTACHED_ANCILLARY_ORDER),
  // Trigger E (MODIFIER_MISMATCH), and Trigger F
  // (ZERO_FEE_MAPPING_ERROR) - read-only, never raises or persists
  // anything itself. Two real callers: previewBillingWarnings
  // (below, via handleRequestFinalize - the actual "pathologist
  // attempts signature" moment, per Trigger A's own trigger event) and
  // finalizeCase's own real, post-commit raise immediately below.
  const fetchBillingDeficiencyFindings = useCallback(async () => {
    if (!caseData?.id) return [];
    const [chargesRes, ncciRes] = await Promise.all([
      serviceChargeService.getChargesForCase(caseData.id),
      ncciEditService.getAll(),
    ]);
    if (!chargesRes.ok || !ncciRes.ok) return [];
    const specimens = (caseData.specimens ?? []).map((sp: Specimen) => ({
      id: sp.id, label: sp.label, specimenDictionaryEntryId: sp.specimenDictionaryEntryId,
      // Real, per Trigger C's own fallback: the specimen's own
      // coding.icd10 override, when it has one.
      icd10: (sp as any).coding?.icd10,
    }));
    // Real, case-wide ICD-10 fallback - same real field
    // validateChargeMetadata.ts already checks at dispatch time; this
    // surfaces the same real gap earlier, at sign-out.
    const caseIcd10Codes = (caseData.order as any)?.icd10Codes ?? [];
    // Real, per Trigger D's own BlockForCheck shape - every real block
    // across every specimen, keyed by id, so a 'stain'-level charge's
    // own blockId resolves directly without a second, specimen-scoped
    // lookup.
    const blocksById = new Map<string, { id: string; lisRequestStatus?: 'pending' | 'confirmed' | 'rejected'; stains: { lisRequestStatus?: 'pending' | 'confirmed' | 'rejected' }[] }>();
    (caseData.specimens ?? []).forEach((sp: Specimen) => {
      (sp.blocks ?? []).forEach(b => {
        blocksById.set(b.id, { id: b.id, lisRequestStatus: b.lisRequestStatus, stains: (b.stains ?? []).map(s => ({ lisRequestStatus: s.lisRequestStatus })) });
      });
    });
    return checkSignOutBillingDeficiencies(chargesRes.data, specimens, specimenDictionary, ncciRes.data, caseIcd10Codes, blocksById);
  }, [caseData, specimenDictionary]);

  // Real, per direct guidance's own revised PS-105 scope: the actual
  // "pathologist attempts electronic signature" detection moment for
  // critical/abnormal narrative findings, same real trigger event as
  // fetchBillingDeficiencyFindings above. Read-only - detects and
  // returns real, structured flags; never records a notification or
  // blocks anything itself. Deliberately scoped to narrative text
  // only (gross/microscopic/ancillary), same real PHI-minimization
  // boundary detectCriticalFindings' own signature already enforces.
  const fetchCriticalFindings = useCallback(async (): Promise<CriticalFindingFlag[]> => {
    // Real, per direct guidance (PS-105): resolve the case's real
    // performing facility once, then gate the entire detection engine
    // on it — enterprise-disabled is an absolute floor; nothing below
    // this point runs at all when it applies, not even the AI call
    // (a real cost/performance win too, not just correctness).
    const orderingFacilityId = caseData?.order?.facilityId;
    let labId: string | undefined;
    let facilityAbnormalDetectionEnabled: boolean | undefined;
    if (orderingFacilityId) {
      const facilityRes = await facilityService.getById(orderingFacilityId);
      if (facilityRes.ok) {
        labId = resolvePerformingLabFacilityId(facilityRes.data);
        facilityAbnormalDetectionEnabled = facilityRes.data.abnormalDetectionEnabled;
      }
    }
    const enabled = resolveAbnormalDetectionEnabled(enterpriseConfig.features.abnormalDetectionEnabled, facilityAbnormalDetectionEnabled);
    if (!enabled) return [];

    let narrativeFindings: CriticalFindingFlag[] = [];
    if (caseData?.diagnostic) {
      // PS-323: includes the Microscopic Description typed for each specimen.
      const res = await detectCriticalFindings(narrativeForDetection(caseData), { caseId: caseData.id, facilityId: caseData.order?.facilityId });
      narrativeFindings = res.ok ? res.data.flags : [];
    }

    // Real, per direct guidance's own unified sign-out review: PS-129's
    // discrete synoptic trigger rules, checked alongside the AI
    // narrative findings above, merged into the same
    // CriticalFindingFlag[] the modal already renders — one real
    // review surface, not two independently-timed/-shaped ones.
    let discreteFindings: CriticalFindingFlag[] = [];
    if (caseData?.synopticReports?.length) {
      const rulesRes = await abnormalTriggerRuleService.getAll();
      if (rulesRes.ok) {
        const activeRules = rulesRes.data.filter(r => r.status === 'Active' && (!r.performingLabFacilityId || r.performingLabFacilityId === labId));

        const licensedNow = activeLicensedSystems(enterpriseConfig.terminologyLicences, todayIso());
        const matchesPerInstance = await Promise.all(caseData.synopticReports.map(async report => {
          try {
            const detail = await getTemplate(report.templateId);
            const resolved = resolveAnswers(report.answers ?? {}, detail?.template ?? null, partGridRowsOf(caseData.specimens));
            return evaluateAbnormalTriggerRules(report.specimenId, resolved, activeRules, licensedNow);
          } catch (e) {
            console.error(`[AbnormalDetection] Could not evaluate trigger rules for instance ${report.instanceId}:`, e);
            return [];
          }
        }));
        discreteFindings = matchesPerInstance.flat().map(toCriticalFindingFlag);
      }
    }

    return [...narrativeFindings, ...discreteFindings];
  }, [caseData, enterpriseConfig]);

  // Batch 649 (sign-out audit): the review checks both sign-out paths run, in one order
  // (services/signoutGates/signOutReviewGates.ts); this only shows the person what stopped it.
  // Assist Finalize checks the open report's fields (reports can be left out at review);
  // Orchestration Sign Out Case signs the whole case, so every report not yet finalized.
  const runReviewGates = useCallback(async (path: 'finalize' | 'signOut'): Promise<boolean> => {
    if (!caseData) return false;
    const confirm = confirmWarnings;
    const outcome = await runSignOutReviewGates(caseData, {
      staleOrganMapFigures: findStaleOrganMapFigures, mohsBlockGaps: findMohsBlockGaps, derivedMarginConflicts: findDerivedMarginConflicts,
      synopticEntryChecks: c => findSynopticEntryChecks(c), invasiveMarginGaps: findInvasiveMarginGaps, molecularDifferences: findMolecularResultDifferencesLive,
      ...(confirm ? { confirm: {
        entryTotals: w => confirm(totalWarningsMessage(t, w)),
        invasiveMargins: g => confirm(invasiveMarginGapsMessage(t, i18n.language, g)),
        molecular: d => confirm(molecularDifferencesMessage(t, d)),
      } } : {}),
      microscopicBlocking: c => findMicroscopicBlockingSpecimens(c, getTemplate),
      criticalAcknowledged: acknowledgedCritical,
      detectFindings: fetchCriticalFindings, unacceptedNarrative: () => unacceptedAiNarrativeSections(orchSections),
      rememberCriticalFindings: found => saveCriticalFindings(caseData.id, found),
      synopticFieldProblems: async () => {
        const panel = synopticPanelRef.current;
        const live = panel ? { instanceId: activeReportInstanceId, missing: panel.validateRequired(), unverifiedAi: panel.getBlockingUnverifiedFields() } : undefined;
        // The panel saves AI verification straight to the store, so the stored copy is the current one.
        const fresh = await Promise.resolve().then(() => caseRouter.getCase(caseData.id)).catch(() => undefined);
        const storedSuggestions = Object.fromEntries((fresh?.synopticReports ?? []).map(r => [r.instanceId, r.aiSuggestions]));
        return findSynopticSignOutFieldProblems(caseData, { scope: path === 'signOut' ? 'case' : 'active', activeInstanceId: activeReportInstanceId, live, storedSuggestions, loadTemplate: getTemplate });
      },
    });
    if (outcome.ok) { recordAiOmittedAtSignOut(auditService, caseData.id, [...(caseData.synopticReports ?? []), ...(caseData.grossingReports ?? [])] as never, signingUser?.name ?? ''); return true; } // Batches 691, 692
    const s = outcome.stop;
    switch (s.gate) {
      case 'pendingRelease': showToast(t('useSignOutWorkflow.toast.alreadyPendingRelease'), 'warning'); break;
      case 'caseHold': showToast(t('useSignOutWorkflow.toast.caseOnHold', { note: s.note }), 'warning'); break;
      case 'staleOrganMap': showToast(t('organMap.panel.signOutStale'), 'warning'); break;
      case 'mohsBlocks': showToast(t('organMap.mohs.signOutBlocks'), 'warning'); break;
      case 'derivedMargins': showToast(t('organMap.derived.signOutMismatch'), 'warning'); break;
      case 'entryCount': showToast(t('synopticChecks.signOutBlocked', { problem: countBlockMessage(t, s.block) }), 'warning'); break;
      case 'microscopic': {
        const first = s.blocking[0];
        const reason = t(first.reasonKey);
        showToast(s.blocking.length === 1
          ? t('useSignOutWorkflow.toast.specimenBlocking', { label: first.specimenLabel, reason })
          : t('useSignOutWorkflow.toast.specimensNeedAttention', { count: s.blocking.length, label: first.specimenLabel, reason }), 'warning');
        setActiveSpecimenId(first.specimenId);
        setActiveReportType('microscopic');
        break;
      }
      case 'criticalFindings': setCriticalFindings(s.findings); setShowCriticalFindingsModal(true); break;
      case 'requiredFields': setMissingFields(s.missing); setShowMissingWarning(true); break;
      case 'unverifiedAi':
        // An unconfirmed AI value on a required field never signs out, whatever its confidence.
        showToast(s.fields.length === 1
          ? t('useSignOutWorkflow.toast.aiSuggestionNeedsReview', { label: s.fields[0].fieldLabel })
          : t('useSignOutWorkflow.toast.aiSuggestionsNeedReview', { count: s.fields.length, label: s.fields[0].fieldLabel }), 'warning');
        if (isOrchestrationMode) safeSetLeftTab('draft');
        setAlertFieldId(s.fields[0].fieldId);
        break;
      case 'unacceptedAiNarrative': showToast(t('useSignOutWorkflow.toast.aiNarrativeNeedsAcceptance', { count: s.sections.length, label: s.sections[0].label }), 'warning'); if (isOrchestrationMode) safeSetLeftTab('draft'); break;
      default: break;
    }
    return false;
  }, [caseData, confirmWarnings, orchSections, t, i18n.language, acknowledgedCritical, fetchCriticalFindings, synopticPanelRef, activeReportInstanceId, showToast, setActiveSpecimenId, setActiveReportType, isOrchestrationMode, safeSetLeftTab, setAlertFieldId]);

  const handleSignOutConfirm = useCallback(async (confirmation?: SignatureConfirmation) => {
    // Batch 649: the same review checks as Assist Finalize, first (recall window, hold, report content,
    // microscopic documentation, critical findings, required fields, unverified AI answers).
    if (!(await runReviewGates('signOut'))) { setShowSignOutModal(false); return; }

    // Batch 345: nothing is signed without a checked signature. The
    // modal's confirmation is verified here (the check the API server
    // will make); a resume after a gate reuses the one already accepted
    // for this case (services/auth/signatureEvidence.ts).
    if (caseData?.id) {
      const accepted = await signatureGate.accept(confirmation, {
        caseId: caseData.id, caseRef: signingCaseRef, actions: ['case-sign-out', 'countersign'],
      });
      if (accepted.ok === false) {
        showToast(t(`signatureEvidence.refused.${accepted.reason}`), 'warning');
        return;
      }
    }

    // PS-327: resolved once and reused by the countersign gate and canFinalizeCase().
    const { participationTypes: authorityParticipationTypes, performingLabFacilityId: authorityLabId, jurisdiction: authorityJurisdiction } =
      await resolveFinalizeAuthorityContext(caseData);
    const countersignRequiredTypeIds = resolveCountersignRequiredTypeIds(authorityParticipationTypes, authorityLabId, authorityJurisdiction);

    // Batch 607 (#161, #182): a system the jurisdiction's code-system policy requires, with no code on the case, asks first.
    // Proceeding is an override and is audited (system names only). With no way to ask, sign-out stops.
    {
      const codePolicy = await codeSystemPolicyService.policyFor(authorityJurisdiction ?? getCurrentJurisdiction());
      const codeCheck = signOutCodeCheck(collectCaseEntries(caseData ?? {}), codePolicy, isoDayOf(new Date()));
      if (!codeCheck.ok) {
        const systems = codeCheck.missing.join(', ');
        if (!(confirmWarnings && await confirmWarnings(t('codePolicy.signOutMissing', { systems })))) {
          showToast(t('codePolicy.signOutBlocked', { systems }), 'warning');
          setShowSignOutModal(false);
          return;
        }
        if (caseData?.id) await auditService.logEvent(codeSignOutOverrideAudit(caseData.id, signingUser?.name ?? '', codeCheck.missing));
      }
    }

    // Resident / configured-type / FPPE countersign routing (resolveResidentCountersignRequired):
    // the trainee's sign-out releases the case for review instead of finalizing it. FPPE
    // provisional hires are reviewed by their active assignment's supervisor.
    if (caseData?.id) {
      const isAttendingToo = caseData?.participants?.some(
        (p: CaseParticipant) => p.status === 'active' && p.staffId === signingUser?.id && p.participationTypeIds?.includes('attending')
      );
      const provisionalParticipant = caseData?.participants?.find(
        (p: CaseParticipant) => p.status === 'active' && p.staffId === signingUser?.id && p.participationTypeIds?.includes('provisional_hire')
      );
      // PS-114 Stage 4 / Batch 515: read from qaSupervisionAssignmentService.
      const activeFppeAssignment = provisionalParticipant && !isAttendingToo
        ? await qaSupervisionAssignmentService.getActiveAssignmentForUser(FPPE_ACTIVITY_TYPE_ID, signingUser?.id ?? '', caseData?.subspecialtyId).then(r => r.ok ? r.data : null).catch(() => null)
        : null;

      const countersignCheck = resolveResidentCountersignRequired({
        participants: caseData?.participants,
        signingUserId: signingUser?.id ?? '',
        hasActiveFppeAssignment: !!activeFppeAssignment,
        countersignRequiredTypeIds,
      });

      if (countersignCheck.required) {
        const createdBy = { userId: signingUser?.id ?? 'unknown', userName: signingUser?.name ?? 'Unknown User' };
        // Batch 649: status first, then the immutable submitted version (no instanceId, so no ORU),
        // the answers snapshot and the resident's signature linked to that version.
        const released = await commitCountersignRelease(caseData, {
          update: async patch => {
            await caseRouter.updateCase(caseData.id, patch, knownVersionRef.current);
            knownVersionRef.current = knownVersionRef.current + 1;
            setCaseData(prev => prev ? ({ ...prev, ...patch }) : prev);
          },
          createVersion: async () => {
            const existing = await reportVersionService.getByCaseId(caseData.id);
            const { pdfBase64, generationError } = await generateReportPdfSnapshot();
            if (generationError) showToast(t('useSignOutWorkflow.toast.submittedCountersignPdfFailed', { error: generationError }), 'warning');
            return reportVersionService.create({ caseId: caseData.id, mode: 'orchestration', trigger: (existing.ok ? existing.data.length : 0) === 0 ? 'initial_signout' : 'amendment', createdBy, pdfBase64, generationError });
          },
          releaseForCountersign: () => countersignService.release({
            caseId: caseData.id, subspecialtyId: caseData?.subspecialtyId, residentId: createdBy.userId, residentName: createdBy.userName,
            releasedAnswersSnapshot: answersByInstance(caseData),
          }),
          commitSignature: link => signatureGate.commit(caseData.id, 'released_for_countersign', link),
        });
        setShowSignOutModal(false);
        if (released.ok === false) {
          if (handleConcurrencyConflict(released.error, setConcurrencyConflict, { blockOverride: true })) return;
          console.error('[useSignOutWorkflow] Release for countersign stopped:', released.error);
          showToast(t(released.compensated ? 'useSignOutWorkflow.toast.signOutNotCompleted' : 'useSignOutWorkflow.toast.signOutNotCompletedStatusKept'), 'warning');
          return;
        }

        // The reviewer is told (fire-and-forget): the FPPE supervisor, or the case's attending.
        const attendingParticipant = caseData?.participants?.find(
          (p: CaseParticipant) => p.status === 'active' && p.participationTypeIds?.includes('attending')
        );
        const reviewerId = activeFppeAssignment?.supervisorUserId ?? attendingParticipant?.staffId;
        if (reviewerId) {
          const attendingUserRes = await userService.getById(reviewerId).catch(() => null);
          const attendingEmail = attendingUserRes?.ok ? attendingUserRes.data?.email : undefined;
          if (attendingEmail) {
            sendEmail({
              to: [attendingEmail],
              subject: `Case ${caseData.id} ready for your countersign`,
              bodyText: `${signingUser?.name ?? 'A resident'} has released case ${caseData.id} for your review and countersign.`,
              bodyHtml: `<p>${signingUser?.name ?? 'A resident'} has released case <strong>${caseData.id}</strong> for your review and countersign.</p>`,
              metadata: { caseId: caseData.id, action: 'countersign_requested' },
            }).catch(() => {});
          }
        }

        showToast(t('useSignOutWorkflow.toast.caseReleasedForCountersign', { caseId: caseData.id }), 'info', { containsPhi: true });
        return; // does not proceed to reconciliation check or any finalize logic below
      }
    }

    // Write guard (case relationship): only the primary/attending (or an
    // administrative role) past the countersign routing may finalize.
    const signOutFinalizeDecision = await authorizeSurgicalSignOut(caseData, canFinalizeCase(getSessionUser(), caseData?.participants, authorityParticipationTypes, authorityLabId, authorityJurisdiction));
    if (!signOutFinalizeDecision.granted) {
      showToast(signOutFinalizeDecision.reason, 'warning');
      setShowSignOutModal(false);
      return;
    }

    // "Path B": the same hard-block gates finalizeCase() enforces, each with its own
    // resolution modal; resolving it resumes this function (pendingActionIsSignOut).
    if (caseData) {
      const parkFor = (open: () => void) => { open(); setPendingActionIsSignOut(true); setShowSignOutModal(false); };
      const { preAnalyticBlocking, fixativeBlocking } = checkPreAnalyticAndFixativeGates(caseData, specimenDictionary);
      if (preAnalyticBlocking.length > 0) { parkFor(() => setPreAnalyticDateGateSpecimens(preAnalyticBlocking)); return; }
      if (fixativeBlocking.length > 0) { parkFor(() => setFixativeGateSpecimens(fixativeBlocking)); return; }
      // PS-289/PS-292: stain QC after the more foundational gates; Batch 484: inking Gate B after that.
      const stainQcBlocking = await checkStainQcGate(caseData);
      if (stainQcBlocking.length > 0) { parkFor(() => setStainQcGateBlocking(stainQcBlocking)); return; }
      const inkingGate = await checkInkingSignOutGate(caseData, signingUser?.role ? [signingUser.role] : []);
      if (inkingGate) { parkFor(() => setInkingGateBlocking(inkingGate)); return; }
      // Batch 439 (PS-145, PS-144): a clinical-pathologic mismatch to decide, then the peer-review gate.
      const mismatch = await checkClinicalMismatch(caseData);
      if (mismatch) { parkFor(() => setClinicalMismatch(mismatch)); return; }
      const peerGate = await checkPeerReviewGate(caseData);
      if (peerGate) { parkFor(() => setPeerReviewGate(peerGate)); return; }
    }

    // Frozen-to-permanent reconciliation (category match, no AI: services/quality/frozenReconciliationPlan.ts).
    // Every non-deferred frozen specimen is reconciled in turn; finalizeSignOut() hands out the next one.
    if (caseData?.id) {
      const concordanceSettingsRes = await concordanceReviewSettingsService.resolveEffectiveConfigForFacility(caseData.originHospitalId, signingUser?.id).catch(() => null);
      const concordanceSettings = concordanceSettingsRes?.ok ? concordanceSettingsRes.data : { aiComparisonEnabled: true, reviewScreenEnabled: true };
      const sessions = concordanceSettings.aiComparisonEnabled ? await intraoperativeService.getAll() : null;
      reconciliationQueue.current.load(sessions?.ok ? planFrozenReconciliation(caseData.id, sessions.data, concordanceSettings) : []);
    }
    await finalizeSignOut();
  }, [caseData, runReviewGates, finalizeSignOut, signingUser, showToast, setShowSignOutModal, knownVersionRef, setConcurrencyConflict, setCaseData, setPendingReconciliation, t, confirmWarnings, generateReportPdfSnapshot, setClinicalMismatch, setFixativeGateSpecimens, setInkingGateBlocking, setPeerReviewGate, setPendingActionIsSignOut, setPreAnalyticDateGateSpecimens, setStainQcGateBlocking, signingCaseRef, specimenDictionary]);

  // PS-137: records the pathologist's decision on this session's flagged
  // findings as agreement signals, tagged with the covering Validation
  // Study. Orchestration only; the decisions live in
  // services/abnormalDetection/recordAbnormalDetectionOutcomes.ts.
  const captureAbnormalDetectionOutcomes = useCallback((outcome: AbnormalDetectionOutcome) => {
    if (criticalFindings.length === 0) return;
    const input = {
      caseId: caseData?.id ?? 'unknown',
      findings: criticalFindings,
      outcome,
      scope: {
        clientId: caseData?.order?.facilityId ?? '',
        pathologistId: signingUser?.id ?? '',
        subspecialtyId: caseData?.subspecialtyId,
      },
    };
    import('@/services')
      .then(({ validationStudyService }) =>
        recordAbnormalDetectionOutcomes(input, { signalService: abnormalDetectionSignalService, studyService: validationStudyService }))
      .catch(e => console.error('[AbnormalDetection] Could not record agreement signals:', e));
  }, [caseData, criticalFindings, signingUser]);

  /** Real, per direct guidance - the pathologist has reviewed the real,
   *  detected finding(s) and chosen to record a real notification.
   *  Requires every real field ICriticalResultNotificationService
   *  itself requires - never partially recorded. Dismisses the modal
   *  and marks this session's findings acknowledged either way, same
   *  as handleAcknowledgeCriticalFindings below, since a pathologist
   *  who's actually recorded the call has just as genuinely dealt
   *  with the finding as one who explicitly acknowledged it. */
  const handleRecordCriticalNotification = useCallback(async (input: {
    clinicianName: string;
    method: NotificationMethod; // Batch 511: the modal offers all five methods, including secure email and fax
    readBackConfirmed?: boolean;
    /** Real, per direct guidance: defaults to the signed-in user in
     *  the modal itself, but genuinely editable — a representative may
     *  have made the real call, with staff simply transcribing the
     *  event afterward. userId below always stays the real,
     *  verifiable, currently-signed-in user (who actually entered this
     *  record) — this is the separate, human-readable name of whoever
     *  actually performed the real notification, which the same
     *  person or a different one. */
    notifiedByName: string;
  }) => {
    if (!caseData?.id) return;
    const findingSummary = criticalFindings.map(f => f.term).join(', ') || 'Critical finding detected at sign-out';
    await criticalResultNotificationService.recordNotification({
      caseId: caseData.id,
      trigger: 'critical_value',
      findingSummary,
      clinicianName: input.clinicianName,
      method: input.method,
      readBackConfirmed: input.readBackConfirmed,
      notifiedBy: { userId: signingUser?.id ?? 'unknown', userName: input.notifiedByName },
    });

    // Real, per direct guidance (PS-105): this is the actual, real
    // pathologist confirmation — set the case's own real,
    // WorklistTable.tsx-visible status here, to the single
    // highest-severity finding among everything shown in this modal.
    // Never set from an unconfirmed suggestion alone (handleAcknowledgeCriticalFindings
    // below deliberately does NOT set this).
    const severityRank: Record<'Abnormal' | 'Critical' | 'Malignant', number> = { Abnormal: 1, Critical: 2, Malignant: 3 };
    const highest = criticalFindings.reduce<'Abnormal' | 'Critical' | 'Malignant' | null>((best, f) => {
      if (!best) return f.severity;
      return severityRank[f.severity] > severityRank[best] ? f.severity : best;
    }, null);
    if (highest) {
      // PS-130: a matched rule's own code(s) (real ones while the customer's licence is on, else test
      // codes) win over the severity default, which an AI-narrative finding falls back to.
      const perRuleMatch = criticalFindings.find(f => f.severity === highest && f.syntheticCoding && f.syntheticCoding.length > 0);
      const patch = {
        abnormalDetectionStatus: { severity: highest, confirmedAt: new Date().toISOString() },
        syntheticAbnormalCoding: perRuleMatch?.syntheticCoding ?? resolveSyntheticCoding(highest),
      };
      try {
        const expected = knownVersionRef.current;
        await caseRouter.updateCase(caseData.id, patch, expected);
        // Batch 572: this save is the page's own, so it moves the known version on (no "someone else saved" notice,
        // and the next save isn't refused against the version this one replaced).
        knownVersionRef.current = Math.max(knownVersionRef.current, expected + 1);
        setCaseData(prev => prev ? ({ ...prev, ...patch } as typeof prev) : prev);
      } catch (e) {
        console.error('[AbnormalDetection] Could not persist confirmed abnormal status:', e);
      }

      // Real, per direct correction (PS-134 follow-up: "when would a
      // CAPA be needed?"): this records a real, genuine audit-trail
      // entry for the pathologist's own confirmation — outcome:
      // 'concordant', since a primary pathologist confirming their
      // OWN finding is not a discrepancy of any kind, and severity is
      // deliberately omitted (QaActivityRecord's own contract: only
      // meaningful when outcome === 'discordant' — a concordant
      // record has nothing to grade). This activity type deliberately
      // carries NO capaTriggerRule — an earlier version of this code
      // incorrectly fired a CAPA on every confirmed Critical/
      // Malignant finding, which would flood a real CAPA queue with
      // hundreds of records for correct, unremarkable diagnoses in
      // any department that reads cancer routinely. The real CAPA
      // triggers per direct guidance are three, specific, genuinely
      // different signals — none of which are "a primary read was
      // confirmed" — see mockQaActivityTypeService.ts's own, fuller
      // comment on this activity type for the complete account of
      // what's real vs. still-needed for each. Fire-and-forget, same
      // real posture as the PS-137 signal capture immediately below —
      // never blocks the actual sign-out action.
      const highestFinding = criticalFindings.find(f => f.severity === highest);

      // Real, per direct guidance (PS-136): automated dispatch,
      // additive to the mandatory human verbal-notification recorded
      // above — fires on whichever real channels the ordering
      // physician's own contact record actually supports. Fire-and-
      // forget, same posture as the QA-activity/agreement-signal
      // captures immediately below — never blocks the actual sign-out
      // action, and a real dispatch failure here must never prevent
      // the human notification already recorded from standing.
      dispatchCriticalAlerts({
        caseId: caseData.id,
        accessionNumber: caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? '',
        orderingPhysicianId: caseData.order?.orderingPhysicianId,
        findingTerm: highestFinding?.term ?? highest,
        findingSeverity: highest,
        sourceQuote: highestFinding?.sourceQuote ?? '',
        confirmedAt: patch.abnormalDetectionStatus.confirmedAt,
      }).then(res => {
        // Batch 604: tell the person what happened on each channel, and that it was simulated.
        const stubbed = res.ok && res.data ? res.data.channels.filter(c => c.method === 'stub').length : 0;
        if (stubbed > 0) showToast(t('criticalAlertsAudit.signOutToast', { count: stubbed }), 'warning');
      }).catch(e => console.error('[AbnormalDetection] Could not dispatch automated critical alert:', e));

      qaActivityRecordService.create({
        activityTypeId: ABNORMAL_FINDING_CONFIRMATION_ACTIVITY_TYPE_ID,
        caseId: caseData.id,
        caseType: caseData.specimens?.[0]?.description || caseData.id,
        fieldValues: {
          findingTerm: highestFinding?.term ?? highest,
          findingSource: highestFinding?.sourceQuote ?? '',
        },
        outcome: 'concordant',
        recordedBy: { userId: signingUser?.id ?? 'unknown', userName: signingUser?.name ?? 'Unknown User' },
      }).catch(e => console.error('[AbnormalDetection] Could not record QA activity for this confirmed finding:', e));
    }

    // PS-105/PS-137 agreement tracking ("How often was their agreement...
    // an opportunity to feed that information back for learning"): one
    // 'confirmed' signal per finding shown, tagged with the Validation Study
    // covering the case. Fire-and-forget, never blocks sign-out. Mapping,
    // de-identification and study resolution:
    // services/abnormalDetection/recordAbnormalDetectionOutcomes.ts.
    captureAbnormalDetectionOutcomes('confirmed');

    setAcknowledgedCritical(true);
    setShowCriticalFindingsModal(false);
  }, [caseData, criticalFindings, signingUser, setCaseData, knownVersionRef, captureAbnormalDetectionOutcomes]);

  /** Real, per direct guidance - a soft block, not a hard one: the
   *  detection here is an LLM-based heuristic that can be wrong, and
   *  the finding may already have been communicated through a real
   *  means this feature doesn't capture. Acknowledging dismisses the
   *  modal without recording anything - a real, honest choice, not a
   *  forced action. */
  const handleAcknowledgeCriticalFindings = useCallback(() => {
    // Same agreement capture as handleRecordCriticalNotification, with a
    // 'dismissed' outcome. Deliberately does NOT set
    // Case.abnormalDetectionStatus (see that field's own doc comment,
    // types/case/Case.ts): this is a signal for learning, not a confirmed
    // clinical status.
    captureAbnormalDetectionOutcomes('dismissed');
    setAcknowledgedCritical(true);
    setShowCriticalFindingsModal(false);
  }, [captureAbnormalDetectionOutcomes]);

  // ── Real finalization logic — shared by both finalize entry points ────────
  // Previously: handlePreFinalConfirm only console.log'd and closed the
  // modal — no status change, no persistence, no audit event. The OTHER
  // finalize path (handleFinalizeConfirm, reached via the AI Review →
  // FinalizeModal route when uncertain fields exist) had real logic
  // (signal capture) but ALSO never actually
  // set status: 'finalized' or persisted anything via caseRouter.updateCase.
  // Both paths must finalize identically — this is the one real
  // implementation both call.
  const finalizeCase = useCallback(async (
    excludedInstanceIds: string[] = []
  ): Promise<boolean> => {
    if (!caseData) return false;

    // Batch 345: finalising is a signature. It needs a confirmation
    // already accepted for this case (handlePreFinalConfirm /
    // handleFinalizeConfirm), which a gate resume reuses.
    const heldSignature = await signatureGate.accept(undefined, {
      caseId: caseData.id, caseRef: signingCaseRef, actions: ['report-finalize', 'synoptic-finalize'],
    });
    if (heldSignature.ok === false) {
      showToast(t(`signatureEvidence.refused.${heldSignature.reason}`), 'warning');
      return false;
    }

    // ── Real write guard (dimension 4 — case relationship). Found via
    // direct investigation: any user who could VIEW this case (passes
    // the tenant/pool checks in caseAccessControl.ts) could also
    // finalize/sign it out, with zero check that they have any actual
    // relationship to this specific case — no participant record
    // required at all. Only the assigned Primary/Attending, or an
    // administrative role, may finalize. Checked first, before the
    // fixative-time gate below — there's no reason to walk someone
    // through resolving a data-completeness gate for a case they were
    // never going to be allowed to sign out anyway.
    const { participationTypes: finalizeParticipationTypes, performingLabFacilityId: finalizeLabId, jurisdiction: finalizeJurisdiction } =
      await resolveFinalizeAuthorityContext(caseData);
    const finalizeDecision = await authorizeSurgicalSignOut(caseData, canFinalizeCase(getSessionUser(), caseData?.participants, finalizeParticipationTypes, finalizeLabId, finalizeJurisdiction));
    if (!finalizeDecision.granted) {
      showToast(finalizeDecision.reason, 'warning');
      return false;
    }

    // Batch 461: the report's map image must match the synoptic answers being signed.
    if ((await findStaleOrganMapFigures(caseData)).length > 0) {
      showToast(t('organMap.panel.signOutStale'), 'warning');
      return false;
    }
    // Batch 463b: every positive Mohs sector names the block it was cut in.
    if ((await findMohsBlockGaps(caseData)).length > 0) {
      showToast(t('organMap.mohs.signOutBlocks'), 'warning');
      return false;
    }
    // Batch 466b: the template's generic margin questions agree with the map.
    if ((await findDerivedMarginConflicts(caseData)).length > 0) {
      showToast(t('organMap.derived.signOutMismatch'), 'warning');
      return false;
    }
    // Batch 465b: no grid count above its limit (checked again here; the warning was asked up front).
    {
      const checks = await findSynopticEntryChecks(caseData);
      if (checks.blocking.length) { showToast(t('synopticChecks.signOutBlocked', { problem: countBlockMessage(t, checks.blocking[0]) }), 'warning'); return false; }
    }

    // ── Pre-analytic date gate — hard block, per direct guidance's own
    // cross-jurisdiction compliance research (UKAS ISO 15189 Clause 7.2,
    // CAP/CLIA § 493.1241, RCPath, EU IVDR/ISO 15189, IANZ AS ISO
    // 15189:2022, KAZA/KSP/KSLM, NATA/NPAAC — every real jurisdiction
    // this app targets is a hard block here, never merely advisory; see
    // resolvePreAnalyticDateGateConfig.ts for the full per-country
    // citation/label/disclaimer). Checked BEFORE the fixation-time gate
    // below — basic accession date/time is more foundational than
    // biomarker-specific fixation timing. Both real gates now shared
    // with handleSignOutConfirm() below, via checkPreAnalyticAndFixativeGates()
    // — see that function's own header comment for why.
    const { preAnalyticBlocking, fixativeBlocking } = checkPreAnalyticAndFixativeGates(caseData, specimenDictionary);

    if (preAnalyticBlocking.length > 0) {
      setPreAnalyticDateGateSpecimens(preAnalyticBlocking);
      setPendingFinalizeArgs(excludedInstanceIds);
      setPendingActionIsSignOut(false);
      return false; // abort — do not finalize until the gate is resolved
    }

    // ── Fixation-time gate — hard block, per the design decision this was
    // built from. A specimen whose matched Specimen Dictionary entry has
    // requireFixativeTimeBeforeSignout (breast/biomarker-relevant types)
    // needs processing.processedAt documented before this case can sign
    // out. No preliminary-report escape valve exists yet — the
    // FixativeTimeGateModal is the entire interim safety valve until it
    // does, offering three legitimate resolutions (documented, estimated,
    // or confirmed unrecoverable) rather than either silently blocking
    // forever or silently allowing incomplete biomarker-relevant data
    // through.
    if (fixativeBlocking.length > 0) {
      setFixativeGateSpecimens(fixativeBlocking);
      setPendingFinalizeArgs(excludedInstanceIds);
      setPendingActionIsSignOut(false);
      return false; // abort — do not finalize until the gate is resolved
    }

    // Real, per PS-289/PS-292's own Gating Strategy — same real
    // ordering principle as the sibling call site above (checked
    // after the two more foundational gates).
    const stainQcBlockingFinalize = await checkStainQcGate(caseData);
    if (stainQcBlockingFinalize.length > 0) {
      setStainQcGateBlocking(stainQcBlockingFinalize);
      setPendingFinalizeArgs(excludedInstanceIds);
      setPendingActionIsSignOut(false);
      return false; // abort — do not finalize until the gate is resolved
    }

    // Batch 484: Gate B, same real check as the sibling call site above.
    const inkingGateFinalize = await checkInkingSignOutGate(caseData, signingUser?.role ? [signingUser.role] : []);
    if (inkingGateFinalize) {
      setInkingGateBlocking(inkingGateFinalize);
      setPendingFinalizeArgs(excludedInstanceIds);
      setPendingActionIsSignOut(false);
      return false;
    }

    // Batch 439 (PS-145, PS-144): same two checks as the sibling call site.
    const mismatchFinalize = await checkClinicalMismatch(caseData);
    if (mismatchFinalize) {
      setClinicalMismatch(mismatchFinalize);
      setPendingFinalizeArgs(excludedInstanceIds);
      setPendingActionIsSignOut(false);
      return false;
    }
    const peerGateFinalize = await checkPeerReviewGate(caseData);
    if (peerGateFinalize) {
      setPeerReviewGate(peerGateFinalize);
      setPendingFinalizeArgs(excludedInstanceIds);
      setPendingActionIsSignOut(false);
      return false;
    }

    const finalizedAt = new Date().toISOString();

    // Real feature, per direct specification: Post-Sign-Out Release
    // Buffer. Decision only, from the real, shared service — see
    // IReportReleaseService.ts's own doc comment on why this function
    // computes the buffer fields inline in its own, single patch below
    // rather than calling reportReleaseService.startBuffer() as a
    // second, separate write. Now async as of Phase 2 — real
    // Enterprise/Facility config resolution needs a real, async
    // facility lookup.
    const bufferResolution = await reportReleaseService.resolveBufferForCase(caseData);

    try {
      // CaseRouter.updateCase is deliberately Promise<void> — it writes to
      // the owning service and logs an independent audit event per source
      // system, by design (see CaseRouter's class doc comment). It never
      // returns the updated record. Since we already have everything we
      // just sent, merge it locally rather than waiting on a return value
      // that was never going to arrive.
      const patch = {
        // Real feature: a genuine buffer holds the case at
        // 'pending-release' rather than 'finalized' — finalizedAt is
        // still stamped now regardless (see CaseStatus's own
        // 'pending-release' doc comment for why TAT/SLA calculations
        // must never silently shift by the buffer duration). releasedAt
        // — the real, buffer-aware "genuinely final" moment — is set
        // immediately only when no buffer applies; otherwise real
        // release comes later, via checkAndReleaseIfExpired().
        status: (bufferResolution.applies ? 'pending-release' : 'finalized') as CaseStatus,
        finalizedAt,
        finalizedBy: signingUser?.id ?? null,
        releasedAt: bufferResolution.applies ? undefined : finalizedAt,
        releaseBufferExpiresAt: bufferResolution.applies
          ? new Date(Date.now() + bufferResolution.durationMinutes * 60_000).toISOString()
          : undefined,
        releaseBufferDurationMinutes: bufferResolution.applies ? bufferResolution.durationMinutes : undefined,
        preReleaseBufferStatus: bufferResolution.applies ? caseData.status : undefined,
        // Batch 426: an Assist case's finalized workups are what goes to the LIS
        // (services/reports/assistFinalize.ts). Excluded ones stay drafts.
        ...(caseData.reportingMode === 'assist' ? { synopticReports: finalizedAssistWorkups(caseData.synopticReports, excludedInstanceIds) } : {}),
      };

      await caseRouter.updateCase(caseData.id, patch, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;

      const updated = { ...caseData, ...patch } as typeof caseData;
      setCaseData(updated);
      // Batch 534: released when the buffer ends even if nobody has this page open.
      if (bufferResolution.applies) trackSignOutBufferLazy(caseData.id, patch.releaseBufferExpiresAt!, signingUser, caseData.order?.facilityId);

      // Batch 426: no release buffer, so the Assist case is released now: its workups go to the LIS
      // (publishReportReleasedEvent → dispatchAssistSynopticResult). With a buffer, its expiry does this.
      if (caseData.reportingMode === 'assist' && !bufferResolution.applies) {
        publishReportReleasedEvent({
          caseId: caseData.id, reportType: 'FINAL', releasedAt: finalizedAt,
          releasedBy: signingUser?.id ? { id: signingUser.id, name: signingUser.name ?? signingUser.id } : undefined,
          performingFacilityId: caseData.order?.facilityId,
        }).catch(e => console.error('[useSignOutWorkflow] Non-blocking failure sending the Assist workups to the LIS:', e));
      }

      log('case_finalized', {
        caseId: caseData.id,
        accession: caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber,
        finalizedBy: signingUser?.id ?? 'unknown',
        excludedCount: excludedInstanceIds.length,
      });
      if (bufferResolution.applies) {
        log('sign_out_buffered', {
          caseId: caseData.id,
          accession: caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber,
          durationMinutes: bufferResolution.durationMinutes,
          facilityId: caseData.originHospitalId,
        });
      }

      showToast(bufferResolution.applies
        ? t('useSignOutWorkflow.toast.reportSignedReleaseIn', { minutes: bufferResolution.durationMinutes })
        : t('useSignOutWorkflow.toast.reportFinalized'));

      // Real, per direct guidance: the actual detection + raising step
      // for Trigger A/Trigger B, run here (inside the one, real, shared
      // finalize implementation) rather than in either outer caller -
      // a real, previously-shipped bug had this logic only in
      // handleFinalizeConfirm's own wrapper, meaning
      // handlePreFinalConfirm (the actual PRIMARY finalize path, per
      // this function's own header comment) never triggered it at
      // all. Fire-and-forget, deliberately never awaited - a failure
      // here must never surface as a sign-out failure.
      (async () => {
        const findings = await fetchBillingDeficiencyFindings();
        if (findings.length === 0) return;
        await Promise.all(findings.map(f => billingDeficiencyService.raise({
          caseId: caseData.id,
          chargeRecordId: f.chargeRecordId,
          deficiencyType: f.deficiencyType,
          severity: BILLING_DEFICIENCY_SEVERITY[f.deficiencyType],
          raisedByTrigger: f.deficiencyType === 'NCCI_BUNDLING_VIOLATION' ? 'AUTO_NCCI_CHECK' : 'AUTO_CROSSWALK_CHECK',
          auditorNotes: f.auditorNotes,
          createdBy: 'system',
        })));
        showToast(t('useSignOutWorkflow.toast.billingItemsFlaggedQa', { count: findings.length }), 'warning');
      })().catch(e => console.error('[PathScribe] Billing deficiency raise failed (non-blocking):', e));

      // Real, per direct guidance's own Code Review Pool design - the
      // random-sampling half (the manual-flagging half already exists
      // via the Request Colleague Review modal). Deliberately its own,
      // independent fire-and-forget block, same reasoning as every
      // other real block here - a failure must never affect sign-out
      // or any other real, independent post-finalize action. No toast
      // for a random selection - per direct confirmation, a random
      // compliance pull isn't actionable by the originating
      // pathologist, so it stays silent to them (unlike the manual
      // flagging path, which is a deliberate, visible action someone
      // just took).
      (async () => {
        if (!caseData.originHospitalId) return;
        const orderingRes = await facilityService.getById(caseData.originHospitalId);
        if (!orderingRes.ok) return;
        const labId = resolvePerformingLabFacilityId(orderingRes.data);
        if (!labId) return;
        const labRes = labId === caseData.originHospitalId ? orderingRes : await facilityService.getById(labId);
        if (!labRes.ok) return;
        if (!shouldRandomlySampleForCodeReview(labRes.data.codeReviewSamplingRatePercent)) return;
        await codeReviewPoolService.create({
          caseId: caseData.id,
          caseLabel: caseData.patient ? `${caseData.patient.lastName}, ${caseData.patient.firstName}` : undefined,
          source: 'RANDOM_SAMPLE',
          performingLabFacilityId: labId,
        });
        // Real, per direct guidance's own follow-up on the broader
        // provenance & auditability sweep: the pool entry itself is a
        // real, persisted record, but every other similar
        // routing/flagging event this app builds also gets a separate,
        // case-searchable audit log entry - this one didn't. Silent
        // to the pathologist (no toast, per direct confirmation
        // above) is a UI decision, not a reason to leave the case's
        // own audit history blank about a real, significant event
        // that happened to it.
        log('code_review_random_sample', {
          caseId: caseData.id,
          performingLabFacilityId: labId,
          samplingRatePercent: labRes.data.codeReviewSamplingRatePercent,
        });
      })().catch(e => console.error('[PathScribe] Random code review sampling failed (non-blocking):', e));

      // Real, per Epic: PathScribe Outbound Billing & Charge Event
      // Engine, User Story 2 - "hold 26 and Combined codes until
      // CASE_SIGNED_OUT." Deliberately its own, independent
      // fire-and-forget block, not merged with the billing-deficiency
      // one above - a failure in one must never affect the other.
      (async () => {
        const chargesRes = await serviceChargeService.getChargesForCase(caseData.id);
        if (!chargesRes.ok) return;
        const alreadyQueuedRes = await outboundChargeQueueService.getByServiceChargeRecordIds(
          chargesRes.data.map(c => c.id)
        );
        const alreadyQueuedIds = new Set(alreadyQueuedRes.ok ? alreadyQueuedRes.data.map(e => e.serviceChargeRecordId) : []);
        const triggerMapRes = await billingTypeTriggerConfigService.getEffectiveTriggerMap(caseData.order?.siteId);
        const toEnqueue = sweepChargesForOutbox(chargesRes.data, 'CASE_SIGNED_OUT', alreadyQueuedIds, triggerMapRes.ok ? triggerMapRes.data : undefined);
        const metadataFailures = validateChargeMetadata(caseData);
        await Promise.all(toEnqueue.map(async f => {
          const enqueueRes = await outboundChargeQueueService.enqueue({
            serviceChargeRecordId: f.serviceChargeRecordId,
            caseId: f.caseId,
            specimenId: f.specimenId,
            billingType: f.billingType,
            triggerEvent: 'CASE_SIGNED_OUT',
          });
          if (enqueueRes.ok && metadataFailures.length > 0) {
            await outboundChargeQueueService.markFailed(enqueueRes.data.id, {
              errorCode: metadataFailures[0].errorCode,
              errorMessage: metadataFailures[0].errorMessage,
              maxRetriesExceeded: false,
            });
          }
        }));
        // Batch 605: send what was queued (the simulated billing engine answers in the demo).
        await dispatchQueuedChargesForCase(caseData.id);
        await dispatchFinancialClass(caseData.id, 'system'); // Batch 605: the financial-class payload follows the charges
      })().catch(e => console.error('[PathScribe] Outbound charge queue sweep failed (non-blocking):', e));

      void destroyHistoryCacheAtSignOut(caseData.id); // Batch 605: the prior-report cache must not outlive the case
      // Batch 649: the signature is recorded by finalizeAndRelease, once the version exists (completeAssistFinalize).
      return true;
    } catch (err) {
      // The actual finalize action — the highest-stakes write in this
      // file. Strict, block-only treatment, same reasoning as every
      // other finalize-adjacent write: proceeding against a stale
      // version here risks finalizing over content the pathologist
      // never actually saw.
      if (handleConcurrencyConflict(err, setConcurrencyConflict, { blockOverride: true })) return false;
      console.error('[Finalise] Failed to persist finalization:', err);
      showToast(t('useSignOutWorkflow.toast.finalizationFailed'), 'warning');
      return false;
    }
  }, [caseData, signingUser, log, showToast, specimenDictionary, knownVersionRef, setCaseData, setConcurrencyConflict, setFixativeGateSpecimens, setStainQcGateBlocking, setPreAnalyticDateGateSpecimens, setPendingFinalizeArgs, fetchBillingDeficiencyFindings, t, setClinicalMismatch, setInkingGateBlocking, setPeerReviewGate, setPendingActionIsSignOut, signingCaseRef]);

  // Batch 649: Finalize (and every gate resume) ends here: finalize, release what waits, write the Assist version,
  // then record the signature linked to that version (services/surgicalSignOut/completeAssistFinalize.ts).
  const finalizeAndRelease = useCallback((excludedInstanceIds: string[] = []): Promise<boolean> => completeAssistFinalize({
    finalize: () => finalizeCase(excludedInstanceIds),
    release: onVersion => releasePendingAmendmentOrAddendum(onVersion),
    commitSignature: link => signatureGate.commit(caseData?.id ?? '', 'finalized', link),
  }), [finalizeCase, releasePendingAmendmentOrAddendum, caseData?.id]);

  // Real, per direct guidance ("alert the Pathologist with a warning
  // message, but not block") and per Trigger A's own real trigger
  // event ("Pathologist attempts electronic signature") - called from
  // handleRequestFinalize, the actual moment the pathologist clicks
  // Finalize, BEFORE PreFinalisationModal even opens. Read-only -
  // never raises a BillingDeficiencyRecord itself (that's a real,
  // durable audit event that should only happen once the case has
  // actually, successfully signed out - see finalizeCase's own
  // comment) - this is purely the real-time heads-up. Deliberately
  // never blocks: shows the toast, then lets the caller continue
  // straight on to PreFinalisationModal regardless of what it finds.
  const previewBillingWarnings = useCallback(async () => {
    const findings = await fetchBillingDeficiencyFindings();
    if (findings.length === 0) return;
    showToast(
      findings.length === 1
        ? t('useSignOutWorkflow.toast.billingNoteSingle', { note: findings[0].auditorNotes })
        : t('useSignOutWorkflow.toast.billingItemsFlaggedStartingWith', { count: findings.length, note: findings[0].auditorNotes })
    , 'warning');
  }, [fetchBillingDeficiencyFindings, showToast, t]);

  const handleRequestFinalize = useCallback(async (andNext: boolean) => {
    setFinalizeAndNextPending(andNext);
    // Batch 649: the review checks shared with Sign Out Case (runReviewGates above): an active
    // hold first, the report content, microscopic documentation, critical findings, required
    // fields and unverified AI answers. Without the synoptic panel open, the stored report is checked.
    if (!(await runReviewGates('finalize'))) return;
    // Trigger A's "pathologist attempts electronic signature" moment: a heads-up, never awaited or blocking.
    previewBillingWarnings().catch(e => console.error('[PathScribe] Billing warning preview failed (non-blocking):', e));
    setPreFinalSynoptics(await buildSynopticsForReview());
    setShowPreFinalise(true);
  }, [buildSynopticsForReview, runReviewGates, previewBillingWarnings]);

  const handlePreFinalConfirm = useCallback((_ordered: string[], _excluded: string[], confirmation?: SignatureConfirmation) => {
    setShowPreFinalise(false);
    // Credentials already verified inside PreFinalisationModal.
    // _ordered is the pathologist's final section/synoptic ordering choice
    // from the drag-to-reorder interaction — display order only, not
    // persisted here since it doesn't affect report content or status.
    //
    // The PRIMARY finalize path: finalize, then release a waiting amendment/addendum, in sequence (finalizeAndRelease).
    (async () => {
      // Batch 345: check the signature before anything is finalised.
      if (caseData?.id) {
        const accepted = await signatureGate.accept(confirmation, { caseId: caseData.id, caseRef: signingCaseRef, actions: ['report-finalize'] });
        if (accepted.ok === false) { showToast(t(`signatureEvidence.refused.${accepted.reason}`), 'warning'); return; }
      }
      await finalizeAndRelease(_excluded);
    })();
  }, [finalizeAndRelease, caseData?.id, signingCaseRef, showToast, t]);

  const handleFinalizeConfirm = useCallback((confirmation?: SignatureConfirmation) => {
    if (synopticPanelRef.current) {
      const { verificationSummary } = synopticPanelRef.current.sweepAndGetFinalState();
      console.info('[PathScribe] Finalization sweep:', verificationSummary);
    }
    setShowFinalizeModal(false);

    // ── Level 1 AI learning — capture narrative edit signals ──────────────────
    // Record the diff between AI-generated text and pathologist's final version
    // for each orchestration section. Stored for future few-shot / fine-tuning.
    if (isOrchestrationMode && orchSections.length > 0) {
      import('@/services').then(
        async ({ narrativeSignalService, computeEditRatio, validationStudyService }) => {
          const { deidentifySignal } = await import('@/services/narrativeSignals/deidentification');

          // ── Resolve the active study (if any) covering this case ───────────
          // Previously: studyId always read (caseData as any)?.activeStudyId,
          // a field NOTHING in the codebase ever sets — every real signal got
          // studyId: undefined regardless of whether an active study's scope
          // actually covered this case/pathologist/subspecialty. The matching
          // logic already existed (getStudyForCase), it was just never called
          // anywhere. Calling it here, at signal-capture time, is correct
          // because study membership is evaluated per-case at the moment of
          // finalization, not stored ahead of time. The lookup is shared with
          // the abnormal-detection agreement signals (resolveActiveStudyId,
          // Batch 318) so both kinds of signal agree on a case's study.
          const resolvedStudyId = await resolveActiveStudyId({
            clientId:       caseData?.order?.facilityId ?? '',
            pathologistId:  signingUser?.id ?? '',
            subspecialtyId: caseData?.subspecialtyId,
          }, validationStudyService);

          const signals = orchSections
            .filter(s => s.aiGenerated || s.text)
            .map(s => {
              const editRatio = computeEditRatio(s.aiGenerated, s.text);
              const deid      = deidentifySignal(s.aiGenerated, s.text, editRatio);
              return {
                caseId:             caseData?.id ?? '',
                accessionNumber:    caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? '',
                // Still genuinely missing from Case — unlike finalizedAt/
                // finalizedBy/pendingAddendumId, nothing in the codebase
                // resolves or persists this anywhere yet (Config → Report
                // Templates' Routing Rules resolve a template per-request,
                // they don't write the result back onto the case), so
                // there's no real value this could ever read here. Left
                // as an explicit fallback rather than invented as a
                // real Case field with nothing to populate it.
                reportTemplateId:   'tmpl-gold-standard',
                templateName:       s.label,
                sectionId:          s.id,
                sectionTitle:       s.label,
                aiGeneratedClean:   deid.aiGeneratedClean,
                finalTextClean:     deid.finalTextClean,
                structuralEditType: deid.structuralEditType,
                replacementCount:   deid.replacementCount,
                editRatio,
                wasAccepted:        s.aiGenerated === s.text && !!s.aiGenerated,
                subspecialtyId:     caseData?.subspecialtyId,
                studyId:            resolvedStudyId,
              };
            });
          narrativeSignalService.recordSignals(signals).then(() => {
            console.info(`[PathScribe] Recorded ${signals.length} de-identified signal(s)${resolvedStudyId ? ` for study ${resolvedStudyId}` : ' (no active study match)'}`);
          });
        }
      ).catch(console.error);
    }

    // First-time finalize OR amendment/addendum completion, in sequence (finalizeAndRelease), so the two never clobber each other's setCaseData.
    (async () => {
      // Batch 345: check the signature before anything is finalised.
      if (caseData?.id) {
        const accepted = await signatureGate.accept(confirmation, { caseId: caseData.id, caseRef: signingCaseRef, actions: ['synoptic-finalize'] });
        if (accepted.ok === false) { showToast(t(`signatureEvidence.refused.${accepted.reason}`), 'warning'); return; }
      }
      await finalizeAndRelease();
    })();
  }, [signingCaseRef, showToast, t, setShowFinalizeModal, caseData, isOrchestrationMode, orchSections, finalizeAndRelease, signingUser, synopticPanelRef]);

  // Real, per direct guidance's own confirmed, foundational gap (PS-274):
  // suggestSynopticFields() and AiReviewModal were both already real
  // and live, but nothing ever connected them. This is that missing
  // connection — reuses the exact same real getTemplate()/PathScribeAIService
  // patterns already established elsewhere in this same file, rather
  // than inventing new ones. Real, confirmed direction: an orchestrator-
  // mode option (a user can dictate/enter the narrative and let AI fill
  // the synoptic) — assist/LIS mode's own real trigger for this same
  // underlying call is real, separate UI work, not built here.
  // Real, per direct guidance's own confirmed correction: "Gross
  // Complete" was the wrong trigger point (it implies the narrative or
  // synoptic was already reviewed — too late to offer AI help). Real,
  // second confirmed correction: a single, auto-detecting action was
  // also the wrong shape — it silently does nothing when both sides
  // already have content, and gives the user no way to explicitly ask
  // for one direction regardless of current state. Two separate,
  // explicitly user-triggered actions instead — each always attempts
  // its own real direction when called, regardless of whether the
  // other side already has content (a real user re-running
  // suggestions after editing the narrative further is a legitimate,
  // real use, not an error state).
  const handleSuggestSynopticFromNarrative = useCallback(async () => {
    if (!caseData?.id) return;
    const activeInstance = activeReportInstanceId
      ? caseData.synopticReports?.find(r => r.instanceId === activeReportInstanceId)
      : caseData.synopticReports?.[0];

    const caseText = {
      gross: caseData.diagnostic?.grossDescription ?? '',
      microscopic: caseData.diagnostic?.microscopicDescription ?? '',
      ancillary: caseData.diagnostic?.ancillaryStudies ?? '',
    };

    if (!caseText.gross.trim() && !caseText.microscopic.trim() && !caseText.ancillary.trim()) {
      showToast(t('useSignOutWorkflow.toast.enterNarrativeBeforeAiSuggestions'), 'warning');
      return;
    }
    if (!activeInstance?.templateId) {
      showToast(t('useSignOutWorkflow.toast.noSynopticTemplateAssigned'), 'warning');
      return;
    }

    setIsSuggestingSynoptic(true);
    try {
      let template: EditorTemplate | undefined;
      try {
        const detail = await getTemplate(activeInstance.templateId);
        template = detail.template;
      } catch (e) {
        showToast(t('useSignOutWorkflow.toast.couldNotLoadTemplateForAiSuggestion'), 'warning');
        return;
      }
      if (!template) return;

      const fields = template.sections.flatMap((s: any) => s.fields.map((f: any) => ({
        id: f.id, label: f.label, options: (f.options ?? []).map((o: any) => ({ id: o.id, label: o.label })),
      })));

      const aiService = new PathScribeAIService();
      const result = await aiService.suggestSynopticFields(caseText, fields);
      if (result.ok === false || !result.data) {
        showToast(t('useSignOutWorkflow.toast.aiSuggestionFailed'), 'warning');
        return;
      }

      const newReviewFields = buildReviewFieldsFromAiSuggestions(result.data, template, caseData);
      if (newReviewFields.length === 0) {
        showToast(t('useSignOutWorkflow.toast.aiFoundNoFields'));
        return;
      }
      setReviewFields(newReviewFields);
      setShowAiReview(true);
    } finally {
      setIsSuggestingSynoptic(false);
    }
  }, [caseData, activeReportInstanceId, showToast, setReviewFields, setShowAiReview, t]);

  // Real, per direct guidance's own confirmed PS-275 scope (Phase 2,
  // the reverse of PS-274's own Narrative -> Synoptic direction).
  // Builds the real prompt from the case's own current synoptic
  // answers (PathScribeAIService.generateNarrativeFromSynopticAnswers,
  // which itself reuses buildSynopticNarrativePrompt.ts \u2014 never
  // duplicated here), then opens AiNarrativeReviewModal.tsx \u2014 the
  // real, deliberately separate review surface PS-275 itself called
  // for, since generated prose has no per-field confidence score the
  // way AiReviewModal's own discrete field values do.
  const handleGenerateNarrativeFromSynoptic = useCallback(async () => {
    if (!caseData?.id) return;
    const activeInstance = activeReportInstanceId
      ? caseData.synopticReports?.find(r => r.instanceId === activeReportInstanceId)
      : caseData.synopticReports?.[0];
    const synopticAnswers = activeInstance?.answers ?? caseData.synopticAnswers ?? {};

    if (Object.keys(synopticAnswers).length === 0) {
      showToast(t('useSignOutWorkflow.toast.answerFieldsBeforeGeneratingNarrative'), 'warning');
      return;
    }
    if (!activeInstance?.templateId) {
      showToast(t('useSignOutWorkflow.toast.noSynopticTemplateAssigned'), 'warning');
      return;
    }

    setIsGeneratingNarrative(true);
    try {
      let template: EditorTemplate | undefined;
      try {
        const detail = await getTemplate(activeInstance.templateId);
        template = detail.template;
      } catch (e) {
        showToast(t('useSignOutWorkflow.toast.couldNotLoadTemplateForNarrativeGeneration'), 'warning');
        return;
      }
      if (!template) return;

      const aiService = new PathScribeAIService();
      const result = await aiService.generateNarrativeFromSynopticAnswers(template, synopticAnswers);
      if (result.ok === false || !result.data) {
        showToast(t('useSignOutWorkflow.toast.narrativeGenerationFailed'), 'warning');
        return;
      }

      setGeneratedNarrativeText(result.data);
      setShowNarrativeReview(true);
    } finally {
      setIsGeneratingNarrative(false);
    }
  }, [caseData, activeReportInstanceId, showToast, t]);

  /** Real, per direct guidance's own confirmed PS-275 review step:
   *  the pathologist's own final, possibly-edited text — never the
   *  raw AI output unconditionally — lands in the real diagnostic
   *  field they chose in AiNarrativeReviewModal.tsx. Persists via the
   *  same real caseRouter.updateCase() + knownVersionRef pattern this
   *  file already uses elsewhere for diagnostic field writes. */
  const handleAcceptGeneratedNarrative = useCallback(async (
    finalText: string,
    targetField: 'gross' | 'microscopic' | 'ancillary',
  ) => {
    if (!caseData?.id) return;
    const diagnosticKey = targetField === 'gross' ? 'grossDescription'
      : targetField === 'microscopic' ? 'microscopicDescription'
      : 'ancillaryStudies';

    const updatedDiagnostic = { ...caseData.diagnostic, [diagnosticKey]: finalText };
    setCaseData({ ...caseData, diagnostic: updatedDiagnostic, updatedAt: new Date().toISOString() } as any);
    setShowNarrativeReview(false);

    try {
      await caseRouter.updateCase(caseData.id, { diagnostic: updatedDiagnostic } as any, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
    } catch (e) {
      showToast(t('useSignOutWorkflow.toast.narrativeInsertedSaveFailed'), 'warning');
    }
  }, [caseData, setCaseData, knownVersionRef, showToast, t]);

  return {
    finalizeSignOut,
    handleSignOutConfirm,
    handleReturnToTrainee,
    buildSynopticsForReview,
    finalizeCase,
    finalizeAndRelease,
    missingFields, setMissingFields,
    showMissingWarning, setShowMissingWarning,
    reviewFields, setReviewFields,
    showAiReview, setShowAiReview,
    handleSuggestSynopticFromNarrative,
    isSuggestingSynoptic,
    handleGenerateNarrativeFromSynoptic,
    isGeneratingNarrative,
    showNarrativeReview, setShowNarrativeReview,
    generatedNarrativeText,
    handleAcceptGeneratedNarrative,
    finalizeAndNextPending, setFinalizeAndNextPending,
    showPreFinalise, setShowPreFinalise,
    preFinalSynoptics,
    handleRequestFinalize,
    handlePreFinalConfirm,
    handleFinalizeConfirm,
    criticalFindings,
    showCriticalFindingsModal, setShowCriticalFindingsModal,
    handleRecordCriticalNotification,
    handleAcknowledgeCriticalFindings,
  };
}

/** Batch 534: hands a buffered sign-out to the background release (services/reportRelease/releaseReport.trackSignOutBuffer). */
function trackSignOutBufferLazy(caseId: string, expiresAt: string, signer: { id?: string; name?: string } | null | undefined, performingFacilityId?: string): void {
  void Promise.all([import('@/services/reportRelease/releaseReport'), import('@/services/reportRelease/releaseReportDeps')])
    .then(([{ trackSignOutBuffer }, { releaseReportDeps }]) => trackSignOutBuffer({
      caseId, expiresAt, releasedBy: { userId: signer?.id ?? '', userName: signer?.name ?? signer?.id ?? '' }, ...(performingFacilityId ? { performingFacilityId } : {}),
    }, releaseReportDeps))
    .catch(e => console.error('[useSignOutWorkflow] Buffered sign-out not handed to the background release:', e));
}

/** Each report's answers by instance (the countersign snapshot and its comparison). */
function answersByInstance(caseData: Case): Record<string, Record<string, string | string[]>> {
  return Object.fromEntries((caseData.synopticReports ?? []).map((r: SynopticReportInstance) => [r.instanceId, r.answers ?? {}]));
}

/** PS-114: a countersigned case with a provisional hire on it counts toward their FPPE review period; a failure is logged, not hidden. */
async function recordFppeCaseReviewed(caseData: Case): Promise<void> {
  const provisional = caseData.participants?.find((p: CaseParticipant) => p.status === 'active' && p.participationTypeIds?.includes('provisional_hire'));
  if (!provisional) return;
  const assignmentRes = await qaSupervisionAssignmentService.getActiveAssignmentForUser(FPPE_ACTIVITY_TYPE_ID, provisional.staffId, caseData.subspecialtyId).catch(() => null);
  if (!assignmentRes?.ok || !assignmentRes.data) return;
  try {
    await qaSupervisionAssignmentService.recordCaseReviewed(assignmentRes.data.id);
  } catch (e) {
    console.error('[PS-114] Failed to record case review on the new QaSupervisionAssignment system — the sign-out gate reads from this system, so a silent failure here could leave a graduated pathologist incorrectly gated.', e);
  }
}
