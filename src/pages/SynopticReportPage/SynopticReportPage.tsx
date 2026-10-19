// src/pages/SynopticReportPage/SynopticReportPage.tsx
// ─────────────────────────────────────────────────────────────
// Orchestrator — assembles the full clinical workspace shell:
//
//   ┌─ NavBar ──────────────────────────────────────────────────┐
//   ├─ HeaderBar (accession, patient, sign-out) ────────────────┤
//   ├─ Sidebar │ LeftReportPanel │ RightSynopticPanel ──────────┤
//   └─ BottomActionBar ─────────────────────────────────────────┘
//
// RightSynopticPanel owns all synoptic state and rendering.
// This file is intentionally thin — layout + modal wiring only.
// ─────────────────────────────────────────────────────────────

import { writeBackSpecimenToLis } from '@/services/specimens/simulateSpecimenLisAck';
import { facilityService, delegationTypeForVoiceAction, completeDelegatedWork, delegationService } from '@/services';
import { resolveSplitReportBranding, technicalBrandingForRender } from '@/services/facilities/resolveSplitReportBranding';
import { renderPageSetup } from '@/services/reportAppearance/pageSetup';
import { useOpenCase } from '@/hooks/useOpenCase';
import { useRouteCaseId } from '@/hooks/useRouteCaseId';
import { CaseUnavailable } from '@/components/CaseUnavailable/CaseUnavailable';
import { WorkupPartsModal } from './modals/WorkupPartsModal';
import { setWorkupParts, type WorkupPartsMode } from '@/services/reports/workupParts';
import { resolveReportLocaleForFacility } from '@/services/reports/resolveReportLocale';
import { RelatedCasesAmendedNotice } from '@/components/RelatedCases/RelatedCasesAmendedNotice';
import { loadIntraopDiagnosisForCase } from '@/services/reports/intraopDiagnosisForCase';
import { attachedRelatedCases, freezeRelatedCases, subscribeRelatedCaseAttachments } from '@/services/relatedCases/relatedCaseAttachments';
import { surgicalReportLabelsFor, formatReportDateOfBirth } from '@/services/reports/surgicalReportLabels';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVoice } from '@/contexts/VoiceProvider';
import { useFootPedal } from '@/hooks/useFootPedal';
import { useAutoBlockOrderDispatch } from '@/hooks/useAutoBlockOrderDispatch';
import { useAudioSegmentRecorder } from '@/hooks/useAudioSegmentRecorder';
import { useNavigate, useLocation } from 'react-router';
import { useCapabilities } from '@/hooks/useCapabilities';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useTranslation, Trans } from 'react-i18next';
import type { DirtySectionId } from '@/services';
import { loadFollowUpMarkOffer, markFollowUpExpectedAfterSignOutLive, followUpMarkFailureKey, type FollowUpMarkOffer } from '@/services';
import { applyCaseReportImagesToBlob, CASE_IMAGES_FAILED } from '@/services';
import { AttachReportImagesModal } from '@/components/ReportImages/AttachReportImagesModal';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { HeldReportsBanner } from '@/components/ReportRelease/HeldReportsBanner';
import { CaseUpdatedBanner } from './components/CaseUpdatedBanner';
import { useCaseUpdateNotice } from '@/hooks/useCaseUpdateNotice';
import { useCasePresence } from '@/hooks/useCasePresence';
import { casePresenceSelf } from '@/services/liveUpdates/casePresence';
import { isPersonsDirtySection, isPersonsEdit, isReportEditEvent } from '@/services/cases/caseEditingSignal';
import { CasePresenceStrip } from './components/CasePresenceStrip';
import { caseUpdateNoticeDeps } from '@/services/cases/caseUpdateNoticeDeps';
import AddSynopticModal       from './components/AddSynopticModal';
import SpecimenEditModal      from './modals/SpecimenEditModal';
import CreateBiopsyArrayModal from './modals/CreateBiopsyArrayModal';
import MatrixBlockEditorModal from './modals/MatrixBlockEditorModal';
import AddOrdersModal, { type OrderTab } from './modals/AddOrdersModal';
import NavBar             from '@/components/NavBar/NavBar';
import HeaderBar          from './components/HeaderBar';
import Sidebar            from './components/Sidebar';
import MaterialTreePanel  from './components/MaterialTreePanel';
import LeftReportPanel    from './components/LeftReportPanel';
import { AmendmentStatusBanner } from './components/AmendmentStatusBanner';
import { ReturnToTraineeBar } from '@/components/Common/ReturnToTraineeBar';
import AutopsyAuthorizationCompletionForm from '../../components/Autopsy/AutopsyAuthorizationCompletionForm';
import AutopsyBodyReleaseForm from '../../components/Autopsy/AutopsyBodyReleaseForm';
import { resolveCodeManagerSave, buildCodeManagerExistingCodes, type CodeManagerCode } from '@/services/codes/codeManagerCoding';
import { resolveAutopsyGrossExaminationGate } from '@/services/autopsy/resolveAutopsyGrossExaminationGate';
import { resolveAutopsyAccessionStatus } from '@/services/autopsy/resolveAutopsyAccessionStatus';
import { resolveAutopsyTatSlaMatrix } from '@/services/autopsy/resolveAutopsyTatSlaMatrix';
import { formatAutopsyTatSlaSummary } from '@/services/autopsy/formatAutopsyTatSlaSummary';
import AutopsyTatChip from '@/components/Autopsy/AutopsyTatChip';
import { resolveHtaApplicability } from '@/services/autopsy/resolveHtaApplicability';
import { resolveAutopsyBodyReleaseGate } from '@/services/autopsy/resolveAutopsyBodyReleaseGate';
import { resolveAutopsyBodyAlreadyReleased } from '@/services/autopsy/resolveAutopsyBodyAlreadyReleased';
import { resolveExcludedOrgansPresent } from '@/services/autopsy/resolveAutopsyConsentScopeViolation';
import { recordAutopsyCustodyTransfer, custodyEventsForToxicologyOrder } from '@/services/autopsy/recordAutopsyCustodyTransfer';
import { recordAutopsyOrganTag } from '@/services/autopsy/recordAutopsyOrganTag';
import { recordAutopsyConsentStatusChange } from '@/services/autopsy/recordAutopsyConsentStatusChange';
import { recordAutopsyOrganRetentionDisposal } from '@/services/autopsy/recordAutopsyOrganRetentionDisposal';
import { orderAutopsyToxicology } from '@/services/autopsy/orderAutopsyToxicology';
import { recordAutopsyToxicologyResult } from '@/services/autopsy/recordAutopsyToxicologyResult';
import { cancelAutopsyToxicologyOrder } from '@/services/autopsy/cancelAutopsyToxicologyOrder';
import { recordAutopsyOrganRetentionDetail } from '@/services/autopsy/recordAutopsyOrganRetentionDetail';
import { recordAutopsyOrganRetentionTier } from '@/services/autopsy/recordAutopsyOrganRetentionTier';
import { recordAutopsyConsentReinstatement } from '@/services/autopsy/recordAutopsyConsentReinstatement';
import { AUTOPSY_ORGAN_LABEL_KEY } from '@/pages/AccessionPage/autopsyOrganLabelKeys';
import { AUTOPSY_ORGAN_TO_SECTION, type AutopsyOrganCode } from '@/types/autopsy/AutopsyOrganCode';
import type { HospitalConsentStatus, OrganRetentionDisposalRecord, AutopsyOrganTagStatus } from '@/types/autopsy/AutopsyCaseDetails';
import { signAutopsyReport } from '@/services/autopsy/signAutopsyReport';
import { SignatureConfirmModal } from '@/components/Signing/SignatureConfirmModal';
import ConfirmModal from '@/components/Common/ConfirmModal';
import ReasonPromptModal from '@/components/Common/ReasonPromptModal';
import { formatList } from '@/utils/formatList';
import type { SignatureConfirmation } from '@/services/auth/signerConfirmation';
import { releasePreliminaryReport } from '@/services/reports/releasePreliminaryReport';
import { getMainBodySpecimen } from '@/services/autopsy/getMainBodySpecimen';
import { buildAutopsyCaseTimeline } from '@/services/autopsy/buildAutopsyCaseTimeline';
import AutopsyCaseTimeline from '@/pages/SynopticReportPage/components/AutopsyCaseTimeline';
import type { AutopsyCaseDetails, AutopsyCustodianType } from '@/types/autopsy/AutopsyCaseDetails';
// Real fix, per direct follow-up: "I want informal reviews to be
// handled differently than delegations types, so remove the informal
// action from that workflow." InformalReviewBanner.tsx was built
// around DelegationRecord.delegationType === 'CASUAL_REVIEW' -
// removed from this page along with that whole approach, and the file
// itself deleted in Batch 355 (PS-346). Replaced by a real, separate
// InformalReviewRequest system - see the "Internal Notes" button
// effect below, and the new "Informal Review" Worklist tile.
import { ReleaseBufferBanner } from './components/ReleaseBufferBanner';
import { RevisionFeedbackBanner } from './components/RevisionFeedbackBanner';
import { AmendmentDraftBanner } from './components/AmendmentDraftBanner';
import RightSynopticPanel, { type RightSynopticPanelHandle, type AiSuggestion } from './components/RightSynopticPanel';
import { OrganMapPanel } from '@/components/OrganMap/OrganMapPanel';
import { collectMarginInk } from '@/services/grossing/marginInkLabels';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { useOrganMap } from './hooks/useOrganMap';
import { computeAiSynthesisStatus, type AiSynthesisStatus, type MustHaveFields } from '@/services/templates/aiSynthesisStatus';
import MicroscopicEntryPanel from './components/MicroscopicEntryPanel';
import { useMicroscopicEntry } from './hooks/useMicroscopicEntry';
import { useEffectiveSpecimenComplexity } from './hooks/useEffectiveSpecimenComplexity';
import BottomActionBar    from './components/BottomActionBar';

import AmendmentModal        from './modals/AmendmentModal';
import { CaseCommentModal }   from '../Synoptic/Comments/CaseCommentModal';
import { RetentionHoldModal } from './modals/RetentionHoldModal';
import { CaseHoldModal } from './modals/CaseHoldModal';
import { CriticalFindingsModal } from './modals/CriticalFindingsModal';
import PatientHistoryModal    from '../../components/PatientHistory/PatientHistoryModal';
import { RestrictedCasesNotice } from '../../components/PatientHistory/RestrictedCasesNotice';
import FlagManagerModal       from '../../components/Flags/FlagManagerModal';
import { AddCodeModal }       from '../Synoptic/Codes/AddCodeModal';
import { useTriggerCodeQueries } from './hooks/useTriggerCodeQueries';
import { ReportCommentModal } from '../Synoptic/Comments/ReportCommentModal';
import { reconcileEntries } from '@/services/coding/caseCodingEntries';
import type { CodedEntry } from '@/services/coding/codedEntry';
import CaseSignOutModal      from './modals/CaseSignOutModal';
import BillingReviewPanel from './components/BillingReviewPanel';
import { DiscordanceReconciliationModal } from './modals/DiscordanceReconciliationModal';
import { CopilotReportViewModal } from './modals/CopilotReportViewModal';
import ReportPrintPromptModal from './modals/ReportPrintPromptModal';
import { recordDocumentOutput, planReportPrint, DOCUMENT_DESTINATION, type PrintPlan } from '@/services';
import { useLisIntegration } from './hooks/useLisIntegration';
import { MATERIAL_SCAN_UPDATED_EVENT } from '@/hooks/useGlobalMaterialScanTracking';
import { getEffectiveScanStationId } from '@/utils/effectiveScanStation';
import { useSpecimenBlockManagement } from './hooks/useSpecimenBlockManagement';
import { useEffectiveScanStation } from '@/hooks/useEffectiveScanStation';
import { useReportGeneration } from './hooks/useReportGeneration';
import { useAmendmentWorkflow } from './hooks/useAmendmentWorkflow';
import { useGrossingCompletion } from './hooks/useGrossingCompletion';
import { useOrchestratorDraft, writeCaseDraft, caseDraftUpdates } from './hooks/useOrchestratorDraft';
import { useWarningConfirm } from './hooks/useWarningConfirm';
import { useSignOutWorkflow } from './hooks/useSignOutWorkflow';
import { resolveBuildReportAvailability } from './hooks/resolveBuildReportDirection';
import FinalizeSynopticModal from './modals/FinalizeSynopticModal';
import LogoutWarningModal    from '@/components/Common/LogoutWarningModal';
import UnsavedWarningModal   from './modals/UnsavedWarningModal';
import DraftRecoveryModal    from '@/components/Common/DraftRecoveryModal';
import { ManageReprintsModal } from './modals/ManageReprintsModal';
import { printRequisitionLabel, printContainerLabel, printDecantContainerLabel } from '@/utils/labels/printRequisitionAndContainerLabels';

import { useSynopticFinalize } from '../Synoptic/useSynopticFinalize';
import { useSynopticModals }   from '../Synoptic/useSynopticModals';
import { useSynopticToast }    from '../Synoptic/useSynopticToast';
import { useSynopticFlags }    from '../Synoptic/useSynopticFlags';
import { SaveToast }           from '../Synoptic/UI/SaveToast';

import { caseRouter } from '@/services/cases/CaseRouter';
import { priorityService, sequenceCaseReports } from '@/services';
import { getUiPreference, setUiPreference, getSessionFlag } from '@/utils/uiPreferences';
import { stainTypeService } from '@/services';
import { computeCaseCodingSummary } from '@/services/billing/codeMapTable';
import type { PostSignoutChangeContext } from '@/services/billing/resolveServiceCharge';
import { postSignoutReasonNeeded, specimenBillingChangeSummary } from '@/services/billing/postSignoutBillingReason';
import { PostSignoutBillingChangeModal } from '@/components/Billing/PostSignoutBillingChangeModal';
import { CorrectAppliedCodeModal } from '@/components/Billing/CorrectAppliedCodeModal';
import { enforceAppliedCodeCorrection } from '@/services/billing/correctServiceCharge';
// Batch 381: services through @/services, not their mock file paths.
import { actionRegistryService, reportTemplateService, reportReleaseService, evaluateGrossingTemplateAssignment } from '@/services';
import { auditService, authorizationService, signatureGate } from '@/services';
import { ConcurrencyConflictError } from '@/services/cases/ConcurrencyConflictError';
import { adoptSavedVersion, caseConflictRows, overwriteAfterConflict, caseOverwriteDeps, savePageChange, commitMergeReview, takeUpSavedCase, takeUpNewerCase, takeTheirVersion, selectionAfterTakeUp, orchestrationDiagnosticAfterTakeUp, MergeReviewPendingError, caseWriteDeps, type ConflictRow, type MergeReview } from '@/services';
import { EditConflictDialog } from './components/EditConflictDialog';
import { MergeReviewDialog } from './components/MergeReviewDialog';
import { handleConcurrencyConflict } from './hooks/sharedHookTypes';
import { intraoperativeService } from '@/services';
import { IntraopMergePromptModal } from '@/pages/AccessionPage/IntraopMergePromptModal';
import type { EntryMatch } from '@/types/intraop/IntraoperativeEntry';
import { amendmentService, reportVersionService, reportChangeLogService, REPORT_CHANGE_LOGGED_EVENT, type ReportChangeEntry } from '@/services';
import { exportChangeLog } from '@/services/reportChangeLog/exportChangeLog';
import { downloadCsv } from '@/utils/csv';
import { ChangeHistoryModal } from './modals/ChangeHistoryModal';
import { resolveMaterialAssetClick } from '@/services/billing/billingMaterialSync';
import { aiReportToolsVisibility, aiReportToolsInputs } from '@/services/aiIntegration/aiReportTools';
import { AiReportToolButtons } from './components/AiReportToolButtons';
import { reportPrintAuditEvent, REPORT_DOCUMENT } from '@/services/printing/reportPrintAudit';
import { checkReportPrint } from '@/services/printing/reportPrintGate';
import { resolveReportRevisionStatus } from '@/services/reports/resolveReportRevisionStatus';
import { buildReportRenderRevision } from '@/services/reports/buildReportRenderRevision';
import { useReportRevisionStatus } from '@/hooks/useReportRevisionStatus';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import { deficiencyTypeService, resolutionTypeService } from '@/services';
import type { SpecimenDeficiency, DeficiencyType, ResolutionType } from '@/services/deficiencies/IDeficiencyService';
import { DeficiencyHistoryModal } from './modals/DeficiencyHistoryModal';
import { VersionHistoryModal } from './modals/VersionHistoryModal';
import { SignatureHistoryModal } from './modals/SignatureHistoryModal';
import { signatureRecordService } from '@/services';
import type { SignatureRecord } from '@/services/signatures/ISignatureRecordService';
import { BlockStainEditorModal } from './modals/BlockStainEditorModal';
import type { CaseComment } from '@/types/case/CaseComment';
import { specimenDeficiencyService } from '@/services';
import { useSpecimenDictionary } from '@/components/Config/System/useSpecimenDictionary';
import { FixativeTimeGateModal, type FixativeGateSpecimen, type FixativeResolution } from './modals/FixativeTimeGateModal';
import { StainQcGateModal } from './modals/StainQcGateModal';
import { InkingGateModal } from './modals/InkingGateModal';
import type { InkingGateResult } from '@/services/grossing/evaluateInkingGate';
import { ClinicalMismatchModal } from '@/components/ClinicalMismatch/ClinicalMismatchModal';
import { PeerReviewGateModal } from './modals/PeerReviewGateModal';
import { PeerReviewBanner } from './components/PeerReviewBanner';
import { usePeerReview } from './hooks/usePeerReview';
import type { ClinicalMismatchAssessment, PeerReviewStatus } from '@/services';
import { ClinicalMismatchAlert } from '@/components/ClinicalMismatch/ClinicalMismatchAlert';
import { CaseClinicalHistoryBar } from '@/components/ClinicalHistory/CaseClinicalHistoryBar';
import { useClinicalMismatchAlert } from './hooks/useClinicalMismatchAlert';
import { checkAutopsyClinicalMismatch } from './hooks/checkPeerReviewAndMismatch';
import { runExport } from '@/services/exports/runExport';
import type { StainQcGateBlockingItem } from './hooks/checkStainQcGate';
import { PreAnalyticDateGateModal, type PreAnalyticDateGateSpecimen, type PreAnalyticDateResolution } from './modals/PreAnalyticDateGateModal';
import { getOrganisationByHospitalId } from '@/services/organisation/organisationService';
import { resolvePreAnalyticDateGateConfig } from '@/services/billing/resolvePreAnalyticDateGateConfig';
import SynopticSidebar    from '../../components/Synoptic/SynopticSidebar';
import { useDirtyState } from '@/contexts/DirtyStateContext';
import { useLogout } from '@/hooks/useLogout';
import { useDraftCache } from '@/hooks/useDraftCache';
import { useLabelBridgeNotice } from './hooks/useLabelBridgeNotice';
import { computeDraftDiff } from '@/utils/computeDraftDiff';
import '@/pathscribe.css';

import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock } from '@/types/case/Specimen';
import type { Decant } from '@/types/case/Material';
import { billableUnitOf } from '@/services/material/billableMaterial';
import { findingsForField } from '@/services/clinical/findingHighlight';
import { AiReviewModal }  from './modals/AiReviewModal';
import { AiNarrativeReviewModal } from './modals/AiNarrativeReviewModal';
import { DelegateModal }  from '../Synoptic/Delegate/DelegateModal';
import { FlagForMdtModal } from '@/components/TumorBoard/FlagForMdtModal';
import CaseTeamModal            from './modals/CaseTeamModal';
import { PreFinalisationModal } from './modals/PreFinalisationModal';
import { ProtocolChangeModal }     from './modals/ProtocolChangeModal';
// ProtocolChange moved to Case.ts — see comment there. (ProtocolChangeModal.tsx
// still re-exports it for backward compat, but importing it from its real
// home directly here, alongside Case/SynopticReportInstance below.)
import { useAuditLog } from '@/components/Audit/useAuditLog';

// ── Orchestrator ───────────────────────────────────────────────
import OrchestratorSectionEditor from './components/OrchestratorSectionEditor';
import type { OrchestratorSection } from './components/OrchestratorSectionEditor';
import ReportPreviewRenderer, { getInstitution, buildRenderScope } from '@/pages/ReportPreview/ReportPreviewRenderer';
import SequencerPanel from './components/SequencerPanel';
import { buildContext, resolveAnswers } from '@/orchestrator/contextBuilder';
import type { StructuredContext } from '@/orchestrator/contextBuilder';
import { aiBehaviorService } from '@/services';
import { resolveConfidenceThresholdForClient } from '@/components/Config/AI/resolveClientAiModel';
import { reportRendererUrl } from '@/services/reports/reportRenderer';
import { revisionAllowedNow } from '@/services/reportRelease/revisionDuringDelay';
import { useCaseSpellCheck } from '@/hooks/useCaseSpellCheck';
import { SpellCheckProvider } from '@/components/SpellCheck/SpellCheckContext';
import type { SpellingLocale } from '@/services/spellcheck/spellingLocales';
import { getCaseOpenedFrom, markReturnToSearch } from '@/utils/search/searchSession';
import { caseReturnTarget } from '@/utils/search/caseReturnTarget';
import { recordCaseCharge, recordCaseCredit, recordCaseCodeCorrection, enforceBillingReview, auditBillingSuggestionDeclined } from '@/services';
import { codingWithApproved, codingWithRejected, codingWithOverride, codingWithoutCode, codingWithCorrection, groupApprovalsByUnit, specimensWithBaseCodeAdded, specimensWithBaseCodeRemoved, specimensWithBaseCodeCorrected, specimensWithMatrixCode, matrixSlidesWithEvaluatedCores, type BillingApprovalItem } from '@/services';
import { partGridRowsOf } from '@/services/templates/partGrid';
import { reportFiguresWithAuto, reportTranslateFor } from '@/services/organMapping/organMapAutoFigures';
import { resolveReportWatermarkText, type ReportRenderPurpose } from '@/services/reports/resolveReportWatermark';
import { escapeHtml, cssString } from '@/services/security/sanitizeHtml';
import { pressable } from '@/utils/a11y/pressable';

// Batch 445: the default template's stored name. It's saved into the report
// and draft data in English (data); on screen it's shown translated.
const GOLD_STANDARD_TEMPLATE_NAME = 'Gold Standard — General Surgical Pathology';


// Report PDF generation — Firebase Cloud Function (Python/ReportLab), see
// functions-render-report/main.py. Not secret (it's a function URL, not a
// key), so VITE_-prefixed is fine here — unlike the API key issue found
// and fixed elsewhere in this codebase.
//
// Local default is 'http://localhost:8080/' — NOT '.../render_report'.
// `functions-framework --target=render_report --port=8080` serves the
// target function at the root of that port; --target only selects which
// Python function runs, it isn't a URL path segment. Once deployed to
// Firebase, set VITE_REPORT_PDF_ENDPOINT to the full URL Firebase gives
// you for the function (the function name is already part of that
// hostname/path) — don't append /render_report to it either.
//
// Batch 327 (HTTPS): resolved through utils/serviceEndpoint.ts. A
// production build must set VITE_REPORT_PDF_ENDPOINT to an https:// URL;
// a missing or plain-HTTP value is refused before any request (the
// print falls back to printing from screen) rather than sending the
// report to http://localhost:8080/. The localhost default and loopback
// HTTP remain for development only.
// Batch 539: the setting and its checks are shared (services/reports/reportRenderer.ts).
const reportPdfEndpoint = (): string => reportRendererUrl();

// ── AI Synthesis Status — the Gatekeeper Badge. Decided by
// services/templates/aiSynthesisStatus.ts (PS-329, Batch 437: only the
// template's Must Have fields count).
export type { AiSynthesisStatus } from '@/services/templates/aiSynthesisStatus';

/** Translated text for each signAutopsyReport error code (Batch 331). */
const AUTOPSY_SIGN_ERROR_KEY: Record<string, string> = {
  CASE_NOT_FOUND:              'autopsySignOut.errors.caseNotFound',
  NO_AUTOPSY_RECORD:           'autopsySignOut.errors.noAutopsyRecord',
  PAD_REQUIRED:                'autopsySignOut.errors.padRequired',
  NO_FORENSIC_APPOINTMENT:     'autopsySignOut.errors.noForensicAppointment',
  // Batch 478: resolveAutopsyGrossExaminationGate.ts is now a real hard
  // stop here. The gate's own blockedReasons (gate.blockedReasons, shown
  // already in the warning banner above) stay literal English — a
  // pre-existing gap, not introduced or fixed by this batch — so this
  // toast shows a translated, generic message instead of result.error.
  AUTHORIZATION_GATE_BLOCKED:  'autopsySignOut.errors.authorizationGateBlocked',
  GATE_OVERRIDE_NOT_PERMITTED: 'autopsySignOut.errors.gateOverrideNotPermitted',
  SAVE_FAILED:                 'autopsySignOut.errors.saveFailed',
};

// Batch 469 (PS-261 §2.5.1 follow-up) — the full organ-code vocabulary,
// for the consent-narrowing excluded-organs picker. Flat (unlike
// AccessionPage's own grouped AUTOPSY_ORGAN_PICKER_GROUPS), since this
// picker is about marking exclusions on an already-accessioned case,
// not driving section visibility.
const ALL_AUTOPSY_ORGAN_CODES = Object.keys(AUTOPSY_ORGAN_TO_SECTION) as AutopsyOrganCode[];

const SynopticReportPage: React.FC = () => {
  // Batch 446: the address carries the case's reference, not its accession.
  const caseId = useRouteCaseId('synoptic');
  const { user: signingUser } = useAuth();
  const { log }   = useAuditLog();
  const navigate   = useNavigate();
  const openCasePage = useOpenCase();
  const { t: tGrossingNav, i18n: i18nForDates } = useTranslation();
  // Batch 382: the name used when nobody is signed in, in the user's language (was English in twelve places).
  const unknownUserName = tGrossingNav('common.unknownUser');
  const location   = useLocation();
  const handleLogout = useLogout();

  // ── Worklist state ─────────────────────────────────────────
  const routerWorklistIds: string[] = (location.state as any)?.worklistCaseIds ?? [];

  // Track whether this case was opened from Search or Worklist.
  // Set by SearchPage / WorklistTable before navigation (utils/search/searchSession.ts).
  const navSource: 'search' | 'worklist' = React.useMemo(() => {
    return getCaseOpenedFrom();
  }, []);

  // PS-101 review: the breadcrumb names this place too (utils/search/caseReturnTarget.ts).
  const returnTarget = React.useMemo(() => caseReturnTarget(navSource), [navSource]);
  const backPath = returnTarget.path;

  // ── Foot pedal — real feature, per direct follow-up: "Foot pedal
  //    support specifically." The Grossing spec's own real 3-pedal
  //    scheme, wired to real, existing capabilities rather than new,
  //    parallel ones: Pedal 1 toggles the same real voice-listening
  //    state the mic button itself controls; Pedal 2 fires the same
  //    real PATHSCRIBE_NEXT_UNANSWERED event the "Next Unanswered"
  //    button already dispatches. Pedal 3 is genuinely two related
  //    actions on one button, chosen by real, current state — Pause
  //    while actively listening, Replay once already paused, since a
  //    single pedal press can only ever mean one or the other at any
  //    given moment. ──────────────────────────────────────────────
  const { isListening, toggleVoice, stopListening } = useVoice();
  const audioSegments = useAudioSegmentRecorder();
  const wasListeningRef = useRef(false);

  // Starts/stops the real, parallel audio-segment recorder in step
  // with the real dictation lifecycle — a new segment begins each
  // time listening (re)starts, so "the last segment" always means
  // whatever was most recently, actually dictated.
  useEffect(() => {
    if (isListening && !wasListeningRef.current) {
      audioSegments.startSegment();
    } else if (!isListening && wasListeningRef.current) {
      audioSegments.stopCapture();
    }
    wasListeningRef.current = isListening;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  useFootPedal({
    actions: {
      pedal1_pushToTalk: () => toggleVoice(),
      pedal2_nextField: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_NEXT_UNANSWERED')),
      pedal3_pauseReplay: () => {
        if (isListening) stopListening();
        else audioSegments.replayLastSegment();
      },
    },
  });

  // ── Case data ──────────────────────────────────────────────
  const [caseData, setCaseData]     = useState<Case | null>(null);
  useAutoBlockOrderDispatch(caseData, signingUser?.id ?? 'system');
  // Batch 465b: the warning a save or sign-out can ask the person to go past (totals that differ from their grid).
  const warningConfirm = useWarningConfirm();
  // Real optimistic-concurrency baseline — the version this session last
  // knew about, either from initial load or this session's own last
  // successful save. Passed as expectedVersion on every write; the server
  // (or mock service, locally) performs the actual atomic compare-and-swap
  // — this ref only needs to remember what THIS session last saw, not
  // perform the check itself. A ref, not state, since it's read at save
  // time and updated after saves, never needs to trigger a render.
  const knownVersionRef = useRef<number>(0);
  const [concurrencyConflict, setConcurrencyConflict] = useState<{ actualVersion: number; blockOverride?: boolean } | null>(null);
  // PS-71 (Batch 458, Pete: "We can't lose the user's changes"): a change
  // whose save stopped at the Edit Conflict dialog, with the values it was
  // built on. It is kept on the page, saved with the next draft save (merged
  // the same way), and saved by "Save mine anyway"; never dropped.
  const pendingPartsRef = useRef<{ parts: Partial<Case>; base: Partial<Case> } | null>(null);
  const [mergeReview, setMergeReview] = useState<MergeReview | null>(null);
  const caseDataRef = useRef<Case | null>(null);

  // Batch 572 (Pete): someone else saved this case while it is open — said at once, not at the next save.
  const caseUpdate = useCaseUpdateNotice(caseId, () => knownVersionRef.current, caseUpdateNoticeDeps);
  // PS-71 (Batch 458): View changes lists the parts of the case where this
  // copy differs from the version now saved, and which of them Overwrite
  // would replace (only the draft's own parts; everything else stays as saved).
  const [conflictRows, setConflictRows] = useState<ConflictRow[] | null>(null);
  const handleConcurrencyViewChanges = async () => {
    if (!caseData?.id) return;
    const latest = await caseRouter.getCase(caseData.id);
    if (!latest) return;
    setConflictRows(caseConflictRows(caseData, latest, [...Object.keys(caseDraftUpdates(caseData, orchSections)), ...Object.keys(pendingPartsRef.current?.parts ?? {})]));
  };
  const closeConcurrencyConflict = () => { setConcurrencyConflict(null); setConflictRows(null); };
  // "Save mine anyway": checked (case:edit-conflict:override: Pathologist,
  // Admin, Lab Director) and saved against the newest version, so a third
  // save landing meanwhile is caught too; audited in the service.
  const handleConcurrencyForceSave = async () => {
    if (!caseData?.id || !concurrencyConflict) { closeConcurrencyConflict(); return; }
    // The draft and any change that stopped at this dialog (PS-71: never dropped).
    const updates = { ...caseDraftUpdates(caseData, orchSections), ...(pendingPartsRef.current?.parts ?? {}) };
    const r = await overwriteAfterConflict({
      caseId: caseData.id, caseLabel: caseData.accession?.fullAccession ?? caseData.id, updates,
      changedFields: Object.keys(updates), actor: { id: signingUser?.id ?? 'unknown', name: signingUser?.name ?? '' },
    }, caseOverwriteDeps);
    if (r.ok === false) {
      if (r.reason === 'conflict') {
        const latest = await caseRouter.getCase(caseData.id);
        setConflictRows(null);
        setConcurrencyConflict({ actualVersion: latest?.version ?? concurrencyConflict.actualVersion });
        return;
      }
      showToast(tGrossingNav(r.reason === 'notPermitted' ? 'synopticReportPage.concurrency.overwriteNotPermitted' : 'synopticReportPage.concurrency.overwriteFailed'), 'warning');
      return;
    }
    // Take up the rest of the saved case (the other person's changes to other
    // parts) so the page's copy is the saved case before adopting its version.
    const saved = await caseRouter.getCase(caseData.id);
    if (saved && saved.version === r.version) {
      setCaseData(prev => (prev ? { ...saved, diagnostic: prev.diagnostic } as typeof prev : prev));
      knownVersionRef.current = r.version;
    }
    pendingPartsRef.current = null;
    clearDirty();
    showToast(tGrossingNav('synopticReportPage.toast.draftOverwroteOther'), 'warning');
    closeConcurrencyConflict();
  };

  // Phase 2 of the Inactivity Timeout & Draft Recovery spec. Caches the FULL case (not just synoptic answers --
  // this page has 18 distinct dirty-able things per its own markDirty()
  // call sites, from Priority to Case comments to Codes; an earlier,
  // narrower version of this only caught synoptic answers and would have
  // silently lost everything else). EXCLUDES `patient` specifically --
  // pure read-only master data from the LIS/EHR (name/DOB/MRN), never
  // edited on this page, and re-fetched fresh on restore rather than
  // risking overwriting updated demographics with a stale cached copy.
  // Moved up from its original location further down this file —
  // draftableCaseSlice, immediately below, needs it, and hooks can't
  // reference a const declared later in the same render pass. The
  // initializer itself ([]) has no dependency on anything declared
  // between here and its original position, so this move is safe.
  const [orchSections,    setOrchSections]    = useState<OrchestratorSection[]>([]);

  // Local-only restore -- no auto-persist to the server; see the restore
  // handler below.
  //
  // Real fix, per direct report: "draft not persistent (lost on
  // navigation/refresh)." Traced precisely — orchSections is genuinely
  // separate, local component state (useState below), never merged into
  // caseData at all, so it was never part of what this cache saved or
  // restored, even though every other one of this page's 18 dirty-able
  // things already was. Included here under a real, dedicated key
  // (never a real Case field, so it can't collide with one) — the
  // restore handler below extracts it back out separately rather than
  // spreading it into caseData.
  // PS-71 (Batch 458): the draft as this page last loaded or saved it (the
  // merge base, kept by useOrchestratorDraft), and the version it was built
  // on. Both travel with the browser copy, so a draft restored after a
  // reload or a crash is merged section by section onto whatever was saved
  // since, exactly like a refused save: never laid over someone else's newer
  // sections, and never lost.
  const draftBaseRef = useRef<Partial<Case>>({});
  const draftableCaseSlice = useMemo(() => {
    if (!caseData) return null;
    const { patient: _patient, ...rest } = caseData as any;
    return { ...rest, __orchSectionsDraft: orchSections, __draftBase: draftBaseRef.current, __draftVersion: knownVersionRef.current };
  }, [caseData, orchSections]);

  const { hasExistingDraft, existingDraftPayload, existingDraftSavedAt, confirmRestore, discardDraft } = useDraftCache(
    signingUser?.id ?? null,
    caseId ?? null,
    draftableCaseSlice,
  );

  // Real feature, per direct follow-up: "I thought we were display the
  // changes that would be applied to the case." draftableCaseSlice and
  // existingDraftPayload are the exact same shape (both caseData minus
  // patient, plus __orchSectionsDraft) — the real, apples-to-apples
  // comparison this needs, not a re-derivation of either side.
  const draftDiff = React.useMemo(
    () => computeDraftDiff(draftableCaseSlice as any, existingDraftPayload as any),
    [draftableCaseSlice, existingDraftPayload],
  );

  // Real fix, per direct question: "why does a case with no changes give
  // me a warning?" Traced precisely - the autosave in useDraftCache
  // writes a new draft on every real caseData reference change
  // (including normal load/hydration updates that don't reflect any
  // actual edit, since React state updates always produce a new object
  // reference even when the field values end up identical). The modal
  // itself was gated only on "does any draft exist," never on whether
  // computeDraftDiff's own, already-correct noise-filtered comparison
  // (see that file's own header comment) found anything real - so a
  // functionally-identical, no-op draft still triggered the prompt,
  // just to honestly report "no differences found" once shown. This
  // silently clears that exact no-op case rather than leaving it to
  // resurface on every future visit to this same case.
  useEffect(() => {
    if (hasExistingDraft && draftDiff.length === 0) discardDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasExistingDraft, draftDiff.length]);

  // ── Voice context activation ────────────────────────────────────────────────
  // This page — the entire SynopticReportPage tree, including whatever's
  // rendered while filling out a Grossing-flavored synoptic instance —
  // never called setCurrentContext at all. Worth being precise about
  // what was actually wrong: it's not that REPORTING-category commands
  // were built and dormant — checked directly, zero live SystemAction
  // records anywhere use category 'REPORTING'. The real 24 actions
  // already built for this page use category 'SYNOPTIC', which wasn't
  // even in the VOICE_CONTEXT enum until this fix. Whatever context the
  // previous page (almost always Worklist) last set just stayed stuck
  // the entire time anyone was on this page — same one-line pattern
  // every other page already uses, just never added to this one.
  useEffect(() => {
    actionRegistryService.setCurrentContext(VOICE_CONTEXT.SYNOPTIC);
    return () => { actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); };
  }, []);

  const [isLoaded, setIsLoaded]     = useState(false);
  const [caseNotFound, setCaseNotFound] = useState(false);
  const [activeTab, setActiveTab]       = useState('tumor');
  const { isDirty: hasUnsavedData, setDirty: setHasUnsavedData, pendingPath, confirmNavigate: confirmContextNavigate, cancelNavigate: cancelContextNavigate, registerSaveHandler, registerDiscardHandler } = useDirtyState();
  const [dirtySections, setDirtySections] = useState<Set<DirtySectionId>>(new Set());
  // Batch 573: who else has this case open (and whether they are editing); others see whether we have unsaved changes.
  const presenceSelf = useMemo(() => casePresenceSelf(signingUser), [signingUser]);
  // "Editing" only for the person's own changes, not the page setting itself up (services/cases/caseEditingSignal.ts).
  const [presenceEditing, setPresenceEditing] = useState(false);
  const casePresence = useCasePresence(caseId, presenceEditing, presenceSelf, caseUpdateNoticeDeps);

  // Batch 576: when the person first edited this case (null: not yet), for "editing" in presence and the
  // unsaved-changes warning; see services/cases/caseEditingSignal.ts.
  const editedAt = React.useRef<number | null>(null);
  const markDirty = React.useCallback((section: DirtySectionId) => {
    setHasUnsavedData(true);
    setDirtySections(prev => new Set(prev).add(section));
    if (isPersonsDirtySection(section)) {
      if (editedAt.current === null) editedAt.current = Date.now();
      setPresenceEditing(true);
    }
  }, [setHasUnsavedData]);

  // Phase 2 (Step B) restore handler -- local-only, no auto-persist (see
  // the hook-setup block above for why). Marks a single generic section
  // dirty rather than trying to detect exactly which of this page's 18
  // dirty-able things changed -- matches the simplified (non-diffing)
  // recovery design.
  const handleRestoreDraft = useCallback(() => {
    if (!caseData || !existingDraftPayload) return;
    // Real fix, per direct report: "draft not persistent (lost on
    // navigation/refresh)." __orchSectionsDraft isn't a real Case field
    // — pulled out separately here and applied via setOrchSections,
    // rather than spread into caseData where it would just become a
    // stray, meaningless property.
    const { __orchSectionsDraft, __draftBase, __draftVersion, version: _cachedVersion, ...caseFields } = existingDraftPayload as any;
    setCaseData({ ...caseData, ...caseFields } as typeof caseData);
    if (Array.isArray(__orchSectionsDraft)) setOrchSections(__orchSectionsDraft);
    // PS-71 (Batch 458): the restored draft carries what it was built on, so
    // its next save is checked against that version and merged section by
    // section onto anything saved since (the Edit Conflict dialog opens only
    // where both changed the same section). A draft cached before Batch 458
    // has neither: it is checked against the version loaded now.
    if (__draftBase && typeof __draftVersion === 'number') {
      draftBaseRef.current = __draftBase;
      knownVersionRef.current = __draftVersion;
    }
    markDirty('restoredDraft');
    confirmRestore();
  }, [caseData, existingDraftPayload, markDirty, confirmRestore]);

  const clearDirty = React.useCallback(() => {
    setHasUnsavedData(false);
    setDirtySections(new Set());
  }, [setHasUnsavedData]);

  // Lets FlagManagerModal/CaseTeamModal (and similar action-modals)
  // report their own local draft's dirty state into the SAME
  // dirtySections mechanism content fields already use -- critical that
  // this ADDS/REMOVES just its own named entry and recomputes
  // hasUnsavedData from the total remaining set, rather than blindly
  // setting true/false, otherwise closing a clean modal could wrongly
  // clear a warning that's still legitimately active for an unrelated
  // dirty content field.
  const setSectionDirty = React.useCallback((section: DirtySectionId, dirty: boolean) => {
    setDirtySections(prev => {
      const next = new Set(prev);
      dirty ? next.add(section) : next.delete(section);
      setHasUnsavedData(next.size > 0);
      return next;
    });
  }, [setHasUnsavedData]);

  // Stable references for the two action-modals below (FlagManagerModal,
  // CaseTeamModal) — a real, confirmed bug, not a style nit: these were
  // previously inline arrow functions created fresh on every render.
  // FlagManagerModal's own dirty-tracking useEffect has onDirtyChange in
  // its dependency array, so a fresh reference every render meant that
  // effect re-firing -> calling back into setSectionDirty -> this
  // component re-rendering -> a new onDirtyChange reference -> the
  // effect re-firing again, forever. Confirmed via live reproduction:
  // "Maximum update depth exceeded" thrown directly from
  // FlagManagerModal, with the modal's DOM elements continuously
  // detaching/remounting under the load. This is almost certainly the
  // real root cause behind the reported Flag Manager save/discard bug —
  // a component stuck re-rendering in a tight loop cannot reliably
  // process a click or keep its own state consistent.
  const handleFlagsDirtyChange = React.useCallback(
    (dirty: boolean) => setSectionDirty('flags', dirty), [setSectionDirty]);
  const handleTeamDirtyChange = React.useCallback(
    (dirty: boolean) => setSectionDirty('team', dirty), [setSectionDirty]);

  const [activeSpecimenId, setActiveSpecimenId] = useState<string>('');
  const [showCaseCommentModal, setShowCaseCommentModal] = useState(false);
  const [showRetentionHoldModal, setShowRetentionHoldModal] = useState(false);
  const [showCaseHoldModal, setShowCaseHoldModal] = useState(false);
  const [showSpecimenCommentModal, setShowSpecimenCommentModal] = useState(false);
  const [activeSpecimenCommentId, setActiveSpecimenCommentId] = useState<string>('');
  const caseComments: CaseComment[] = useMemo(() => (caseData as any)?.order?.caseComments ?? [], [caseData]);
  const hasCaseComment = caseComments.length > 0;
  // Fixed June 2026 — this used to be its own useState<Record<string,string>>,
  // never actually populated from caseData and never persisted anywhere,
  // meaning specimen comments didn't survive so much as a page refresh.
  // Derived directly from the real Specimen.comment field instead of
  // parallel state that could drift from it.
  const specimenComments = useMemo(() => {
    const map: Record<string, CaseComment[]> = {};
    (caseData?.specimens ?? []).forEach((sp: any) => { map[sp.id] = sp.comments ?? []; });
    return map;
  }, [caseData?.specimens]);

  // Batch 476 (PS-261 follow-up, Module 4) — the real, unified autopsy
  // case timeline, derived fresh from the case's own autopsy record
  // every render (buildAutopsyCaseTimeline.ts is a pure read-model,
  // never a second, persisted copy of these events).
  const autopsyTimeline = useMemo(() => buildAutopsyCaseTimeline(caseData?.autopsy), [caseData?.autopsy]);

  // ── Fixation-time signout gate ──────────────────────────────────────────────
  const { dictionary: specimenDictionary } = useSpecimenDictionary();
  const [fixativeGateSpecimens, setFixativeGateSpecimens] = useState<FixativeGateSpecimen[] | null>(null);
  // Real, per PS-289/PS-292's own Gating Strategy — see
  // checkStainQcGate.ts's own header for the full reasoning.
  const [stainQcGateBlocking, setStainQcGateBlocking] = useState<StainQcGateBlockingItem[] | null>(null);
  // Batch 439 (PS-145, PS-144): a mismatch to decide, or the peer-review
  // gate, stopped sign-out (checkPeerReviewAndMismatch.ts).
  const [clinicalMismatch, setClinicalMismatch] = useState<ClinicalMismatchAssessment | null>(null);
  const [peerReviewGate, setPeerReviewGate] = useState<PeerReviewStatus | null>(null);
  // Batch 484 (Structured Inking Sign-Out & Grossing Gate Logic Engine;
  // PS-519 follow-up). Gate B — checkInkingSignOutGate.ts's own result,
  // same resume shape as clinicalMismatch/peerReviewGate above.
  const [inkingGateBlocking, setInkingGateBlocking] = useState<InkingGateResult | null>(null);
  // Real, per direct follow-up: "Begin AutopsyAuthorizationCompletionForm.tsx
  // persistence — hands back updated data, nothing saves it." Investigation
  // found a deeper, real gap this closes: neither this form nor
  // resolveAutopsyGrossExaminationGate.ts had any real UI caller
  // anywhere in the app — the whole completion workflow (gate check,
  // form, persistence) was built and unit-tested but never actually
  // mounted. This is that real mounting point.
  const [showAutopsyAuthCompletion, setShowAutopsyAuthCompletion] = useState(false);
  // Real, per direct follow-up: "AutopsyBodyReleaseForm.tsx's
  // mounting" — same real, previously-unmounted gap as the
  // authorization completion form above, now closed the same way.
  const [showAutopsyBodyRelease, setShowAutopsyBodyRelease] = useState(false);
  // Batch 468 (PS-261 §2.4.3) — the custody-transfer mini-form's open
  // state and draft fields. Presentational only: recordAutopsyCustodyTransfer.ts
  // decides everything (capability, forensic-only gate, who it's from).
  const [showAutopsyCustodyForm, setShowAutopsyCustodyForm] = useState(false);
  // Batch 475 (PS-261 follow-up) — optionally ties this transfer to one
  // toxicology order (AutopsyCustodyTransferEvent.toxicologyOrderId), so
  // a specimen's own chain of custody shows under its order too, not
  // just in this case-wide log. null = not about a toxicology specimen.
  const [custodyForm, setCustodyForm] = useState<{ itemDescription: string; toCustodianType: AutopsyCustodianType; toCustodianName: string; releasedByName: string; receivedByName: string; notes: string; toxicologyOrderId: string | null }>({
    itemDescription: '', toCustodianType: 'medical_examiner', toCustodianName: '', releasedByName: '', receivedByName: '', notes: '', toxicologyOrderId: null,
  });
  const [submittingCustodyTransfer, setSubmittingCustodyTransfer] = useState(false);
  // Batch 478 (PS-261 follow-up) — the per-organ tag mini-form's open
  // state and draft fields. Presentational only: recordAutopsyOrganTag.ts
  // decides everything (capability, who recorded it, append-only log).
  const [showOrganTagForm, setShowOrganTagForm] = useState(false);
  const [organTagForm, setOrganTagForm] = useState<{ organCode: AutopsyOrganCode; status: AutopsyOrganTagStatus; finding: string }>({
    organCode: 'heart', status: 'normal', finding: '',
  });
  const [submittingOrganTag, setSubmittingOrganTag] = useState(false);
  // Batch 469 (PS-261 §2.5.1 follow-up) — consent narrowing/revocation
  // mini-form's open state and draft fields. Presentational only:
  // recordAutopsyConsentStatusChange.ts decides everything (capability,
  // hospital-consented-only gate, never widening consent back).
  const [showAutopsyConsentForm, setShowAutopsyConsentForm] = useState(false);
  const [consentForm, setConsentForm] = useState<{ status: HospitalConsentStatus; excludedOrgans: AutopsyOrganCode[]; retentionPermitted: boolean; revocationNote: string }>({
    status: 'narrowed', excludedOrgans: [], retentionPermitted: true, revocationNote: '',
  });
  const [submittingConsentChange, setSubmittingConsentChange] = useState(false);
  // Batch 469 (PS-261 §2.4.2) — organ/tissue retention disposal
  // recording's open state and draft fields. Only ever shown once an
  // HTA-applicable jurisdiction has a retention tier beyond
  // tier_0_no_retention on file — resolveHtaApplicability.ts and
  // recordAutopsyOrganRetentionDisposal.ts enforce the same gate.
  const [showAutopsyDisposalForm, setShowAutopsyDisposalForm] = useState(false);
  const [disposalForm, setDisposalForm] = useState<{ disposalMethod: OrganRetentionDisposalRecord['disposalMethod']; certificateReference: string }>({
    disposalMethod: 'cremation', certificateReference: '',
  });
  const [submittingDisposal, setSubmittingDisposal] = useState(false);
  // Batch 469 (PS-261 §2.3) — toxicology order/result mini-forms'
  // open state and draft fields. orderAutopsyToxicology.ts and
  // recordAutopsyToxicologyResult.ts decide everything else.
  const [showAutopsyToxOrderForm, setShowAutopsyToxOrderForm] = useState(false);
  const [toxOrderForm, setToxOrderForm] = useState<{ specimenDescription: string; specimenBarcode: string; analytesRequested: string; labName: string }>({
    specimenDescription: '', specimenBarcode: '', analytesRequested: '', labName: '',
  });
  const [submittingToxOrder, setSubmittingToxOrder] = useState(false);
  const [toxResultOrderId, setToxResultOrderId] = useState<string | null>(null);
  const [toxResultSummary, setToxResultSummary] = useState('');
  const [submittingToxResult, setSubmittingToxResult] = useState(false);
  // Batch 471 (PS-261 follow-up) — cancelling a still-'ordered'
  // toxicology order. cancelAutopsyToxicologyOrder.ts decides
  // everything else (eligibility, clearing the ancillary hold).
  const [toxCancelOrderId, setToxCancelOrderId] = useState<string | null>(null);
  const [toxCancelReason, setToxCancelReason] = useState('');
  const [submittingToxCancel, setSubmittingToxCancel] = useState(false);
  // Batch 471 (PS-261 follow-up) — recording who holds retained
  // organs/tissue and where, while retention is ongoing. Same gate as
  // the disposal form (HTA-applicable jurisdiction, tier beyond
  // tier_0_no_retention). Opening the form seeds from the current
  // record, same reasoning as the consent form below: an edit should
  // start from what's on file, not a blank slate.
  const [showAutopsyRetentionDetailForm, setShowAutopsyRetentionDetailForm] = useState(false);
  const [retentionDetailForm, setRetentionDetailForm] = useState<{ recipientName: string; location: string; reason: string }>({
    recipientName: '', location: '', reason: '',
  });
  const [submittingRetentionDetail, setSubmittingRetentionDetail] = useState(false);
  // Batch 472 — a free-text reason for the organRetentionTier
  // selection itself (distinct from the retention-detail form's own
  // `reason`, which is about who holds it and where). Local draft so
  // typing doesn't save on every keystroke; committed on blur via the
  // same handleOrganRetentionTierChange save path the tier select
  // already uses.
  const [retentionTierReasonDraft, setRetentionTierReasonDraft] = useState('');
  useEffect(() => {
    setRetentionTierReasonDraft(caseData?.autopsy?.organRetentionTierReason ?? '');
  }, [caseData?.id, caseData?.autopsy?.organRetentionTierReason]);
  // Batch 471 (PS-261 follow-up) — reinstating an already-narrowed or
  // revoked consent. Its own mini-form, deliberately separate from the
  // narrowing one above: recordAutopsyConsentReinstatement.ts is a
  // different capability from recordAutopsyConsentStatusChange.ts, and
  // the two actions should never share UI state.
  const [showAutopsyConsentReinstateForm, setShowAutopsyConsentReinstateForm] = useState(false);
  const [reinstateForm, setReinstateForm] = useState<{ status: HospitalConsentStatus; excludedOrgans: AutopsyOrganCode[]; retentionPermitted: boolean; reinstatementNote: string }>({
    status: 'active', excludedOrgans: [], retentionPermitted: true, reinstatementNote: '',
  });
  const [submittingReinstate, setSubmittingReinstate] = useState(false);
  const [signingAutopsyTier, setSigningAutopsyTier] = useState<'PAD' | 'FAD' | null>(null);
  // Batch 478: the gross-exam authorization gate's own override — a
  // written reason, prompted for before the existing signature-confirm
  // modal, then carried through to handleSignAutopsyReport/signAutopsyReport.ts.
  const [showGateOverridePrompt, setShowGateOverridePrompt] = useState<'PAD' | 'FAD' | null>(null);
  const [gateOverrideReason, setGateOverrideReason] = useState<string | null>(null);
  // Batch 344: a PAD/FAD signature waits for the signer to be confirmed.
  const [confirmingAutopsyTier, setConfirmingAutopsyTier] = useState<'PAD' | 'FAD' | null>(null);
  // ── Pre-analytic date (collection/receipt) signout gate — real, per
  // direct guidance's own cross-jurisdiction compliance research. Same
  // real "own state, threaded through the sign-out hook" shape as
  // fixativeGateSpecimens above.
  const [preAnalyticDateGateSpecimens, setPreAnalyticDateGateSpecimens] = useState<PreAnalyticDateGateSpecimen[] | null>(null);
  // Remembers what finalizeCase was originally called with, so once the
  // gate is resolved we can retry with the exact same arguments rather
  // than losing e.g. which synoptic instances were excluded.
  const [pendingFinalizeArgs, setPendingFinalizeArgs] = useState<string[]>([]);
  // Real, per direct guidance (retiring Finalize for Orchestration
  // Mode, moving its own pre-analytic/fixative gates onto
  // handleSignOutConfirm() too, for Assist Mode's still-active
  // Finalize AND Orchestration's Sign Out Case to share): these two
  // gate modals are now genuinely reachable from two different real
  // flows — this remembers which one to resume once the gate is
  // resolved, since finalizeCase(args) and handleSignOutConfirm()
  // have different real signatures (excludedInstanceIds vs. none).
  const [pendingActionIsSignOut, setPendingActionIsSignOut] = useState(false);

  // ── Priority editing ─────────────────────────────────────────────────────────
  // Closes a real gap: priority was set once at Accession with no edit
  // mechanism anywhere else in the app. Gated off once the case is
  // finalized/closed — changing urgency no longer means anything once a
  // case is signed out.
  const [priorityLevels, setPriorityLevels] = useState<{ id: string; label: string; colorHint: string }[]>([]);
  useEffect(() => {
    priorityService.getAll().then(res => { if (res.ok) setPriorityLevels(res.data.filter(p => p.isActive)); });
  }, []);
  const canEditPriority = caseData && caseData.status !== 'finalized' && caseData.status !== 'closed';
  const handleChangePriority = useCallback(async (newPriority: string) => {
    if (!caseData?.id) return;
    const patch = { order: { ...caseData.order, priority: newPriority as any } };
    try {
      await savePagePatch(caseData.id, patch as any);
      setCaseData(prev => prev ? ({ ...prev, ...patch } as typeof prev) : prev);
      markDirty('priority');
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        setConcurrencyConflict({ actualVersion: e.actualVersion });
        return;
      }
      console.error('[Priority] Failed to persist:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- savePagePatch is declared further down (listing it here would read it before it exists); it only depends on the signing user, who names the audit entry
  }, [caseData, markDirty]);

  // ── Deficiency history ──────────────────────────────────────────────────────
  // getByCaseId() already existed on ISpecimenDeficiencyService with zero
  // UI ever calling it — both this page and Accession only ever wrote
  // deficiency records, never read them back. Fetched once the case
  // loads; deliberately not re-fetched on every render since deficiency
  // history for an already-loaded case doesn't change from anything this
  // page itself does (both pages only write at accession/sign-out time).
  // Batch 577 (carried from 575): bumped when the page takes up someone else's saved version (Show their
  // changes, Use their version, a merge review), so what is read once when the case opens is read again:
  // deficiencies, versions, signatures, the change log, the follow-up mark, the LIS amendment notice, the
  // amendment banner, the report's resolved context (preview and PDF) and the synoptic form's answers.
  const [takenUpKey, setTakenUpKey] = useState(0);
  const [caseDeficiencies, setCaseDeficiencies] = useState<SpecimenDeficiency[]>([]);
  const [deficiencyTypes, setDeficiencyTypes] = useState<DeficiencyType[]>([]);
  const [resolutionTypes, setResolutionTypes] = useState<ResolutionType[]>([]);
  const [showDeficiencyModal, setShowDeficiencyModal] = useState(false);
  // Real fix, Phase 5: real version history — see VersionHistoryModal.tsx's
  // own header comment. Fetched on real case load (for the chip's initial
  // count) AND re-fetched whenever the modal opens (for freshness) - unlike
  // deficiencies above, THIS page is itself the real source of new versions
  // (every sign-out/amendment release creates one), so a load-time-only
  // fetch would miss a version created earlier in the current session.
  const [caseVersions, setCaseVersions] = useState<ReportVersionRecord[]>([]);
  // Batch 558: the API server's list of versions couldn't be read (the list may be incomplete).
  const [caseVersionsPartial, setCaseVersionsPartial] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  // Batch 483 (PS-359 tracker follow-up — "signature-record viewing screen"):
  // services/signatures/ has recorded every signature applied to this case
  // since Batch 345 with no screen ever reading it back. Same real-source
  // fetch pattern as caseVersions above — this page's own signing/finalize/
  // release/countersign actions are what create new records, so re-fetch on
  // load AND whenever the modal opens, not load-time-only.
  const [caseSignatures, setCaseSignatures] = useState<SignatureRecord[]>([]);
  const [showSignatureHistoryModal, setShowSignatureHistoryModal] = useState(false);
  const [showBlockEditor, setShowBlockEditor] = useState(false);
  // Real feature, per direct follow-up: "decant-level linking UI. In
  // the same UI we add specimens, blocks stains, protocols?" Real,
  // simple, id-based sibling to focusedBlockIndex — a decant never
  // needed the same index-based next/previous voice-command
  // navigation blocks have, so a plain id is enough.
  const [focusedDecantId, setFocusedDecantId] = useState<string | null>(null);
  useEffect(() => {
    if (!caseData?.id) return;
    let live = true;
    specimenDeficiencyService.getByCaseId(caseData.id).then(res => { if (live && res.ok) setCaseDeficiencies(res.data); });
    return () => { live = false; };
  }, [caseData?.id, takenUpKey]);
  useEffect(() => {
    if (!caseData?.id) return;
    let live = true;
    reportVersionService.getByCaseId(caseData.id).then(res => {
      if (!live) return;
      if (res.ok) { setCaseVersions(res.data); setCaseVersionsPartial(!!res.meta?.partial); } else { setCaseVersions([]); setCaseVersionsPartial(true); }
    });
    return () => { live = false; };
  }, [caseData?.id, showVersionHistoryModal, takenUpKey]);
  useEffect(() => {
    if (!caseData?.id) return;
    let live = true;
    signatureRecordService.getByCaseId(caseData.id).then(res => { if (live && res.ok) setCaseSignatures(res.data); });
    return () => { live = false; };
  }, [caseData?.id, showSignatureHistoryModal, takenUpKey]);
  // Batch 368 (PS-353): the report's change log, refreshed whenever an entry
  // is recorded for this case (the store announces each one).
  const [changeEntries, setChangeEntries] = useState<ReportChangeEntry[]>([]);
  const [showChangeHistory, setShowChangeHistory] = useState(false);
  useEffect(() => {
    if (!caseData?.id) return;
    const caseId = caseData.id;
    const refresh = () => { reportChangeLogService.listForCase(caseId).then(res => { if (res.ok) setChangeEntries(res.data); }); };
    refresh();
    const onLogged = (e: Event) => { if ((e as CustomEvent<{ caseId: string }>).detail?.caseId === caseId) refresh(); };
    window.addEventListener(REPORT_CHANGE_LOGGED_EVENT, onLogged);
    return () => window.removeEventListener(REPORT_CHANGE_LOGGED_EVENT, onLogged);
  }, [caseData?.id, takenUpKey]);
  useEffect(() => {
    deficiencyTypeService.getAll().then(res => { if (res.ok) setDeficiencyTypes(res.data); });
    resolutionTypeService.getAll().then(res => { if (res.ok) setResolutionTypes(res.data); });
  }, []);

  const [showAddSynopticModal,  setShowAddSynopticModal]  = useState(false);
  const [showSpecimenEdit,      setShowSpecimenEdit]      = useState(false);
  const [showCreateBiopsyArrayModal, setShowCreateBiopsyArrayModal] = useState(false);
  // Real, architectural fix, per direct follow-up: "the matrix block
  // itself is the tracked asset." Renamed from
  // editingBiopsyArrayCassetteId — now holds the real, internal
  // MatrixBlock.id, not the human-typed cassette label (those are
  // separate fields now; see types/case/MatrixBlock.ts).
  const [editingMatrixBlockId, setEditingMatrixBlockId] = useState<string | null>(null);
  // Real, separate state for the new, real status/piece editor
  // (MatrixBlockEditorModal.tsx) — distinct from editingMatrixBlockId
  // above, which drives the membership editor (CreateBiopsyArrayModal
  // in edit mode). Opening the status/piece editor doesn't imply
  // editing membership, and vice versa.
  const [viewingMatrixBlockId, setViewingMatrixBlockId] = useState<string | null>(null);
  const [editingSpecimen,       setEditingSpecimen]        = useState<import('@/types/case/Specimen').Specimen | null>(null);
  const [showAddOrdersModal,    setShowAddOrdersModal]     = useState(false);
  const [addOrdersInitialTab,   setAddOrdersInitialTab]     = useState<OrderTab | undefined>(undefined);

  const { toastMsg, toastKind, toastVisible, toastContainsPhi, showToast, dismissToast } = useSynopticToast();
  const notifyLabelPrinterNotConnected = useCallback(() => showToast(tGrossingNav('synopticReportPage.toast.labelPrinterNotConnected'), 'warning'), [showToast, tGrossingNav]);
  useLabelBridgeNotice(notifyLabelPrinterNotConnected);

  // Batch 468 (PS-261 §2.4.3) — submits the custody-transfer mini-form.
  // Moved here (after showToast exists) from the form's own state block above.
  const signingUserName = signingUser?.name ?? '';
  const handleCustodyTransferSubmit = useCallback(async () => {
    if (!caseData?.id) return;
    setSubmittingCustodyTransfer(true);
    try {
      const result = await recordAutopsyCustodyTransfer(caseData.id, {
        itemDescription: custodyForm.itemDescription,
        toCustodianType: custodyForm.toCustodianType,
        toCustodianName: custodyForm.toCustodianName,
        releasedByName: custodyForm.releasedByName,
        receivedByName: custodyForm.receivedByName || undefined,
        notes: custodyForm.notes || undefined,
        toxicologyOrderId: custodyForm.toxicologyOrderId ?? undefined,
      }, signingUserName);
      if (!result.ok) {
        // Real, per the standing i18n rule — result.error is a
        // developer-facing literal-English fallback, never shown
        // directly; the reasonCode maps to a translated message.
        const reasonKey = result.reasonCode ? `synopticReportPage.autopsy.custody.errors.${result.reasonCode}` : undefined;
        showToast(reasonKey ? tGrossingNav(reasonKey) : tGrossingNav('synopticReportPage.autopsy.custody.transferFailed'), 'warning');
        return;
      }
      const refreshed = await caseRouter.getCase(caseData.id);
      if (refreshed) setCaseData(refreshed);
      setShowAutopsyCustodyForm(false);
      setCustodyForm({ itemDescription: '', toCustodianType: 'medical_examiner', toCustodianName: '', releasedByName: '', receivedByName: '', notes: '', toxicologyOrderId: null });
      showToast(tGrossingNav('synopticReportPage.autopsy.custody.transferRecorded'));
    } finally {
      setSubmittingCustodyTransfer(false);
    }
  }, [caseData?.id, custodyForm, signingUserName, setCaseData, showToast, tGrossingNav]);

  // Batch 478 (PS-261 follow-up) — per-organ gross-exam tagging. Same
  // presentational-only shape as the custody transfer form above:
  // recordAutopsyOrganTag.ts decides everything (capability, who recorded
  // it, append-only persistence).
  const handleOrganTagSubmit = useCallback(async () => {
    if (!caseData?.id) return;
    setSubmittingOrganTag(true);
    try {
      const result = await recordAutopsyOrganTag(caseData.id, {
        organCode: organTagForm.organCode,
        status: organTagForm.status,
        finding: organTagForm.finding || undefined,
      }, signingUserName);
      if (!result.ok) {
        const reasonKey = result.reasonCode ? `synopticReportPage.autopsy.organTag.errors.${result.reasonCode}` : undefined;
        showToast(reasonKey ? tGrossingNav(reasonKey) : tGrossingNav('synopticReportPage.autopsy.organTag.tagFailed'), 'warning');
        return;
      }
      const refreshed = await caseRouter.getCase(caseData.id);
      if (refreshed) setCaseData(refreshed);
      setShowOrganTagForm(false);
      setOrganTagForm({ organCode: 'heart', status: 'normal', finding: '' });
      showToast(tGrossingNav('synopticReportPage.autopsy.organTag.tagRecorded'));
    } finally {
      setSubmittingOrganTag(false);
    }
  }, [caseData?.id, organTagForm, signingUserName, setCaseData, showToast, tGrossingNav]);

  // Batch 469 (PS-261 §2.5.1 follow-up) — submits the consent
  // narrowing/revocation mini-form.
  const handleConsentStatusChangeSubmit = useCallback(async () => {
    if (!caseData?.id) return;
    setSubmittingConsentChange(true);
    try {
      const result = await recordAutopsyConsentStatusChange(caseData.id, {
        status: consentForm.status,
        excludedOrgans: consentForm.excludedOrgans,
        retentionPermitted: consentForm.retentionPermitted,
        revocationNote: consentForm.revocationNote || undefined,
      }, signingUserName);
      if (!result.ok) {
        const reasonKey = result.reasonCode ? `synopticReportPage.autopsy.consent.errors.${result.reasonCode}` : undefined;
        showToast(reasonKey ? tGrossingNav(reasonKey) : tGrossingNav('synopticReportPage.autopsy.consent.changeFailed'), 'warning');
        return;
      }
      const refreshed = await caseRouter.getCase(caseData.id);
      if (refreshed) setCaseData(refreshed);
      setShowAutopsyConsentForm(false);
      setConsentForm({ status: 'narrowed', excludedOrgans: [], retentionPermitted: true, revocationNote: '' });
      showToast(tGrossingNav('synopticReportPage.autopsy.consent.changeRecorded'));
    } finally {
      setSubmittingConsentChange(false);
    }
  }, [caseData?.id, consentForm, signingUserName, setCaseData, showToast, tGrossingNav]);

  // Batch 469 (PS-261 §2.4.2) — submits the organ-retention disposal form.
  const handleOrganRetentionDisposalSubmit = useCallback(async () => {
    if (!caseData?.id) return;
    setSubmittingDisposal(true);
    try {
      const result = await recordAutopsyOrganRetentionDisposal(caseData.id, {
        disposalMethod: disposalForm.disposalMethod,
        certificateReference: disposalForm.certificateReference,
      }, signingUserName);
      if (!result.ok) {
        const reasonKey = result.reasonCode ? `synopticReportPage.autopsy.disposal.errors.${result.reasonCode}` : undefined;
        showToast(reasonKey ? tGrossingNav(reasonKey) : tGrossingNav('synopticReportPage.autopsy.disposal.recordFailed'), 'warning');
        return;
      }
      const refreshed = await caseRouter.getCase(caseData.id);
      if (refreshed) setCaseData(refreshed);
      setShowAutopsyDisposalForm(false);
      setDisposalForm({ disposalMethod: 'cremation', certificateReference: '' });
      showToast(tGrossingNav('synopticReportPage.autopsy.disposal.recorded'));
    } finally {
      setSubmittingDisposal(false);
    }
  }, [caseData?.id, disposalForm, signingUserName, setCaseData, showToast, tGrossingNav]);

  // Batch 469 (PS-261 §2.3) — submits the toxicology order form.
  const handleToxicologyOrderSubmit = useCallback(async () => {
    if (!caseData?.id) return;
    setSubmittingToxOrder(true);
    try {
      const result = await orderAutopsyToxicology(caseData.id, {
        specimenDescription: toxOrderForm.specimenDescription,
        specimenBarcode: toxOrderForm.specimenBarcode,
        analytesRequested: toxOrderForm.analytesRequested,
        labName: toxOrderForm.labName,
      }, signingUserName);
      if (!result.ok) {
        const reasonKey = result.reasonCode ? `synopticReportPage.autopsy.toxicology.orderErrors.${result.reasonCode}` : undefined;
        showToast(reasonKey ? tGrossingNav(reasonKey) : tGrossingNav('synopticReportPage.autopsy.toxicology.orderFailed'), 'warning');
        return;
      }
      const refreshed = await caseRouter.getCase(caseData.id);
      if (refreshed) setCaseData(refreshed);
      setShowAutopsyToxOrderForm(false);
      setToxOrderForm({ specimenDescription: '', specimenBarcode: '', analytesRequested: '', labName: '' });
      showToast(tGrossingNav('synopticReportPage.autopsy.toxicology.orderPlaced'));
    } finally {
      setSubmittingToxOrder(false);
    }
  }, [caseData?.id, toxOrderForm, signingUserName, setCaseData, showToast, tGrossingNav]);

  // Batch 469 (PS-261 §2.3) — submits a result for an existing order.
  const handleToxicologyResultSubmit = useCallback(async () => {
    if (!caseData?.id || !toxResultOrderId) return;
    setSubmittingToxResult(true);
    try {
      const result = await recordAutopsyToxicologyResult(caseData.id, {
        orderId: toxResultOrderId,
        resultSummary: toxResultSummary,
      }, signingUserName);
      if (!result.ok) {
        const reasonKey = result.reasonCode ? `synopticReportPage.autopsy.toxicology.resultErrors.${result.reasonCode}` : undefined;
        showToast(reasonKey ? tGrossingNav(reasonKey) : tGrossingNav('synopticReportPage.autopsy.toxicology.resultFailed'), 'warning');
        return;
      }
      const refreshed = await caseRouter.getCase(caseData.id);
      if (refreshed) setCaseData(refreshed);
      setToxResultOrderId(null);
      setToxResultSummary('');
      showToast(tGrossingNav('synopticReportPage.autopsy.toxicology.resultRecorded'));
    } finally {
      setSubmittingToxResult(false);
    }
  }, [caseData?.id, toxResultOrderId, toxResultSummary, signingUserName, setCaseData, showToast, tGrossingNav]);

  // Batch 471 (PS-261 follow-up) — submits the toxicology order cancellation.
  const handleToxicologyCancelSubmit = useCallback(async () => {
    if (!caseData?.id || !toxCancelOrderId) return;
    setSubmittingToxCancel(true);
    try {
      const result = await cancelAutopsyToxicologyOrder(caseData.id, {
        orderId: toxCancelOrderId,
        cancelReason: toxCancelReason,
      }, signingUserName);
      if (!result.ok) {
        const reasonKey = result.reasonCode ? `synopticReportPage.autopsy.toxicology.cancelOrderErrors.${result.reasonCode}` : undefined;
        showToast(reasonKey ? tGrossingNav(reasonKey) : tGrossingNav('synopticReportPage.autopsy.toxicology.cancelOrderFailed'), 'warning');
        return;
      }
      const refreshed = await caseRouter.getCase(caseData.id);
      if (refreshed) setCaseData(refreshed);
      setToxCancelOrderId(null);
      setToxCancelReason('');
      showToast(tGrossingNav('synopticReportPage.autopsy.toxicology.orderCancelled'));
    } finally {
      setSubmittingToxCancel(false);
    }
  }, [caseData?.id, toxCancelOrderId, toxCancelReason, signingUserName, setCaseData, showToast, tGrossingNav]);

  // Batch 471 (PS-261 follow-up) — submits the organ-retention detail form.
  const handleOrganRetentionDetailSubmit = useCallback(async () => {
    if (!caseData?.id) return;
    setSubmittingRetentionDetail(true);
    try {
      const result = await recordAutopsyOrganRetentionDetail(caseData.id, {
        recipientName: retentionDetailForm.recipientName,
        location: retentionDetailForm.location,
        reason: retentionDetailForm.reason || undefined,
      }, signingUserName);
      if (!result.ok) {
        const reasonKey = result.reasonCode ? `synopticReportPage.autopsy.retentionDetail.errors.${result.reasonCode}` : undefined;
        showToast(reasonKey ? tGrossingNav(reasonKey) : tGrossingNav('synopticReportPage.autopsy.retentionDetail.recordFailed'), 'warning');
        return;
      }
      const refreshed = await caseRouter.getCase(caseData.id);
      if (refreshed) setCaseData(refreshed);
      setShowAutopsyRetentionDetailForm(false);
      showToast(tGrossingNav('synopticReportPage.autopsy.retentionDetail.recorded'));
    } finally {
      setSubmittingRetentionDetail(false);
    }
  }, [caseData?.id, retentionDetailForm, signingUserName, setCaseData, showToast, tGrossingNav]);

  // Batch 471 (PS-261 follow-up) — submits the consent reinstatement form.
  const handleConsentReinstateSubmit = useCallback(async () => {
    if (!caseData?.id) return;
    setSubmittingReinstate(true);
    try {
      const result = await recordAutopsyConsentReinstatement(caseData.id, {
        status: reinstateForm.status,
        excludedOrgans: reinstateForm.excludedOrgans,
        retentionPermitted: reinstateForm.retentionPermitted,
        reinstatementNote: reinstateForm.reinstatementNote,
      }, signingUserName);
      if (!result.ok) {
        const reasonKey = result.reasonCode ? `synopticReportPage.autopsy.consent.reinstateErrors.${result.reasonCode}` : undefined;
        showToast(reasonKey ? tGrossingNav(reasonKey) : tGrossingNav('synopticReportPage.autopsy.consent.reinstateFailed'), 'warning');
        return;
      }
      const refreshed = await caseRouter.getCase(caseData.id);
      if (refreshed) setCaseData(refreshed);
      setShowAutopsyConsentReinstateForm(false);
      setReinstateForm({ status: 'active', excludedOrgans: [], retentionPermitted: true, reinstatementNote: '' });
      showToast(tGrossingNav('synopticReportPage.autopsy.consent.reinstateRecorded'));
    } finally {
      setSubmittingReinstate(false);
    }
  }, [caseData?.id, reinstateForm, signingUserName, setCaseData, showToast, tGrossingNav]);

  const {
    sendMaterialOrderToLis,
    sendSynopticReportToLis,
    handleSendStainOrder,
    showCopilotReportView, setShowCopilotReportView,
    pendingLisNotice, setPendingLisNotice,
    handleMarkReviewedNoChanges,
    simulateLisAmendmentReceived,
    simulateBlockExceptionReceived,
    simulateMaterialLocationReceived,
    simulateCassetteDispatchOutcomeReceived,
    simulateFullMaterialTreeLocationUpdate,
    copilotReportInstances,
    openCopilotReportView,
  } = useLisIntegration({ caseData, setCaseData, signingUser, showToast, refreshKey: takenUpKey });

  // Real fix, per direct follow-up: "the tracking event should occur
  // no matter what page your on in pathscribe, just need access to
  // the NavBar Scan." The real scan-matching/dispatch logic moved to
  // useGlobalMaterialScanTracking.ts, mounted once at the app root
  // (MaterialScanTrackingBridge, App.tsx) — never tied to this page
  // being open at all. This page only listens for that hook's own
  // real "a scan just updated some case's material" notification and
  // refreshes + shows a toast when — and only when — it's genuinely
  // about the exact case currently open here; a scan tracked while
  // viewing a different case (or no case at all) correctly does
  // nothing on this page.
  useEffect(() => {
    const listener = (e: Event) => {
      const detail = (e as CustomEvent<{ caseId: string; targetDescription: string; stationName: string; resolvedCassettes?: number }>).detail;
      if (!detail || !caseData || detail.caseId !== caseData.id) return;
      caseRouter.getCase(caseData.id).then(refreshed => {
        if (refreshed) setCaseData(refreshed);
      });
      showToast(detail.resolvedCassettes !== undefined
        ? tGrossingNav('synopticReportPage.toast.cassettesResolved', { specimen: detail.targetDescription, count: detail.resolvedCassettes })
        : tGrossingNav('synopticReportPage.toast.materialScanned', { target: detail.targetDescription, station: detail.stationName }));
    };
    window.addEventListener(MATERIAL_SCAN_UPDATED_EVENT, listener);
    return () => window.removeEventListener(MATERIAL_SCAN_UPDATED_EVENT, listener);
  }, [caseData, setCaseData, showToast, tGrossingNav]);

  // Real fix, per direct follow-up: "I would like to support both
  // slide engraving and printed labels." Resolved here, once, and
  // passed into useSpecimenBlockManagement as a plain value — see
  // that hook's own UseSpecimenBlockManagementParams doc comment for
  // why useSpecimenBlockManagement itself never calls
  // useEffectiveScanStation() directly.
  const { effectiveStationId } = useEffectiveScanStation();

  const {
    allBlocks,
    allDecants,
    setFocusedBlockIndex,
    focusedBlockEntry,
    handleAdvanceFocusedBlockStatus,
    handleConfirmTriage,
    handleOverrideTriage,
    handleConfirmTriageChecklistItem,
    handleUpdateBlock,
    handleCancelBlock,
    handleDeleteBlock,
    canDeleteBlocks,
    blockDeleteTier,
    handleFlagBlock,
    canFlagBlocks,
    handleCreateSpareSlide,
    handleOrderRestain,
    handleAddBlock,
    handleReleaseGrossingBlocks,
    handleRemovePendingBlock,
    handleAddDecant,
    handleUpdateDecant,
    handleDeleteDecant,
    handleCreateBiopsyArray,
    handleUpdateBiopsyArray,
    handleDissolveBiopsyArray,
    handleUpdateMatrixBlock,
    handleOrderTargetedMatrixStain,
    printCassetteForBlock,
    printMatrixCassette,
    printSlideForStain,
    handleBatchPrintSlides,
    handleBatchPrintCassettes,
    batchPrintBlocked,
    pendingCassetteVerification,
  } = useSpecimenBlockManagement({
    caseData, setCaseData, signingUser, markDirty, knownVersionRef,
    setConcurrencyConflict, sendMaterialOrderToLis, showToast,
    effectiveStationId,
  });

  // Real feature, per direct follow-up: "proceed with the decant
  // container label." Defined here (not inside useSpecimenBlockManagement)
  // since it's purely a print action with no case-state mutation —
  // same real reasoning as the existing onReprintContainer handler a
  // few hundred lines below, just promoted to a real, named,
  // reusable handler since BlockStainEditorModal.tsx's own decant
  // card needs it directly, not only ManageReprintsModal.
  const handlePrintDecantContainerLabel = useCallback(async (specimenId: string, decantId: string) => {
    if (!caseData) return;
    const specimen = (caseData.specimens ?? []).find(s => s.id === specimenId);
    const decant = specimen?.decants?.find(d => d.id === decantId);
    if (!specimen || !decant) return;
    const ok = await printDecantContainerLabel(caseData, specimen.label, specimen.description, decant);
    if (!ok) showToast(tGrossingNav('synopticReportPage.toast.decantLabelPrintFailed', { label: `${specimen.label}${decant.label}` }), 'warning');
  }, [caseData, showToast, tGrossingNav]);


  // ── Voice action execution — moved further down in this file, see the ──────
  // ── comment at its new location for why (allBlocks/handleAdvanceFocused- ──
  // ── BlockStatus/handleConfirmTriage were fine here, but this listener ──────
  // ── now also needs openFlagManager, showTeamModal, etc., which aren't ──────
  // ── declared until much later). ──────────────────────────────────────────

  const [activeReportInstanceId, setActiveReportInstanceId] = useState<string>('');
  const [activeReportType, setActiveReportType] = useState<'grossing' | 'microscopic' | 'synoptic' | 'billing'>('synoptic');
  const [isAlertExpanded, setIsAlertExpanded] = useState(false);
  const [isSimilarCasesOpen, setIsSimilarCasesOpen] = useState(false);
  const [showCodesModal, setShowCodesModal] = useState(false);
  const triggerCodeQueryList = useTriggerCodeQueries(caseData, showCodesModal);
  // Real, per direct guidance's own follow-up: the general Codes
  // manager (AddCodeModal) had no post-signout gating at all, unlike
  // the QA CODE_CORRECTED resolution path. A pending prompt captures
  // the resolve/reject of a real, in-flight Promise so an async save
  // handler can genuinely pause and await the person's real
  // confirmation before any charge/credit or case-data mutation
  // happens - never after, which would leave the UI showing a change
  // that was never actually confirmed if the person cancelled.
  const [pendingPostSignoutPrompt, setPendingPostSignoutPrompt] = useState<{
    summary: string;
    resolve: (context: PostSignoutChangeContext) => void;
    reject: () => void;
  } | null>(null);
  const requestPostSignoutConfirmation = (summary: string): Promise<PostSignoutChangeContext> => {
    return new Promise((resolve, reject) => {
      setPendingPostSignoutPrompt({ summary, resolve, reject });
    });
  };
  // Real, per direct guidance's own follow-up: "post-signout additions
  // may be required if the wrong code was billed... the original bill
  // is credited and the new billing code submitted." Captures which
  // real, already-applied code is being corrected - specimenId always
  // present, blockId only for a block-level ancillary code (undefined
  // means a specimen-level base code, same distinction
  // onDelete/onDeleteBaseCode already make).
  const [correctingCode, setCorrectingCode] = useState<{ specimenId: string; blockId?: string; oldCode: string; stainOrderId?: string } | null>(null);
  // Real feature, per direct follow-up: "Move Manage Reprints...
  // Bottom-Right Action Cluster... removes the visual orphaning of
  // the current Manage Reports button." Lifted here from
  // MaterialTreePanel.tsx — a global, always-available case action in
  // BottomActionBar.tsx now, not something that only existed while
  // the Material tab happened to be open.
  const [showReprintModal, setShowReprintModal] = useState(false);
  const [showAttachImages, setShowAttachImages] = useState(false); // Batch 609 (PS-44)
  // Real fix: which specimen (if any) the codes modal should be
  // pre-targeted at - set when opened via a specimen's own contextual
  // "+Code" button, null when opened via the general "Codes" toolbar
  // button (case-level default, unchanged existing behavior).
  const [codesModalTargetSpecimenIndex, setCodesModalTargetSpecimenIndex] = useState<number | null>(null);
  // User-manual toggle for HeaderBar's compact mode -- see the render's
  // own comment for why this shares the existing compact render path
  // rather than building a new shrink mechanism from scratch. Sticky
  // (a per-user display preference, utils/uiPreferences since Batch 381),
  // not clinical data.
  const [isHeaderCompactManual, setIsHeaderCompactManual] = useState<boolean>(() => getUiPreference('reportHeaderCompact', false));
  useEffect(() => { setUiPreference('reportHeaderCompact', isHeaderCompactManual); }, [isHeaderCompactManual]);
  const [highlightText, setHighlightText] = useState<string | null>(null);
  // Real, per direct requirement: a second, independent highlight
  // source for the billing review panel - deliberately kept separate
  // from highlightText above (see LeftReportPanel's own rawHighlightText
  // prop comment for why), so switching between the synoptic and
  // billing tabs never leaves a stale highlight from the other one.
  const [rawHighlightText, setRawHighlightText] = useState<string | undefined>(undefined);
  // Real fix, per direct feedback: rawHighlightText above only ever
  // targets LeftReportPanel's own report-text search (Report Draft
  // tab) - it was never wired to anything on the Material tab, which
  // is where BillingReviewPanel's own AI-source highlighting is
  // actually expected to show up. Separate, exact-id-based state
  // rather than another string-search target.
  const [highlightedStainId, setHighlightedStainId] = useState<string | undefined>(undefined);
  // Real feature, per direct request: the reverse direction of the
  // sync above - if the user is on the Material tab with Billing
  // Review open and clicks a block or one of its stains (both real,
  // selectable actions there), the corresponding row in Billing
  // Review's own tree is expected to highlight to match. Deliberately
  // a new, separate id rather than reusing activeSpecimenId - that one
  // already flows the other way (Billing's own selection sets it via
  // onFocusBlock), and folding this into it risked a real, hard-to-
  // reason-about bidirectional loop between the two directions.
  const [materialSelectedBlockId, setMaterialSelectedBlockId] = useState<string | undefined>(undefined);
  // Batch 452: counts Material clicks, so re-clicking the same block re-syncs billing.
  const [materialSelectionSeq, setMaterialSelectionSeq] = useState(0);
  // Honest signal for when the AI's cited source couldn't actually be
  // located in the report text — see LeftReportPanel's matchResult.
  const [highlightNotFound, setHighlightNotFound] = useState(false);
  const [worklistCases, setWorklistCases] = useState<string[]>([]);
  const [worklistIndex, setWorklistIndex] = useState(0);
  const [alertFieldId, setAlertFieldId] = useState<string | null>(null);
  const [availableProtocols, setAvailableProtocols] = useState<{id:string;name:string}[]>([]);
  const [pendingNavigation,  setPendingNavigation]  = useState<string | null>(null);
  // For orchestration mode: tab switch that needs unsaved-draft confirmation
  const [pendingTabSwitch,   setPendingTabSwitch]   = useState<string | null>(null);
  const [showDelegateModal, setShowDelegateModal]   = useState(false);
  // Batch 610 (#83): a delegation type said by voice, applied when the Delegate dialog opens.
  const [delegatePreset, setDelegatePreset] = useState<{ typeId: string; nonce: number } | null>(null);
  // Batch 489: the real fix for the previously-dead 'delegation.tumorBoard' action.
  const [showFlagForMdtModal, setShowFlagForMdtModal] = useState(false);
  const [delegateReturnTo,  setDelegateReturnTo]    = useState<'team' | null>(null);
  const [showTeamModal,     setShowTeamModal]       = useState(false);

  // computationalFlags / refreshCompFlags removed along with the
  // Computational tab — this function only ever fed the flag catalog
  // list and a preliminary case fetch, both now unnecessary; the real
  // case load happens right after, in the effect below.

  // ── Left panel tab + Orchestrator state ───────────────────
  const [leftTab, setLeftTab] = useState<'draft' | 'sequencer' | 'report' | 'material'>('report');
  const [showSequencer, setShowSequencer] = useState(false);
  // Real fix, per direct follow-up: "we are not displaying all the
  // available buttons in the synoptic report page." Confirmed
  // directly, live: with a third dev-only Sim button added
  // (Sim Block Exception), the row of Sim buttons + Sequencer
  // genuinely overflowed the tabbar's available width — the last
  // button(s) were visually clipped at the panel boundary, not just
  // scrolled out of reach. Consolidating every dev-only Sim trigger
  // into one compact dropdown fixes this now and scales cleanly as
  // more get added later — the row only ever has one, fixed-width
  // trigger regardless of how many simulations exist behind it.
  const [showDevToolsMenu, setShowDevToolsMenu] = useState(false);
  // Real fix, per direct report, screenshots in hand: "when selecting
  // Dev Tools, its items are hidden behind the left pane." Confirmed
  // directly: a real regression from this same session's own earlier
  // fix — .ps-syn-tabbar (this button's own ancestor) picked up
  // overflow-y: hidden there to stop the tabbar's content bleeding
  // horizontally into the adjacent pane, but that same rule clips
  // ANY child that needs to visually extend past the tabbar's own
  // short height — including this dropdown, which opens downward
  // below its trigger button. Same real "portal to document.body so
  // it renders outside the [ancestor's] stacking context" pattern
  // NavBar.tsx's own system-info modal already uses — but a portaled
  // dropdown loses the position:absolute/top:100% trick that anchored
  // it to its trigger via CSS alone, so its real screen position has
  // to be computed here instead, from the trigger button's own
  // getBoundingClientRect() at the moment it opens.
  const devToolsBtnRef = useRef<HTMLButtonElement>(null);
  const [devToolsMenuPos, setDevToolsMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => getUiPreference('reportSidebarCollapsed', false));

  // Orchestration mode = PathScribe owns the report.
  // CoPilot mode = LIS owns the report; PathScribe feeds structured data back.
  // Orchestration mode = PathScribe owns the report (Outreach/O26- cases).
  // Real fix, per direct follow-up: "the case prefix can't determine
  // assist vs. orchestration case, we need to use a real flag."
  // Confirmed directly: reportingModeRouting.ts's own header comment
  // already establishes that Case.reportingMode is the real,
  // authoritative field — isOrchCaseId() (the id-prefix check) is
  // narrowly justified ONLY for CaseRouter's own routing problem
  // (which backend to even ask, before the case object exists to read
  // a field from at all) — never a substitute for the real field once
  // the case object is actually loaded, which it already is here.
  // Same real "no reportingMode must NOT default to orchestration
  // mode" safety this line's own prior comment already established —
  // a genuinely undefined/missing reportingMode (a real, older or
  // LIS-owned record) stays Assist mode, never guessed otherwise.
  const isOrchestrationMode = caseData?.reportingMode === 'orchestrator';
  caseDataRef.current = caseData;

  // ── PS-71 (Batch 458): this page's immediate saves ──────────────────────
  // Specimen and case comments, flags, codes, priority, specimen and block
  // fields, autopsy details: each saved the moment it's made, with the page's
  // version. If someone else saved meanwhile, the change is merged field by
  // field and record by record onto their save (services/cases/caseWrite.ts),
  // and the page shows their changes. Only when the same field was changed
  // both ways does it stop: the change is kept on the page (pendingPartsRef)
  // and the Edit Conflict dialog opens (a ConcurrencyConflictError, which
  // every caller already handles).
  const savePagePatch = useCallback(async (id: string, patch: Partial<Case>): Promise<void> => {
    const before = caseDataRef.current;
    const r = await savePageChange({ caseId: id, patch, before, knownVersion: knownVersionRef.current, pending: pendingPartsRef.current }, caseWriteDeps);
    if (r.kind === 'notFound') throw new Error(`Case ${id} not found`);
    if (r.kind === 'conflict') {
      pendingPartsRef.current = r.pending;
      setCaseData(prev => (prev ? { ...prev, ...patch } as typeof prev : prev));
      const conflict = new ConcurrencyConflictError(id, knownVersionRef.current, r.actualVersion);
      // Audited like the draft save's conflict ("Concurrency conflict detected").
      handleConcurrencyConflict(conflict, setConcurrencyConflict, { userName: signingUser?.name ?? signingUser?.id, actionName: `instant save (${Object.keys(patch).join(', ')})` });
      throw conflict;
    }
    if (r.kind === 'review') {
      // Nothing saved yet: keep the change (as for a conflict) and let the person decide.
      pendingPartsRef.current = r.pending;
      setCaseData(prev => (prev ? { ...prev, ...patch } as typeof prev : prev));
      setMergeReview(r.review);
      throw new MergeReviewPendingError(r.review, knownVersionRef.current);
    }
    knownVersionRef.current = r.version;
  }, [signingUser]);

  // Batch 458 (Pete: "an option to abort or accept the changes"): a save that
  // met someone else's newer save in other parts stops here for the person.
  const [mergeReviewBusy, setMergeReviewBusy] = useState(false);
  /** Take up a newer saved case without losing anything typed and not saved. True when it merged cleanly. */
  const takeUp = useCallback((saved: Case, savedVersion: number, applied: Partial<Case>): boolean => {
    const pageDraft = caseDataRef.current ? caseDraftUpdates(caseDataRef.current, orchSections) : {};
    const take = takeUpSavedCase({ saved, savedVersion, applied, pageDraft, draftBase: draftBaseRef.current });
    setCaseData(prev => (prev ? { ...take.show, ...(isOrchestrationMode && !('diagnostic' in applied) ? { diagnostic: prev.diagnostic } : {}) } as typeof prev : prev));
    const orch = (take.show as any).orchSections;
    if (isOrchestrationMode && Array.isArray(orch)) setOrchSections(orch);
    if (take.adoptVersion !== null) {
      knownVersionRef.current = take.adoptVersion;
      draftBaseRef.current = { ...draftBaseRef.current, ...Object.fromEntries(Object.keys(applied).filter(k => k in pageDraft).map(k => [k, (saved as any)[k]])), ...(take.draftBase ?? {}) };
    }
    return take.adoptVersion !== null;
  }, [orchSections, isOrchestrationMode]);
  // Batch 575 (carried from 572): "Someone else saved this case" → Show their changes, in place, without a
  // reload (which lost unsaved work with the API server). services/cases/caseWrite.ts takeUpNewerCase decides:
  // this page's unsaved report text AND changes held back by an earlier conflict are merged over theirs; if
  // they overlap, theirs are shown elsewhere, this page's stay as typed, and the next save asks which to keep
  // (a lasting note says so). Read from refs, so text typed while the case is being read isn't lost.
  const orchSectionsRef = useRef(orchSections);
  orchSectionsRef.current = orchSections;
  const caseUpdateBusyRef = useRef(false);
  const [caseUpdateBusy, setCaseUpdateBusy] = useState(false);
  const [caseUpdateOverlap, setCaseUpdateOverlap] = useState(false);
  /** Batch 577 (review): keep what is open when it still exists; otherwise choose as opening the case would. */
  const keepSelectionAfterTakeUp = (show: Case, sections: { id: string }[]) => {
    const next = selectionAfterTakeUp(show, sections, { specimenId: activeSpecimenId, reportType: activeReportType, reportInstanceId: activeReportInstanceId, sectionId: activeSectionId });
    if (next.specimenId !== activeSpecimenId) setActiveSpecimenId(next.specimenId);
    if (next.reportType !== activeReportType) setActiveReportType(next.reportType);
    if (next.reportInstanceId !== activeReportInstanceId) setActiveReportInstanceId(next.reportInstanceId);
    if (next.sectionId !== activeSectionId) setActiveSectionId(next.sectionId);
  };
  const handleCaseUpdateShow = async () => {
    if (!caseId || caseUpdateBusyRef.current) return;
    caseUpdateBusyRef.current = true;
    setCaseUpdateBusy(true);
    try {
      const latest = await caseRouter.getCase(caseId).catch(() => null) as Case | null;
      if (!latest) { showToast(tGrossingNav('synopticReportPage.caseUpdated.failed'), 'warning'); return; }
      const current = caseDataRef.current;
      const r = takeUpNewerCase({
        saved: latest, savedVersion: latest.version ?? 0, knownVersion: knownVersionRef.current,
        pageDraft: current ? caseDraftUpdates(current, orchSectionsRef.current) : {},
        draftBase: draftBaseRef.current, pending: pendingPartsRef.current,
      });
      caseUpdate.dismiss(latest.version);
      if (r.kind === 'stale') return; // this page's own save got there first
      setCaseData(prev => (prev ? {
        ...r.show,
        ...(isOrchestrationMode ? {
          diagnostic: orchestrationDiagnosticAfterTakeUp(r.show.diagnostic as Record<string, unknown> | undefined, prev.diagnostic as Record<string, unknown> | undefined) as Case['diagnostic'],
        } : {}),
      } as typeof prev : prev));
      const orch = (r.show as unknown as { orchSections?: unknown }).orchSections;
      if (isOrchestrationMode && Array.isArray(orch)) setOrchSections(orch);
      // What their save removed can't stay open (services/cases/caseWrite.ts selectionAfterTakeUp).
      keepSelectionAfterTakeUp(r.show, (isOrchestrationMode && Array.isArray(orch) ? orch : orchSectionsRef.current) as { id: string }[]);
      setTakenUpKey(k => k + 1);
      if (r.kind === 'shown') {
        knownVersionRef.current = Math.max(knownVersionRef.current, r.adoptVersion);
        draftBaseRef.current = { ...draftBaseRef.current, ...r.draftBase };
        pendingPartsRef.current = r.pending;
        setCaseUpdateOverlap(false);
        showToast(tGrossingNav('synopticReportPage.caseUpdated.shown'), 'info');
      } else {
        setCaseUpdateOverlap(true);
      }
    } finally {
      caseUpdateBusyRef.current = false;
      setCaseUpdateBusy(false);
    }
  };
  // Batch 577 (carried from 575): the Edit Conflict dialog's "Use their version", in place of a reload (a
  // wait, the tab and place lost, and the draft copy offered back afterwards). The person chose to discard
  // what this page holds unsaved, so the saved case is shown as opening it would show it
  // (services/cases/caseWrite.ts takeTheirVersion), the draft copy and held changes are dropped, and the lists
  // are read again.
  const handleConcurrencyUseTheirs = async () => {
    if (!caseId || caseUpdateBusyRef.current) return;
    caseUpdateBusyRef.current = true;
    setCaseUpdateBusy(true);
    try {
      const latest = await caseRouter.getCase(caseId).catch(() => null) as Case | null;
      if (!latest) { showToast(tGrossingNav('synopticReportPage.concurrency.useTheirsFailed'), 'warning'); return; }
      const r = takeTheirVersion(latest, latest.version ?? 0);
      const sections = r.orchSections as OrchestratorSection[];
      pendingPartsRef.current = null;
      knownVersionRef.current = r.adoptVersion;
      draftBaseRef.current = caseDraftUpdates(r.show, sections);
      setCaseData(r.show);
      setOrchSections(sections);
      keepSelectionAfterTakeUp(r.show, sections);
      discardDraft();
      clearDirty();
      caseUpdate.dismiss(r.adoptVersion);
      setCaseUpdateOverlap(false);
      closeConcurrencyConflict();
      setTakenUpKey(k => k + 1);
      showToast(tGrossingNav('synopticReportPage.concurrency.useTheirsDone'), 'info');
    } finally {
      caseUpdateBusyRef.current = false;
      setCaseUpdateBusy(false);
    }
  };
  const handleMergeReviewSave = async () => {
    if (!mergeReview) return;
    setMergeReviewBusy(true);
    const r = await commitMergeReview(mergeReview, caseWriteDeps).finally(() => setMergeReviewBusy(false));
    const review = mergeReview;
    setMergeReview(null); setConcurrencyConflict(null);
    if (r.ok === false) { showToast(tGrossingNav('synopticReportPage.mergeReview.changedAgain'), 'warning'); return; }
    takeUp(r.saved, r.version, review.parts);
    pendingPartsRef.current = null;
    setTakenUpKey(k => k + 1);
    // The draft is saved when the review carried it.
    if (Object.keys(review.parts).some(k => k === 'synopticReports' || k === 'orchSections' || k === 'grossingReports')) { discardDraft(); clearDirty(); }
    showToast(tGrossingNav('synopticReportPage.mergeReview.saved'));
  };
  const handleMergeReviewNotYet = () => {
    if (!mergeReview) return;
    const review = mergeReview;
    setMergeReview(null); setConcurrencyConflict(null);
    // Their changes shown, this person's on top, not saved.
    takeUp(review.latest, review.version, review.parts);
    setTakenUpKey(k => k + 1);
    const pagePartKeys = Object.keys(review.parts).filter(k => !['synopticReports', 'orchSections', 'grossingReports'].includes(k));
    pendingPartsRef.current = pagePartKeys.length
      ? { parts: Object.fromEntries(pagePartKeys.map(k => [k, (review.parts as any)[k]])) as Partial<Case>, base: Object.fromEntries(pagePartKeys.map(k => [k, (review.latest as any)[k]])) as Partial<Case> }
      : null;
    markDirty('mergeReview');
    showToast(tGrossingNav('synopticReportPage.mergeReview.shown'), 'info');
  };

  // ── Three-column Orchestration layout state ─────────────────────────────────
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // ── User-configurable tab width — persisted across sessions ────────────────
  const [tabWidthChars, setTabWidthChars] = useState<number>(() => getUiPreference('reportTabWidth', 4));
  const handleTabWidthChange = useCallback((chars: number) => {
    setTabWidthChars(chars);
    setUiPreference('reportTabWidth', chars);
  }, []);

  // ── Print the formatted centre pane report ───────────────────────────────
  // handleOrchPrint itself is defined further down, after orchSections,
  // resolvedContext, resolvedTemplateName, resolvedBy, and showToast are
  // all declared — it depends on every one of them, so it can't live here
  // (its dependency array would reference consts not yet initialized in
  // this render pass).

  useEffect(() => { setUiPreference('reportSidebarCollapsed', sidebarCollapsed); }, [sidebarCollapsed]);

  // LIS cases must never show the draft tab — reset if somehow set
  useEffect(() => {
    if (!isOrchestrationMode && leftTab === 'draft') setLeftTab('report');
  }, [isOrchestrationMode, leftTab]);
  
  // orchSections itself now declared earlier, alongside draftableCaseSlice
  // above, which needs it — see that block's own comment for why.
  // Holds the StructuredContext from the most recent buildContext() call —
  // ReportPreviewRenderer needs narrativeTemplate.bodyAssembly (the real
  // Parts/Assembly tree) and synoptic.answers to render the structural body
  // Parts that orchSections never carried (see contextBuilder.ts /
  // ReportPreviewRenderer.tsx changes). Previously this was a disposable
  // local variable inside handleGenerateReport — those Parts had nowhere
  // to be read from after the function returned.
  const [resolvedContext, setResolvedContext] = useState<StructuredContext | null>(null);

  // Must be after isOrchestrationMode, leftTab, hasUnsavedData AND orchSections
  const safeSetLeftTab = React.useCallback((tab: string) => {
    if (
      isOrchestrationMode &&
      leftTab === 'draft' &&
      hasUnsavedData &&
      orchSections.some(s => s.text)
    ) {
      setPendingTabSwitch(tab);
    } else {
      setLeftTab(tab as any);
    }
  }, [isOrchestrationMode, leftTab, hasUnsavedData, orchSections]);

  // Real fix: 'latest ref' for safeSetLeftTab - a real, genuine
  // stale-closure bug was found here: the PATHSCRIBE_JUMP_TO_FIELD
  // handler below (mount-only, deliberately empty deps, since it's a
  // global window listener that shouldn't tear down/re-subscribe on
  // every render) was calling safeSetLeftTab directly, capturing
  // whatever hasUnsavedData/leftTab/orchSections values were true at
  // MOUNT time - meaning a user with real, unsaved changes jumping to
  // a field later could silently skip the "confirm before switching
  // tabs" warning safeSetLeftTab exists to provide. This ref is kept
  // current by a real, but cheap, effect (just a ref assignment, not a
  // global listener re-subscription) so the handler always calls the
  // real, latest version.
  const safeSetLeftTabRef = React.useRef(safeSetLeftTab);
  React.useEffect(() => { safeSetLeftTabRef.current = safeSetLeftTab; }, [safeSetLeftTab]);

  const {
    saveDraftInternal,
    handleSectionTextChange,
    handleAcceptSection,
    handleAcceptDraft,
    handleKeepVersion,
    handleAcceptAllSections,
  } = useOrchestratorDraft({
    confirmWarnings: warningConfirm.confirm,
    caseData, setCaseData, caseId, orchSections, setOrchSections,
    activeSectionId, setActiveSectionId, isOrchestrationMode, leftTab,
    knownVersionRef, setConcurrencyConflict, clearDirty, discardDraft, showToast, draftBaseRef, pendingPartsRef,
    onMergeReview: setMergeReview,
  });

  // Real fix, per direct follow-up: "1. Save & Switch: Flushes
  // pending dictation/synoptic data to Station 2, then updates
  // workspace to Station 3." Registers the exact same real
  // saveDraftInternal() every other real save trigger on this page
  // already uses — a global handler with zero page-specific
  // knowledge (useGlobalStationSwitch.ts) can call whatever's
  // currently registered here without needing to know this page, or
  // this save function, exist at all. Unregisters on unmount so a
  // scan that arrives after navigating away from this page correctly
  // finds nothing registered (matching isDirty itself also resetting
  // whenever nothing owns it).
  useEffect(() => {
    registerSaveHandler(saveDraftInternal);
    return () => registerSaveHandler(null);
  }, [registerSaveHandler, saveDraftInternal]);

  // Real feature, per direct follow-up: "2. Discard & Switch: Clears
  // uncommitted entries and switches context." Same real
  // registration as the save handler above, for the real, existing
  // discardDraft() (useDraftCache.ts) — see registerSaveHandler's own
  // comment for the full reasoning.
  useEffect(() => {
    registerDiscardHandler(discardDraft);
    return () => registerDiscardHandler(null);
  }, [registerDiscardHandler, discardDraft]);


  const [_resolvedTemplateId,   setResolvedTemplateId]   = useState<string>('tmpl-gold-standard');
  // _resolvedTemplateId is write-only — setResolvedTemplateId is called
  // twice elsewhere with real, deliberately-resolved data
  // (ctx.narrativeTemplate.templateId), but the value itself is never
  // read anywhere in this file. Flagged as a likely real gap (this looks
  // like it should feed into which physical report template renders, or
  // the print/PDF flow) rather than silently deleted.
  const [resolvedTemplateName, setResolvedTemplateName] = useState<string>(GOLD_STANDARD_TEMPLATE_NAME);
  const [resolvedBy,           setResolvedBy]           = useState<string>('gold-standard');
  const [overrideTemplateId,   setOverrideTemplateId]   = useState<string | null>(null);

  // ── Auto-resolve StructuredContext on load ──────────────────────────────
  // Bug found in testing: bodyAssembly (which gates whether the report
  // preview/print shows anything) previously only got populated by
  // clicking "Generate Report" in the current session. But orchSections
  // (AI text) can also arrive via the restoration effect above, from a
  // PRIOR session — so a case could have real generated text sitting in
  // orchSections while bodyAssembly was still empty, showing "No report
  // sections yet" despite there being content. Resolving context as soon
  // as the case loads — independent of AI generation — fixes that, and is
  // also the architecturally correct behaviour: most body Parts
  // (demographics, specimens, sign-off) are auto-populated from data and
  // were never meant to be gated behind an AI-generation button at all.
  useEffect(() => {
    if (!caseData || !isOrchestrationMode) return;
    let cancelled = false;
    buildContext(caseData, signingUser, overrideTemplateId || undefined)
      .then(ctx => {
        if (cancelled) return;
        setResolvedContext(ctx);
        // Only set these on initial load if generation hasn't already run
        // this session — don't clobber a result handleGenerateReport just
        // produced with the same auto-resolve values.
        setResolvedTemplateId(prev => prev === 'tmpl-gold-standard' ? ctx.narrativeTemplate.templateId : prev);
        setResolvedTemplateName(curr =>
          curr === GOLD_STANDARD_TEMPLATE_NAME ? ctx.narrativeTemplate.templateName : curr
        );
      })
      .catch(e => {
        if (!cancelled) console.warn('Auto-resolve of StructuredContext failed on load:', e);
      });
    return () => { cancelled = true; };
    // caseData.id (not the whole object) — caseData can get new object
    // identity on unrelated updates without this needing to re-resolve.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData?.id, isOrchestrationMode, overrideTemplateId, takenUpKey]);

  // ── Centre pane header state — template picker, lifted here so it can be
  //    shared between both layout instances (primary + expanded) ───────────
  const [centreTemplates, setCentreTemplates] = useState<{ id: string; name: string; specialty?: string }[]>([]);
  const [showCentreTemplatePicker, setShowCentreTemplatePicker] = useState(false);
  useEffect(() => {
    (reportTemplateService as any).getAll?.().then((r: any) => {
      if (r?.ok) setCentreTemplates(r.data ?? []);
    }).catch(() => {});
  }, []);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null);

  // ── Dirty-state timing guards ──────────────────────────────────────────
  // Track when hasUnsavedData first becomes true relative to case load.
  // Changes that fire within 1200 ms of load are from component initialisation
  // (e.g. RightSynopticPanel seeding form values) — not real user edits.
  const caseLoadedAt = React.useRef<number>(Date.now());
  const dirtySetAt   = React.useRef<number | null>(null);

  // AI suggestions lifted from RightSynopticPanel
  const [aiSuggestions,        setAiSuggestions]        = useState<Record<string, AiSuggestion>>({});
  // Computational Results was deliberately replaced by Biomarkers — this
  // state, and its downstream usages (the generateAiSuggestionsForReport
  // call, a useCallback dependency, and a prop passed to
  // RightSynopticPanel), were all leftover from the superseded feature,
  // permanently stuck at {} since nothing ever populated it. Removed
  // rather than left as dead weight — generateAiSuggestionsForReport's
  // own computationalResults parameter is optional, so omitting it here
  // entirely is safe and doesn't change what the AI suggestion flow
  // actually does today.

  // ── AI Synthesis Status — fed to HeaderBar's badge ───────────────────────
  // PS-329 (Batch 437): only the template's Must Have fields (required and
  // shown) decide the badge; see services/templates/aiSynthesisStatus.ts.
  // The threshold is the admin-configurable one RightSynopticPanel also
  // uses (Configuration → AI Provider Settings), not a second copy.
  const [reviewThreshold, setReviewThreshold] = React.useState(75);
  React.useEffect(() => {
    aiBehaviorService.get().then(async res => {
      if (!res.ok) return;
      const orgThreshold = res.data.confidenceThreshold ?? 75;
      setReviewThreshold(orgThreshold);
      // Batch 609 (#173): the model's own threshold override, when the organisation set one.
      setReviewThreshold(await resolveConfidenceThresholdForClient(caseData?.order?.facilityId, orgThreshold));
    }).catch(() => {});
  }, [caseData?.order?.facilityId]);

  const REVIEW_THRESHOLD = reviewThreshold;

  const [mustHave, setMustHave] = React.useState<MustHaveFields | null>(null);
  const aiSynthesisStatus = React.useMemo<AiSynthesisStatus>(
    () => computeAiSynthesisStatus(aiSuggestions, REVIEW_THRESHOLD, mustHave),
    [aiSuggestions, REVIEW_THRESHOLD, mustHave],
  );

  // "Unpacking" — clicking the badge in a 'review-required' state jumps
  // straight to the Tier 1 field that dragged the status down, reusing the
  // same scrollToField mechanism RightSynopticPanel already exposes (see
  // alertFieldId below) rather than building a second navigation path.
  const handleAiStatusReviewClick = React.useCallback(() => {
    if (!aiSynthesisStatus.flaggedFieldId) return;
    safeSetLeftTab('report');
    setAlertFieldId(aiSynthesisStatus.flaggedFieldId);
  }, [aiSynthesisStatus.flaggedFieldId, safeSetLeftTab]);


  useEffect(() => {
    if (!caseId) return;

    // Reset dirty-timing refs for each fresh case load
    caseLoadedAt.current = Date.now();
    dirtySetAt.current   = null;

    // ── Worklist for Previous / Next ──────────────────────────
    if (routerWorklistIds.length > 0) {
      // Arrived via case-to-case navigation (prev/next already carried the list)
      setWorklistCases(routerWorklistIds);
      setWorklistIndex(routerWorklistIds.indexOf(caseId));
    } else if (navSource === 'search') {
      // Arrived from Search results — use the saved search result order
      try {
        const searchIds: string[] = JSON.parse(
          getSessionFlag('pathscribe:searchResultIds') ?? '[]'
        );
        if (searchIds.length > 0) {
          setWorklistCases(searchIds);
          setWorklistIndex(searchIds.indexOf(caseId ?? ''));
        }
      } catch { /* malformed storage — ignore */ }
    } else {
      // Arrived from regular Worklist
      caseRouter.listCasesForUser('current').then((cases: any[]) => {
        const ids = cases.map((c: any) => c.id);
        setWorklistCases(ids);
        setWorklistIndex(ids.indexOf(caseId));
      }).catch(() => {});
    }

    setHasUnsavedData(false);
    caseRouter.getCase(caseId).then(c => {
      if (!c) { setCaseNotFound(true); setIsLoaded(true); return; }
      setCaseData(c);
      knownVersionRef.current = (c as any).version ?? 0;
      // Real fix: records the real, genuine first-open moment for the
      // FIRST_TOUCH TAT calculation (components/Contribution/
      // qualityCalculations.ts) - idempotent, only ever set once. Fire-
      // and-forget: this shouldn't block the case from opening, and a
      // failed write here just means one case's first-touch metric is
      // missing, not a broken load. Updates knownVersionRef so a real
      // edit made later in this same session isn't rejected against a
      // version this write has already advanced past.
      // Batch 572: the write saved version expected + 1; never step back if another save moved past it meanwhile.
      if (!(c as any).firstOpenedAt) {
        const expected = knownVersionRef.current;
        caseRouter.updateCase(caseId, { firstOpenedAt: new Date().toISOString() } as any, expected)
          .then(() => { knownVersionRef.current = Math.max(knownVersionRef.current, expected + 1); })
          .catch(() => {});
      }
      if (c.specimens?.length) setActiveSpecimenId(c.specimens[0].id);
      // Real fix, per direct spec: a case still at the grossing stage
      // should default to showing its already-assigned Grossing
      // report in the right panel — not the diagnostic Synoptic
      // template picker, which was the previous, unconditional
      // default regardless of the case's actual stage. Checked
      // directly: this effect only ever looked at synopticReports,
      // never grossingReports, so a case with zero synoptic reports
      // but a real, unfinished grossing report (exactly the state a
      // freshly-accessioned case is in) fell through to the
      // hardcoded activeReportType default ('synoptic') and an empty
      // activeReportInstanceId, landing on "no template attached"
      // instead of the grossing work actually waiting to be done.
      // Mirrors hasUnfinishedGrossing's own definition elsewhere in
      // this codebase (BottomActionBar.tsx) for consistency.
      //
      // Real, genuine gap found in that same fix via direct report,
      // screenshots in hand: it only ever covered a DRAFT grossing
      // report. A case already at Gross Complete (every real
      // grossingReports[] entry status: 'finalized') with no
      // synoptic report started yet — the exact state a case sits in
      // right after Grossing wraps up and before a pathologist has
      // picked a diagnostic template — fell through BOTH branches
      // below, landing right back on the unconditional 'synoptic'/''
      // default this fix's own comment above already explains is
      // wrong. Real fix: fall back to the FIRST grossing report
      // (matching the sidebar's own display order) regardless of its
      // status, whenever no synoptic report exists yet — there's
      // real, meaningful content already on the case either way; an
      // empty template picker is never the more useful default over
      // it.
      const unfinishedGrossing = (c.grossingReports ?? []).find(g => g.status === 'draft');
      if (unfinishedGrossing) {
        setActiveReportType('grossing');
        setActiveReportInstanceId(unfinishedGrossing.instanceId);
      } else if (c.synopticReports?.length) {
        setActiveReportInstanceId(c.synopticReports[0].instanceId);
      } else if (c.grossingReports?.length) {
        setActiveReportType('grossing');
        setActiveReportInstanceId(c.grossingReports[0].instanceId);
      }
      // Automatic merge-on-claim check — same "when the formal order
      // finally arrives, look for a match" moment AccessionPage's
      // post-submit check covers, but for the two cases that flow
      // doesn't reach: a case claimed from Pool, or a case opened
      // directly that was never freshly accessioned in this session
      // (e.g. re-opened later, or arrived via FHIR feed rather than
      // manual accessioning). Safe on every load — findMatchesForNewCase
      // only ever returns still-pending entries, so an already-merged
      // match never re-surfaces this prompt.
      {
        const patientFamilyNames = (c as any)?.patient?.familyNames as string | undefined;
        const patientGivenNames  = (c as any)?.patient?.givenNames as string | undefined;
        const patientMrn         = (c as any)?.patient?.mrn as string | undefined;
        const requestingProvider = (c as any)?.order?.requestingProvider as string | undefined;
        const accessionedAt      = (c as any)?.accession?.accessionedAt as string | undefined;
        if (patientFamilyNames && patientGivenNames && patientMrn && accessionedAt) {
          intraoperativeService.findMatchesForNewCase({
            patientName: `${patientFamilyNames}, ${patientGivenNames}`,
            mrn: patientMrn,
            surgeon: requestingProvider ?? '',
            accessionedAt,
          }).then(res => {
            if (res.ok && res.data.length > 0) setIntraopMatch(res.data[0]);
          }).catch(() => {});
        }
      }
      import('@/services/templates/templateService').then(m =>
        m.listTemplates('published').then(templates =>
          setAvailableProtocols(templates.map((t: any) => ({ id: t.id, name: t.name })))
        )
      );
      // Case comments are derived directly from caseData.order.caseComments
      // (a real append-only thread, June 2026 — previously a single string
      // that lived in localStorage and was never actually shared across
      // users/devices) — no separate load-on-mount state to sync here
      // anymore, since there's nothing to keep in sync with.
      // Reopen Patient History modal if navigated back via breadcrumb (?history=1)
      if (new URLSearchParams(window.location.search).get('history') === '1') {
        setIsSimilarCasesOpen(true);
        window.history.replaceState({}, '', window.location.pathname);
      }
      setIsLoaded(true);
    }).catch(() => { setCaseNotFound(true); setIsLoaded(true); });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Real, honest justification: this effect is deliberately gated on [caseId] alone - it's expensive (loads full case data) and must only re-run when actually navigating to a different case. navSource (a useMemo with its own empty deps, stable forever) and setHasUnsavedData (a stable setter) would both be safe to add individually, but routerWorklistIds (`(location.state as any)?.worklistCaseIds ?? []`) has a genuinely unstable reference - a fresh [] on every render whenever location.state lacks that field - and adding it here risks this case-load effect re-running on every render, not just real case navigation. All three are intentionally read once, at case-load time, not meant to be reactive triggers.
  }, [caseId]);

  // Track when dirty state was first set relative to case load
  React.useEffect(() => {
    if (hasUnsavedData) {
      if (dirtySetAt.current === null) dirtySetAt.current = Date.now();
    } else {
      dirtySetAt.current = null;
    }
    // Batch 576: saved (nothing unsaved): the next edit is a new one.
    if (!hasUnsavedData) editedAt.current = null;
    // Batch 573: what others see in "who else has this case open".
    setPresenceEditing(isPersonsEdit(hasUnsavedData, dirtySetAt.current, caseLoadedAt.current, editedAt.current));
  }, [hasUnsavedData]);

  // Batch 576: typing or choosing in the synoptic form counts as the person's edit even when its prefill
  // marked the page unsaved while setting up (other edits are noted in markDirty).
  const hasUnsavedRef = React.useRef(hasUnsavedData);
  hasUnsavedRef.current = hasUnsavedData;
  React.useEffect(() => {
    editedAt.current = null;
    const onEdit = (e: Event) => {
      if (!isReportEditEvent(e.target as Element | null)) return;
      if (editedAt.current === null) editedAt.current = Date.now();
      if (hasUnsavedRef.current) setPresenceEditing(true);
    };
    document.addEventListener('input', onEdit, true);
    document.addEventListener('change', onEdit, true);
    return () => { document.removeEventListener('input', onEdit, true); document.removeEventListener('change', onEdit, true); };
  }, [caseId]);

  // Returns true only when dirty state originated from a real user edit
  // (not from component initialisation shortly after case load).
  //
  // Real bug found via a direct report: clicking "Previous"/"Next" case
  // incorrectly warned about unsaved changes on a case nobody had
  // touched yet. Traced to this window being too short, not to the
  // case-load reset itself — caseLoadedAt.current IS correctly reset on
  // every caseId change (see the useEffect above), so that part already
  // worked. The actual problem: RightSynopticPanel.tsx's initial-load
  // chain (fetch template detail -> fetch AI suggestions ->
  // apply prefill -> call onCaseUpdate) is a real sequential async
  // chain, and can legitimately take longer than 1200ms to settle —
  // especially case-to-case, where it's competing with the outer case
  // fetch that just fired from the same navigation. When it does, the
  // resulting markDirty() call lands just outside the old window and
  // gets misread as a genuine user edit. Widened to a value that
  // comfortably covers that real chain rather than the bare minimum —
  // still a heuristic, not a deterministic fix (see below), but a
  // meaningfully safer one.
  //
  // The fully robust fix would replace this elapsed-time guess with an
  // explicit "initial load still in flight" flag, set true at
  // navigation start and cleared only once every initialization effect
  // (case load, template load, AI suggestions load) has genuinely
  // settled — not attempted here, flagged as a real follow-up if a
  // slower network ever pushes real initialization past this new
  // window too.
  const shouldWarnDirty = React.useCallback((): boolean => (
    // Batch 573: the rule moved to services/cases/caseEditingSignal.ts (presence uses it too).
    isPersonsEdit(hasUnsavedData, dirtySetAt.current, caseLoadedAt.current, editedAt.current)
  ), [hasUnsavedData]);

  // ── Hooks ──────────────────────────────────────────────────
  const {
    showFinalizeModal,  setShowFinalizeModal,
    showSignOutModal,   setShowSignOutModal,
    setCaseSigned,
    showAmendmentModal, setShowAmendmentModal,
    amendmentText,      setAmendmentText,
    amendmentMode,      setAmendmentMode,
  } = useSynopticFinalize();

  // Real countersign feedback capture — local state, deliberately not
  // added to the shared useSynopticFinalize hook since it's specific to
  // this one flow and doesn't need to be shared with other components.
  const [countersignFeedback, setCountersignFeedback] = useState('');
  // Batch 454: "follow-up specimen expected", ticked in the sign-out modal.
  const [followUpExpected, setFollowUpExpected] = useState(false);
  const capabilities = useCapabilities();
  const canMarkFollowUp = capabilities.has('case:follow-up:expect', { caseId: caseData?.id ?? null, facilityId: caseData?.order?.facilityId ?? null });
  // Kept while sign-out gates close and reopen the flow; cleared for another case.
  useEffect(() => { setFollowUpExpected(false); }, [caseData?.id]);
  // Batch 459: after sign-out, "Mark follow-up expected" (or the existing mark) in the action bar.
  const [followUpOffer, setFollowUpOffer] = useState<FollowUpMarkOffer>({ kind: 'none' });
  useEffect(() => {
    let live = true;
    if (!caseData?.id) { setFollowUpOffer({ kind: 'none' }); return; }
    loadFollowUpMarkOffer(caseData.id).then(o => { if (live) setFollowUpOffer(o); }).catch(() => { if (live) setFollowUpOffer({ kind: 'none' }); });
    return () => { live = false; };
  }, [caseData?.id, caseData?.status, takenUpKey]);
  const handleMarkFollowUpAfterSignOut = useCallback(async () => {
    if (!caseData?.id || !signingUser) return;
    const r = await markFollowUpExpectedAfterSignOutLive(caseData.id, { id: signingUser.id, name: signingUser.name });
    if (r.ok === false) { showToast(tGrossingNav(`bottomActionBar.followUp.notMarked.${followUpMarkFailureKey(r.reason)}`), 'warning'); return; }
    setFollowUpOffer({ kind: 'marked', expectation: r.data });
    showToast(tGrossingNav('bottomActionBar.followUp.markedToast', { date: formatDate(r.data.window.endsAt, i18nForDates.language) }));
  }, [caseData?.id, signingUser, showToast, tGrossingNav, i18nForDates.language]);

  // Real fix: handleUpdateBlock does a shallow merge at the block
  // level ({ ...block, ...changes }), not a deep merge into coding -
  // passing only { coding: { cpt: [...] } } would silently wipe out
  // any real, existing rejectedCpt on that same block, and vice versa.
  // Both real arrays are read and re-passed together here for exactly
  // that reason.
  // Batch 452: a billing row can be a block or a decant
  // (services/material/billableMaterial.ts); its codes are read from, and
  // written back to, whichever it is. A decant's coding goes through the
  // material store like any other decant change.
  const findCaseBlock = (specimenId: string, blockId: string) =>
    billableUnitOf<HistologyBlock, Decant>(caseData?.specimens as never, specimenId, blockId)?.unit as { coding?: HistologyBlock['coding'] } | undefined;
  const updateBillableMaterial = (specimenId: string, materialId: string, changes: { coding?: HistologyBlock['coding'] }) => {
    const target = billableUnitOf<HistologyBlock, Decant>(caseData?.specimens as never, specimenId, materialId);
    if (target?.kind === 'decant') return handleUpdateDecant(specimenId, materialId, { coding: changes.coding as Decant['coding'] });
    return handleUpdateBlock(specimenId, materialId, changes);
  };

  // Batch 460: the charge, credit and coding decisions behind the billing
  // panel live in services/billing/caseBillingCharges.ts and
  // caseBillingCoding.ts (shared with the Cytology Workspace and Microtomy).
  // Every change needs billing:applied-code:review (enforceBillingReview),
  // asked before anything changes; correcting an applied code still needs
  // billing:applied-code:correct. A pending AI suggestion can still be
  // approved on a signed-out case, after the post-sign-out reason.
  const recordChargeTransaction = (specimenId: string, blockId: string | undefined, code: string, postSignoutContext?: PostSignoutChangeContext) =>
    caseData ? recordCaseCharge({ caseData, specimenId, blockId, code, user: signingUser, postSignoutContext }) : Promise.resolve('notCharged' as const);
  const recordCreditTransaction = (specimenId: string, blockId: string | undefined, code: string, postSignoutContext?: PostSignoutChangeContext) =>
    caseData ? recordCaseCredit({ caseData, specimenId, blockId, code, user: signingUser, postSignoutContext }) : Promise.resolve('notCredited' as const);
  const billingReviewAllowed = async (): Promise<boolean> => {
    if (!caseData) return false;
    if (await enforceBillingReview(caseData)) return true;
    showToast(tGrossingNav('billingReview.toast.notPermitted'), 'warning');
    return false;
  };
  // Cancelled → null: nothing changes. Not signed out → undefined.
  const postSignoutReason = async (summary: string): Promise<PostSignoutChangeContext | undefined | null> => {
    if (!postSignoutReasonNeeded({ billed: isOrchestrationMode, status: caseData?.status })) return undefined;
    try { return await requestPostSignoutConfirmation(summary); } catch { return null; }
  };

  const handleApproveBillingCode = async (specimenId: string, blockId: string, code: string, stainOrderId?: string) => {
    if (!(await billingReviewAllowed())) return;
    const postSignoutContext = await postSignoutReason(`${code} approved.`);
    if (postSignoutContext === null) return;
    updateBillableMaterial(specimenId, blockId, { coding: codingWithApproved(findCaseBlock(specimenId, blockId)?.coding, [{ code, stainOrderId }]) });
    recordChargeTransaction(specimenId, blockId, code, postSignoutContext);
  };

  const handleRejectBillingCode = async (specimenId: string, blockId: string, code: string, stainOrderId?: string) => {
    if (!caseData || !(await billingReviewAllowed())) return;
    updateBillableMaterial(specimenId, blockId, { coding: codingWithRejected(findCaseBlock(specimenId, blockId)?.coding, code, stainOrderId) });
    // Nothing was charged for a suggestion, so nothing to credit; the decision is audited.
    auditBillingSuggestionDeclined({ caseData, specimenId, blockId, code, stainOrderId, user: signingUser });
  };

  // The decline and the replacement are written in one change, from one read
  // of the block (two writes in a row used to lose one of them). The new code
  // keeps the suggestion's stain.
  const handleOverrideBillingCode = async (specimenId: string, blockId: string, oldCode: string, newCode: string, stainOrderId?: string) => {
    if (!caseData || !(await billingReviewAllowed())) return;
    const postSignoutContext = await postSignoutReason(`${oldCode} \u2192 ${newCode}.`);
    if (postSignoutContext === null) return;
    updateBillableMaterial(specimenId, blockId, { coding: codingWithOverride(findCaseBlock(specimenId, blockId)?.coding, oldCode, newCode, stainOrderId) });
    recordChargeTransaction(specimenId, blockId, newCode, postSignoutContext);
    auditBillingSuggestionDeclined({ caseData, specimenId, blockId, code: oldCode, stainOrderId, replacedWith: newCode, user: signingUser, postSignoutContext });
  };

  // Removes an applied code (credited); a deleted code can come back as a
  // suggestion while its stain is still there.
  const handleDeleteBillingCode = async (specimenId: string, blockId: string, code: string, stainOrderId?: string) => {
    if (!(await billingReviewAllowed())) return;
    updateBillableMaterial(specimenId, blockId, { coding: codingWithoutCode(findCaseBlock(specimenId, blockId)?.coding, code, stainOrderId) });
    recordCreditTransaction(specimenId, blockId, code);
  };

  // "Approve all": one write per block with all of its codes (a loop of
  // single approvals would read the same stale block and drop some).
  const handleApproveAllBillingCodes = async (items: BillingApprovalItem[]) => {
    if (!(await billingReviewAllowed())) return;
    const postSignoutContext = items.length > 0 ? await postSignoutReason(`${items.length} code${items.length === 1 ? '' : 's'} approved.`) : undefined;
    if (postSignoutContext === null) return;
    for (const { specimenId, blockId, codes } of groupApprovalsByUnit(items)) {
      updateBillableMaterial(specimenId, blockId, { coding: codingWithApproved(findCaseBlock(specimenId, blockId)?.coding, codes) });
    }
    for (const item of items) recordChargeTransaction(item.specimenId, item.blockId, item.code, postSignoutContext);
  };

  // Batch 579 (carried from 575): a specimen's billing codes (added, removed, corrected; matrix codes applied or
  // rejected) and the Sequencer's specimen order are saved the moment they're made, like the page's other
  // specimen changes. Before, they were only held on screen: Save Draft doesn't write specimens, so a reload
  // lost them and taking up someone else's version replaced them.
  //   - One at a time, each built on the one before (two quick clicks never meet each other as "someone else").
  //   - `allOrNothing` (billing codes): unless the change saved, the screen goes back and the caller records
  //     no charge or credit, so the billing ledger never has a transaction for a code the case doesn't have.
  //     If someone else saved meanwhile, the person is told to look at their changes and make the change again.
  const specimenSaveChain = useRef<Promise<unknown>>(Promise.resolve());
  const saveSpecimensNow = (
    build: (specimens: NonNullable<Case['specimens']>) => Case['specimens'],
    opts: { allOrNothing: boolean },
  ): Promise<'saved' | 'conflict' | 'failed'> => {
    const run = async (): Promise<'saved' | 'conflict' | 'failed'> => {
      // Let the page show the previous save first (its version and specimens).
      await new Promise(r => setTimeout(r, 0));
      const current = caseDataRef.current;
      if (!current) return 'failed';
      const before = current.specimens;
      const next = build(before ?? []);
      const heldBefore = pendingPartsRef.current;
      setCaseData(prev => (prev ? ({ ...prev, specimens: next } as typeof prev) : prev));
      try {
        await savePagePatch(current.id, { specimens: next } as Partial<Case>);
        return 'saved';
      } catch (e) {
        const conflict = e instanceof ConcurrencyConflictError;
        if (opts.allOrNothing) {
          pendingPartsRef.current = heldBefore;
          setCaseData(prev => (prev ? ({ ...prev, specimens: before } as typeof prev) : prev));
          if (conflict) {
            setConcurrencyConflict(null);
            setMergeReview(null);
            showToast(tGrossingNav('synopticReportPage.toast.specimenSaveConflict'), 'warning');
            return 'conflict';
          }
        } else if (conflict) {
          return 'conflict'; // the Edit Conflict dialog (or the merge review) is open, with the change kept
        }
        console.error('[SpecimenSave] Failed to save specimens:', e);
        showToast(tGrossingNav('synopticReportPage.toast.specimenSaveFailed'), 'warning');
        return 'failed';
      }
    };
    const result = specimenSaveChain.current.then(run, run);
    specimenSaveChain.current = result.catch(() => undefined);
    return result;
  };

  // A specimen-level change on a signed-out case asks for the same post-sign-out reason as the case-level
  // paths (services/billing/postSignoutBillingReason.ts), before anything changes; the reason goes on the
  // credit or charge and its audit entry. Cancelled → nothing changes.
  const specimenPostSignoutReason = (kind: 'added' | 'removed', code: string) => {
    const summary = specimenBillingChangeSummary(kind, code);
    return postSignoutReason(tGrossingNav(summary.key, summary.values));
  };

  const handleDeleteSpecimenBaseCode = async (specimenId: string, code: string) => {
    if (!(await billingReviewAllowed())) return;
    const postSignoutContext = await specimenPostSignoutReason('removed', code);
    if (postSignoutContext === null) return;
    if (await saveSpecimensNow(sp => specimensWithBaseCodeRemoved(sp, specimenId, code), { allOrNothing: true }) !== 'saved') return;
    recordCreditTransaction(specimenId, undefined, code, postSignoutContext);
  };

  // These only capture which applied code is being corrected; the credit and
  // new charge happen in handleConfirmCodeCorrection once the new code is known.
  const handleCorrectBillingCode = (specimenId: string, blockId: string, oldCode: string, stainOrderId?: string) => {
    setCorrectingCode({ specimenId, blockId, oldCode, stainOrderId });
  };
  const handleCorrectSpecimenBaseCode = (specimenId: string, oldCode: string) => {
    setCorrectingCode({ specimenId, oldCode });
  };

  // Credits the old code and bills the new one through correctServiceCharge
  // (services/billing), after the post-sign-out reason when signed out.
  const handleConfirmCodeCorrection = async (newCode: string) => {
    const pending = correctingCode;
    setCorrectingCode(null);
    if (!pending || !caseData?.id) return;
    // Batch 382: correcting an applied code needs billing:applied-code:correct.
    // Asked before anything changes, since assist mode changes the code
    // without a charge (the button is greyed out already; this is the check).
    if (!(await enforceAppliedCodeCorrection(caseData.id))) {
      showToast(tGrossingNav('synopticReportPage.toast.billingCorrectionNotPermitted'), 'warning');
      return;
    }
    if (!(await billingReviewAllowed())) return;
    const { specimenId, blockId, oldCode, stainOrderId } = pending;
    const postSignoutContext = await postSignoutReason(`${oldCode} \u2192 ${newCode}.`);
    if (postSignoutContext === null) return;

    if (blockId) {
      updateBillableMaterial(specimenId, blockId, { coding: codingWithCorrection(findCaseBlock(specimenId, blockId)?.coding, oldCode, newCode, stainOrderId) });
    } else {
      if (await saveSpecimensNow(sp => specimensWithBaseCodeCorrected(sp, specimenId, oldCode, newCode), { allOrNothing: true }) !== 'saved') return;
    }

    if (!isOrchestrationMode) return; // assist mode: RVU-tracking code change only, no financial transaction
    await recordCaseCodeCorrection({ caseData, specimenId, blockId, oldCode, newCode, user: signingUser, postSignoutContext });
  };

  const handleAddSpecimenBaseCode = async (specimenId: string, code: string) => {
    if (!(await billingReviewAllowed())) return;
    const postSignoutContext = await specimenPostSignoutReason('added', code);
    if (postSignoutContext === null) return;
    if (await saveSpecimensNow(sp => specimensWithBaseCodeAdded(sp, specimenId, code), { allOrNothing: true }) !== 'saved') return;
    recordChargeTransaction(specimenId, undefined, code, postSignoutContext);
  };

  // PS-93: which of a matrix-block stain's cores the pathologist confirmed as
  // evaluated (the billing trigger; never defaulted from targetSpecimenIds).
  const handleSetMatrixEvaluatedCores = async (matrixBlockId: string, stainOrderId: string, evaluatedSpecimenIds: string[]) => {
    if (!(await billingReviewAllowed())) return;
    const matrixBlock = (caseData?.matrixBlocks ?? []).find(mb => mb.id === matrixBlockId);
    if (!matrixBlock) return;
    handleUpdateMatrixBlock(matrixBlockId, { slides: matrixSlidesWithEvaluatedCores(matrixBlock.slides, stainOrderId, evaluatedSpecimenIds) });
  };

  // PS-93: a matrix-block code for one specimen's cores, kept on
  // Specimen.matrixBlockCoding (not on a block).
  const handleApplyMatrixBillingCode = async (specimenId: string, matrixBlockId: string, code: string, stainOrderId?: string) => {
    if (!(await billingReviewAllowed())) return;
    const postSignoutContext = await specimenPostSignoutReason('added', code);
    if (postSignoutContext === null) return;
    if (await saveSpecimensNow(sp => specimensWithMatrixCode(sp, specimenId, matrixBlockId, code, stainOrderId, 'applied'), { allOrNothing: true }) !== 'saved') return;
    recordChargeTransaction(specimenId, undefined, code, postSignoutContext);
  };

  const handleRejectMatrixBillingCode = async (specimenId: string, matrixBlockId: string, code: string, stainOrderId?: string) => {
    if (!(await billingReviewAllowed())) return;
    await saveSpecimensNow(sp => specimensWithMatrixCode(sp, specimenId, matrixBlockId, code, stainOrderId, 'rejected'), { allOrNothing: true });
  };

  // Real gate, per direct request: sign-out checks, using the exact
  // same real computeCaseCodingSummary the billing tab itself renders
  // from, whether anything is genuinely pending. Fetches stain types
  // on demand here rather than keeping them in page-level state for
  // the whole page's lifecycle, since they're only needed at the
  // moment sign-out is actually clicked. A rough, stain-count-only
  // heuristic was considered and rejected - it would have flagged any
  // block with unrelated stains (e.g. a plain H&E) as pending, since
  // it couldn't tell which stains genuinely trigger a real suggestion.
  //
  // Real restriction, per direct requirement: "we should only bill on
  // orchestration cases. LIS will handle the billing in assist mode."
  // Uses the app's own established isOrchestrationMode (reportingMode
  // === 'orchestrator'), not a bare !== 'assist' check - that inverse
  // would have also caught a genuinely undefined/missing reportingMode
  // (older records), which isOrchestrationMode's own comment
  // deliberately does NOT treat as orchestration. A non-orchestration
  // case skips this whole check and proceeds straight to sign-out,
  // exactly as it did before this feature existed.
  const handleSignOutClick = async () => {
    if (!isOrchestrationMode) { setShowSignOutModal(true); return; }
    const stainTypesRes = await stainTypeService.getAll();
    const activeStainTypes = stainTypesRes.ok ? stainTypesRes.data.filter(s => s.active) : [];
    const summary = computeCaseCodingSummary((caseData?.specimens ?? []) as any, activeStainTypes, (caseData?.matrixBlocks ?? []) as any);
    const hasPending = summary.some(sp => sp.blocks.some(b => b.unappliedSuggestions.length > 0) || sp.matrixBlockContributions.some(mb => mb.unappliedSuggestions.length > 0));
    if (hasPending) {
      setActiveReportType('billing');
    } else {
      setShowSignOutModal(true);
    }
  };

  const {
    showLogoutModal,  setShowLogoutModal,
    isProfileOpen,    setIsProfileOpen,
  } = useSynopticModals();


  // ── Print the formatted centre pane report ───────────────────────────────
  // Calls the render_report Cloud Function (Python/ReportLab) for a real
  // structured PDF, built from the same resolvedContext/orchSections the
  // on-screen preview renders — falls back to the old DOM-print path if
  // the function call fails for any reason. Relocated here (was near the
  // top of the component) because it depends on orchSections,
  // resolvedContext, resolvedTemplateName, resolvedBy, and showToast, none
  // of which exist yet earlier in this render pass.
  const [isPrinting, setIsPrinting] = useState(false);
  // Real feature, per direct specification: Post-Sign-Out Release
  // Buffer, closing a known gap flagged in Phase 3's own delivery
  // notes. BottomActionBar.tsx's CoPilot print button was gated to
  // this same restriction; this file's own, separate Orchestration
  // print handler (handleOrchPrint, below) was not — a real,
  // previously-undiscovered second print entry point outside that
  // component's own scope. Same real pattern: fetched only when
  // genuinely relevant (case is pending-release), never a silent
  // block — a real confirmation naming the watermark, not a
  // disabled button with no explanation.
  const [orchPrintRestricted, setOrchPrintRestricted] = useState(false);
  useEffect(() => {
    if (caseData?.status !== 'pending-release') return;
    reportReleaseService.getOrgDefault().then(res => {
      if (res.ok) setOrchPrintRestricted(res.data.restrictHardcopyPrinting);
    });
  }, [caseData?.status]);
  // Batch 610 (#83): signing the case out finishes the work delegated to this
  // user, so it leaves "Delegated to me". Only a change seen on this page counts
  // (not a case that was already signed out when opened).
  const lastSeenStatusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const status = caseData?.status;
    const before = lastSeenStatusRef.current;
    lastSeenStatusRef.current = status;
    const signedNow = status === 'pending-release' || status === 'finalized';
    const signedBefore = before === 'pending-release' || before === 'finalized';
    if (!signedNow || signedBefore || before === undefined || !caseData?.id || !signingUser?.id) return;
    void completeDelegatedWork(delegationService, caseData.id, signingUser.id);
  }, [caseData?.status, caseData?.id, signingUser?.id]);
  // Batch 613: the intraoperative diagnosis and the attached related cases, for the preview.
  const [intraopDiagnosisText, setIntraopDiagnosisText] = useState<string | null>(null);
  const [attachedRelated, setAttachedRelated] = useState(() => attachedRelatedCases(caseData?.id));
  useEffect(() => {
    if (!caseData?.id) return;
    let live = true;
    void loadIntraopDiagnosisForCase(caseData.id).then(text => { if (live) setIntraopDiagnosisText(text); });
    return () => { live = false; };
  }, [caseData?.id, caseData?.status]);
  useEffect(() => {
    const sync = () => setAttachedRelated(attachedRelatedCases(caseData?.id));
    sync();
    return subscribeRelatedCaseAttachments(sync);
  }, [caseData?.id]);
  // What the pathologist saw is fixed at sign-out: freeze it once the case is signed out or released.
  useEffect(() => {
    const st = caseData?.status;
    if (!caseData?.id || !signingUser?.id) return;
    if (st === 'pending-release' || st === 'finalized' || st === 'closed') freezeRelatedCases(caseData.id, signingUser.id);
  }, [caseData?.id, caseData?.status, signingUser?.id]);
  // Automatic merge-on-claim trigger — unifies "claimed from Pool" and
  // "opened directly" into one check, since PoolClaimModal already
  // navigates here after a successful claim. Set once per case-load
  // (see caseRouter.getCase(...).then(...) below) if a pending intraop
  // entry matches this case's own patient/mrn/surgeon/accession info.
  const [intraopMatch, setIntraopMatch] = useState<EntryMatch | null>(null);

  // Previously an anonymous inline closure on IntraopMergePromptModal's
  // onMergeNow JSX prop. The JSX conditional ({intraopMatch && caseData &&
  // ...}) that used to guarantee both were non-null no longer applies once
  // extracted, hence the explicit guard here.
  const handleIntraopMergeNow = useCallback(async () => {
    if (!intraopMatch || !caseData) return;
    await intraoperativeService.merge(intraopMatch.entry.id, caseData.id, {
      matchType: intraopMatch.matchType,
      confidence: intraopMatch.confidence,
      wasManualOverride: false, // this modal only offers Merge Now / Go to Queue Later / Dismiss — no manual case-ID entry
      performedBy: signingUser?.name ?? unknownUserName,
    });
    showToast(tGrossingNav('synopticReportPage.toast.intraopMerged', { caseId: caseData.id }), 'success', { containsPhi: true });
    setIntraopMatch(null);
  }, [intraopMatch, caseData, signingUser, unknownUserName, showToast, tGrossingNav]);

  // Previously an anonymous inline closure on AddOrdersModal's onAddBlock
  // JSX prop — a genuinely separate flow from useSpecimenBlockManagement's
  // handleAddBlock (that one's the Material Tree Panel's direct add; this
  // one is the Add Orders modal's cassette-label + note flow).
  const handleAddBlockWithCassette = useCallback(async (specimenId: string, cassetteLabel: string, note: string) => {
    if (!caseData) return;
    const nowIso = new Date().toISOString();

    // Append to the case-level narrative — this is what actually
    // feeds generateAiSuggestionsForReport and the assembled
    // report document, per the earlier discussion on where this
    // text needs to land to have real downstream effect.
    const existingGross = caseData.diagnostic?.grossDescription ?? '';
    const updatedGross = existingGross ? `${existingGross}\n\n${note}` : note;

    // Mirror into the specimen's own grossing instance too, for
    // local per-specimen context — bump total_cassettes and
    // append the cassette label to cassette_key if the specimen
    // already has a grossing report; append the note to its
    // comments field either way.
    const grossingReports = ((caseData as any).grossingReports ?? []).map((g: any) => {
      if (g.specimenId !== specimenId) return g;
      const prevCount = Number(g.answers?.total_cassettes ?? 0) || 0;
      const prevKey   = g.answers?.cassette_key ?? '';
      return {
        ...g,
        answers: {
          ...g.answers,
          total_cassettes: prevCount + 1,
          cassette_key: prevKey ? `${prevKey}, ${cassetteLabel}` : cassetteLabel,
        },
        comments: g.comments ? `${g.comments}\n${note}` : note,
        updatedAt: nowIso,
      };
    });

    const updated = {
      ...caseData,
      diagnostic: { ...caseData.diagnostic, grossDescription: updatedGross },
      grossingReports,
      updatedAt: nowIso,
    } as any;
    setCaseData(updated);
    try {
      await savePagePatch(caseData.id, { diagnostic: updated.diagnostic, grossingReports } as any);
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        setConcurrencyConflict({ actualVersion: e.actualVersion });
        return;
      }
      console.error(e);
    }
    markDirty('grossDescription');
    showToast(tGrossingNav('synopticReportPage.toast.blockRecutAdded'));
    setShowAddOrdersModal(false);
  }, [caseData, setCaseData, setConcurrencyConflict, markDirty, showToast, setShowAddOrdersModal, savePagePatch, tGrossingNav]);

  // Previously an anonymous inline closure on AddSynopticModal's onAdd JSX
  // prop — adds new synoptic report instances, and if the case is already
  // finalized, starts a real amendment draft so the triage tile can track
  // it (see handleFinalizeConfirm for where it's actually released).
  const handleAddSynopticReports = useCallback(async (newInstances: any[], updatedCase: Case) => {
    // Batch 540 (Pete): an addendum to a finalized case waits until its report is out of the release delay.
    if (caseData?.status === 'finalized' && caseData.id && !(await revisionAllowedNow(caseData.id))) {
      showToast(tGrossingNav('useAmendmentWorkflow.toast.inReleaseDelay'), 'warning');
      return;
    }
    markDirty('synopticReports');
    setActiveReportInstanceId(newInstances[0].instanceId);
    setActiveSpecimenId(newInstances[0].specimenId);

    // Real gap, caught directly: this flow never touched
    // amendmentService at all — meaning the triage tile (which
    // only queries amendmentService) had no way to see or track
    // an addendum created this way, even though this is the
    // actual mechanism a real addendum uses. Fixed: create a
    // real draft record here, mark this specific instance with
    // pendingAddendumId, and release it only when that instance
    // is actually finalized (see handleFinalizeConfirm) — not
    // immediately, so it genuinely stays visible in triage
    // until sign-out, for both modes, not just CoPilot.
    let finalCaseData = updatedCase;
    if (caseData?.status === 'finalized' && caseData?.id) {
      const draftRes = await amendmentService.startDraft({
        caseId: caseData.id, type: 'addendum',
        authoringPathologist: { userId: signingUser?.id ?? 'unknown', userName: signingUser?.name ?? unknownUserName },
      });
      if (draftRes.ok) {
        const markedReports = ((updatedCase as any).synopticReports ?? []).map((r: any) =>
          r.instanceId === newInstances[0].instanceId ? { ...r, pendingAddendumId: draftRes.data.id } : r
        );
        finalCaseData = { ...updatedCase, synopticReports: markedReports } as any;
      }

      // No send here — transmission happens at actual
      // finalization of this instance (see handleFinalizeConfirm),
      // not at creation. Sending here, before any real content
      // exists or the pathologist has finished it, was the same
      // "clear before confirmed" ordering mistake already fixed
      // for amendments.
    }
    setCaseData(finalCaseData);
  }, [markDirty, caseData, signingUser, unknownUserName, setCaseData, showToast, tGrossingNav]);

  // Previously an anonymous inline closure on CaseCommentModal's
  // onAddComment JSX prop — append-only case-level comment.
  const handleAddCaseComment = useCallback(async (text: string) => {
    // Append-only — a new CaseComment record, never overwriting
    // anything already posted. Fixed June 2026: this used to be
    // a single string, silently overwritten by whoever saved
    // last, with no record of who wrote what or when.
    if (!caseData?.id) return;
    const newComment: CaseComment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      authorId: signingUser?.id ?? 'unknown',
      authorName: signingUser?.name ?? unknownUserName,
      text,
      createdAt: new Date().toISOString(),
      origin: 'pathscribe',
      syncStatus: 'pending',
      // Real feature, per direct follow-up: "Stamp every saved
      // draft... with... station_id captured at the exact moment of
      // saving."
      stationId: getEffectiveScanStationId(),
    };
    const updatedComments = [...caseComments, newComment];
    const patch = { order: { ...caseData.order, caseComments: updatedComments } };
    try {
      await savePagePatch(caseData.id, patch as any);
      setCaseData(prev => prev ? ({ ...prev, ...patch } as typeof prev) : prev);
      markDirty('caseComment');
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        // Comments are naturally append-only, so an actual field-
        // level merge (union both comment lists rather than
        // whole-array reload-or-override) would avoid needing
        // user intervention at all here — worth building later,
        // not attempted in this pass. Standard treatment for now,
        // consistent with everything else.
        setConcurrencyConflict({ actualVersion: e.actualVersion });
        return;
      }
      console.error('[CaseComment] Failed to persist:', e);
    }
  }, [caseData, signingUser, unknownUserName, caseComments, setCaseData, markDirty, setConcurrencyConflict, savePagePatch]);

  // Previously an anonymous inline closure on ReportCommentModal's
  // onAddComment JSX prop — append-only specimen-level comment.
  const handleAddSpecimenComment = useCallback(async (text: string) => {
    // Append-only — fixed June 2026, same reasoning as the case
    // comment thread: this used to be a single string, silently
    // overwritten by whoever saved last, with no author or
    // timestamp recorded at all.
    if (!caseData?.id) return;
    const newComment: CaseComment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      authorId: signingUser?.id ?? 'unknown',
      authorName: signingUser?.name ?? unknownUserName,
      text,
      createdAt: new Date().toISOString(),
      origin: 'pathscribe',
      syncStatus: 'pending',
      // Real feature, per direct follow-up: "Stamp every saved
      // draft... with... station_id captured at the exact moment of
      // saving... specimen-log."
      stationId: getEffectiveScanStationId(),
    };
    const patchedSpecimens = (caseData.specimens ?? []).map((sp: any) =>
      sp.id === activeSpecimenCommentId ? { ...sp, comments: [...(sp.comments ?? []), newComment] } : sp
    );
    const patch = { specimens: patchedSpecimens };
    try {
      await savePagePatch(caseData.id, patch as any);
      setCaseData(prev => prev ? ({ ...prev, ...patch } as typeof prev) : prev);
      markDirty('specimenComment');
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        setConcurrencyConflict({ actualVersion: e.actualVersion });
        return;
      }
      console.error('[SpecimenComment] Failed to persist:', e);
    }
  }, [caseData, signingUser, unknownUserName, activeSpecimenCommentId, setCaseData, markDirty, setConcurrencyConflict, savePagePatch]);


  // PS-282 (Batch 437): every report print is audited (print or reprint,
  // version, destination, status, and a reason when the lab asks for one).
  // Pressing Print plans it first: a reprint may need a reason, and a
  // Pending Release report says its copy carries the watermark (this was a
  // window.confirm in English).
  const [printPlan, setPrintPlan] = useState<PrintPlan | null>(null);
  // Batch 495 (PS-283 §4.2.2): revision status for the printed report's header.
  const reportRevisionStatus = useReportRevisionStatus(caseData);

  // Batch 538 (Pete, Oct 12: "the preview matches exactly what gets sent out"): the one payload
  // the report renderer gets, for the PDF that is released and for the preview and print alike.
  // Only the watermark depends on why it is rendered (services/reports/resolveReportWatermark.ts):
  // an unsigned print says PRELIMINARY; the released report never does. Before, print built its
  // own payload separately.
  // Batch 538: the report's watermark for a purpose, in the report's language (resolveReportWatermark.ts).
  // Used by the payload builder and, before it, by printing, so a browser-print fallback after a
  // failed build still carries PRELIMINARY.
  const reportWatermarkFor = useCallback(async (purpose: ReportRenderPurpose): Promise<string | undefined> => {
    if (!caseData) return undefined;
    const reportT = await reportTranslateFor(caseData.order?.facilityId);
    return resolveReportWatermarkText(
      { status: caseData.status, purpose },
      { releaseBufferText: async () => { const cfg = await reportReleaseService.getOrgDefault(); return cfg.ok ? cfg.data.watermarkText : undefined; }, t: reportT },
    );
  }, [caseData]);

  const buildReportRenderPayload = useCallback(async (outputFormat: 'pdf' | 'text', purpose: ReportRenderPurpose = 'final-snapshot') => {
    if (!caseData) throw new Error('No case data available.');
    const accession = caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? '';
    const patient = caseData.patient ? `${caseData.patient.lastName}, ${caseData.patient.firstName}` : '';
    // Batch 392 (Pete): the report is written in the performing lab's language;
    // its labels and date of birth go to the renderer in that language.
    const reportLocale = await resolveReportLocaleForFacility(caseData.order?.facilityId);
    // Batch 606 (PS-37): a split '26' report also carries the technical lab's own branding block.
    const splitBranding = caseData.order?.technicalComponentFacilityId
      ? await (async () => {
          const all = await facilityService.getAll();
          if (!all.ok) return {};
          return resolveSplitReportBranding(all.data.find(f => f.id === caseData.order?.facilityId), caseData.order?.technicalComponentFacilityId, all.data);
        })()
      : {};
    // Batch 498 (PS-283 §4.2.2): the report's revision status, dates in the report locale.
    const amendmentsRes = await amendmentService.getByCaseId(caseData.id);
    const revision = buildReportRenderRevision(
      resolveReportRevisionStatus(caseData, amendmentsRes.ok ? amendmentsRes.data : []),
      reportLocale.locale,
    );

    // Real bug, confirmed directly: resolvedContext is only ever set
    // when isOrchestrationMode is true (see the useEffect that calls
    // buildContext — it returns immediately otherwise). That means
    // every field pulling from it here — bodyAssembly, synopticAnswers
    // — was silently an empty array for CoPilot, producing a blank
    // PDF with a real HTTP 200 response, not an error. For CoPilot,
    // build the answers directly from the case's own synopticReports,
    // resolving each instance's own template — same resolveAnswers
    // function Orchestration already uses, not a separate, lesser
    // implementation.
    let copilotSynopticAnswers: any[] = [];
    if (!isOrchestrationMode) {
      const templateModule = await import('@/services/templates/templateService');
      const instances = caseData.synopticReports ?? [];
      const resolved = await Promise.all(instances.map(async (inst: any) => {
        const detail = await templateModule.getTemplate(inst.templateId);
        if (!detail) return [];
        return resolveAnswers(inst.answers ?? {}, detail.template, partGridRowsOf(caseData.specimens));
      }));
      copilotSynopticAnswers = resolved.flat();
    }

    // Real feature, per direct specification: Post-Sign-Out Release
    // Buffer, Phase 3 (spec §14b — a printed PDF during the buffer window
    // carries the real, configured watermark). Batch 540 (Pete): a released
    // PDF ('final-snapshot') never does, since it is what goes out when the
    // delay ends (resolveReportWatermark.ts). Only fetched when relevant.
    const watermarkText = await reportWatermarkFor(purpose);

    // Real, per direct guidance's own cross-jurisdiction pre-analytic
    // compliance research: a mandatory report disclaimer is required
    // whenever any specimen on this case was signed out on an
    // administrative-override date (see PreAnalyticDateGateModal /
    // resolvePreAnalyticDateGateConfig.ts). Same honest posture as
    // watermarkText above - this app sends the real, resolved,
    // jurisdiction-specific text to the separate PDF rendering
    // service, but can't itself verify that service actually draws
    // it onto the page.
    const usedPreAnalyticOverride = (caseData.specimens ?? []).some(
      (sp: any) => sp.collectedAtAdministrativeOverride || sp.receivedAtAdministrativeOverride
    );
    const preAnalyticDisclaimerText = usedPreAnalyticOverride
      ? resolvePreAnalyticDateGateConfig(getOrganisationByHospitalId(caseData.originHospitalId)?.country).disclaimerText
      : undefined;

    return {
      templateName: resolvedTemplateName,
      resolvedBy,
      institution: getInstitution(caseData.originHospitalId),
      caseHeader: {
        accession, patient,
        mrn: caseData.patient?.mrn ?? '',
        dob: formatReportDateOfBirth(caseData.patient?.dateOfBirth, reportLocale.locale),
        referring: caseData.order?.facilityName ?? '',
        clinician: caseData.order?.requestingProvider ?? '',
      },
      bodyAssembly:    resolvedContext?.narrativeTemplate.bodyAssembly ?? [],
      headerAssembly:  resolvedContext?.narrativeTemplate.headerAssembly ?? [],
      footerAssembly:  resolvedContext?.narrativeTemplate.footerAssembly ?? [],
      sections:        orchSections,
      renderScope:     buildRenderScope(caseData),
      synopticAnswers: isOrchestrationMode ? (resolvedContext?.synoptics?.flatMap(s => s.answers) ?? []) : copilotSynopticAnswers,
      // Batch 609 (PS-35): render_report draws the header, body and footer text
      // style, and the header and footer parts above (functions/main.py).
      documentStyle:   resolvedContext?.narrativeTemplate.documentStyle,
      // Batch 612: the template's font size units ("pt" or "legacy_px"), for a style or label with none of its own.
      ...(resolvedContext?.narrativeTemplate.fontUnits ? { fontUnits: resolvedContext.narrativeTemplate.fontUnits } : {}),
      // Drawn diagonally on every page by render_report since Batch 498.
      // Absent (not an empty string) for any case that isn't 'pending-release'.
      watermarkText,
      // Genuinely absent unless a real administrative override was
      // used on this case — see this block's own comment above.
      preAnalyticDisclaimerText,
      // Real, per direct guidance: the render_report function defaults
      // to 'pdf' when this is absent — sent explicitly here regardless,
      // so this payload's own shape states its real intent rather than
      // relying on the backend's own default matching whatever the
      // caller happened to mean.
      outputFormat,
      // Batch 606 (PS-36): the lab's page size and margins (Document Style).
      pageSetup: renderPageSetup(),
      ...(technicalBrandingForRender(splitBranding, caseData.status) ? { technicalBranding: technicalBrandingForRender(splitBranding, caseData.status) } : {}), // Batch 618: signed-out reports only
      // Batch 392: the report's language, and the wording around it in that language.
      language: reportLocale.language,
      labels: surgicalReportLabelsFor(reportLocale.language),
      // Batch 498 (PS-283, PS-333): render_report draws the revision banner and,
      // next to the accession barcode in the footer, the record version.
      revision,
      documentVersion: typeof caseData.version === 'number' ? caseData.version : undefined,
      // Batch 461: the anatomical maps the pathologist inserted (snapshots, print colours);
      // Batch 463: and the maps that are part of the report (Mohs), drawn now in the report's language.
      reportFigures: await reportFiguresWithAuto(caseData, i18nForDates.getFixedT(reportLocale.language) as never),
      // Batch 613: the intraoperative diagnosis is part of the case report, and the related cases
      // the signer attached are printed exactly as they were when seen at sign-out.
      intraoperativeDiagnosis: await loadIntraopDiagnosisForCase(caseData.id),
      relatedCases: attachedRelatedCases(caseData.id),
    };
  }, [caseData, resolvedTemplateName, resolvedBy, resolvedContext, orchSections, isOrchestrationMode, i18nForDates, reportWatermarkFor]);

  const printReport = useCallback(async (plan: PrintPlan, reason: string) => {
    if (!caseData) { window.print(); return; }
    // Batch 495 (PS-283 §4.2.4): printing a case report needs
    // report:case-report:print for the case's facility. Refused: no PDF, no print.
    // Batch 516: and a VIP/confidential case also needs report:restricted-case:print.
    const printCheck = await checkReportPrint({ caseId: caseData.id, facilityId: caseData.order?.facilityId ?? null });
    if (printCheck !== 'allowed') {
      showToast(tGrossingNav(printCheck === 'restrictedCase' ? 'reportPrint.restrictedCase' : 'reportPrint.notPermitted'), 'warning');
      return;
    }
    setIsPrinting(true);
    // Batch 516: kept for the browser-print fallback below, so it carries the same watermark.
    let printWatermark: string | undefined;
    const accession = caseData.accession?.fullAccession
      ?? caseData.accession?.accessionNumber ?? '';
    // PS-282 (Batch 451): the entry is built in services/printing/reportPrintAudit.ts.
    const audit = (destination: string, status: 'success' | 'failed' | 'pending', format: 'pdf' | 'html') =>
      void recordDocumentOutput(reportPrintAuditEvent({ action: plan.action, caseRecord: caseData, reason }, { destination, status, format }));
    try {
      // Batch 538 (Pete: the preview must match what is sent): the same payload the released
      // PDF is made from (buildReportRenderPayload); only the watermark differs, an unsigned print
      // saying PRELIMINARY — SUBJECT TO CHANGE in the report's language.
      printWatermark = await reportWatermarkFor('print').catch(() => undefined);
      const payload = await buildReportRenderPayload('pdf', 'print');

      const resp = await fetch(reportPdfEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        throw new Error(`Report PDF generation failed (${resp.status})`);
      }

      // Batch 609 (PS-44): the images attached to this report print after its pages.
      const withImages = await applyCaseReportImagesToBlob({ caseId: caseData.id, accession }, await resp.blob());
      if (withImages.failed) throw new Error(CASE_IMAGES_FAILED);
      const blob = withImages.blob;
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        // Popup blocked — download directly rather than leaving the
        // pathologist with no way to get the PDF at all.
        const a = document.createElement('a');
        a.href = url;
        a.download = `${accession || 'report'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        audit(DOCUMENT_DESTINATION.download(a.download), 'success', 'pdf');
      } else {
        audit(DOCUMENT_DESTINATION.pdfInBrowser, 'pending', 'pdf');
      }
      // Revoke once the new tab/download has had time to load the blob —
      // too soon and an opened tab can lose the document mid-render.
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e: any) {
      showToast(tGrossingNav('synopticReportPage.toast.pdfFailedPrintingScreen', { error: e?.message ?? tGrossingNav('synopticReportPage.toast.unknownError') }), 'warning');
      // Fall back to the old DOM-print path rather than leaving the
      // pathologist with no way to print if the Cloud Function is down.
      const pageEl = document.querySelector('.rp-page') as HTMLElement | null;
      audit(`${DOCUMENT_DESTINATION.browserPrintDialog} (PDF renderer unavailable)`, 'pending', 'html');
      if (!pageEl) { window.print(); return; }
      // Size to most of the available screen rather than a small fixed
      // popup — Chrome's print preview renders inside this window, so a
      // cramped window makes the preview look cramped too, right when the
      // pathologist is checking the report's actual printed appearance.
      const winWidth  = Math.round(window.screen.availWidth  * 0.9);
      const winHeight = Math.round(window.screen.availHeight * 0.9);
      const winLeft   = Math.round((window.screen.availWidth  - winWidth)  / 2);
      const winTop    = Math.round((window.screen.availHeight - winHeight) / 2);
      const win = window.open('', '_blank', `width=${winWidth},height=${winHeight},left=${winLeft},top=${winTop}`);
      if (!win) { window.print(); return; }
      // Batch 516: the fallback page in the report's language too (it was always English).
      const fallbackLocale = await resolveReportLocaleForFacility(caseData.order?.facilityId);
      const fallbackT = await reportTranslateFor(caseData.order?.facilityId);
      win.document.write(`<!DOCTYPE html>
<html lang="${escapeHtml(fallbackLocale.language)}"><head><meta charset="UTF-8"/>
<title>${escapeHtml(fallbackT('reportPrintFallback.windowTitle', { accession }))}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt;
         line-height: 1.6; color: #1a1a1a; background: white; }
  @page { size: A4; margin: 18mm 20mm 22mm 20mm;
    @top-left   { content: "${cssString(accession)}"; font-size: 8pt; color: #666; font-family: Arial, sans-serif; }
    @top-right  { content: "${cssString(fallbackT('reportPrintFallback.confidential'))}"; font-size: 8pt; color: #666; font-family: Arial, sans-serif; }
    @bottom-right { content: counter(page) " / " counter(pages); font-size: 8pt; color: #666; font-family: Arial, sans-serif; }
  }
  .rp-section-badge { display: none; }
  .rp-section-heading { font-size: 11pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; border-left: 3px solid #333; padding: 6px 0 6px 10px;
    margin-bottom: 8pt; }
  .rp-section-body { font-size: 11pt; line-height: 1.7; padding-left: 13px; }
  .rp-section-body p { margin-bottom: 6pt; orphans: 3; widows: 3; }
  .rp-section { margin-bottom: 18pt; }
  .rp-footer-conf, .rp-footer { font-size: 8pt; }
  .rp-revision-banner { margin: 8pt 0; padding: 6pt 10pt; border: 1px solid #b45309; font-family: Arial, sans-serif; }
  .rp-revision-flag { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
  .rp-revision-count { margin-left: 8pt; font-weight: 400; text-transform: none; }
  .rp-revision-dates { font-size: 9pt; }
  .rp-doc-reference { display: flex; align-items: center; gap: 10pt; margin-top: 6pt; font-family: Arial, sans-serif; }
  .rp-doc-reference-barcode { display: inline-block; height: 24pt; width: 130pt; }
  .rp-doc-reference-barcode svg { height: 100%; width: 100%; }
  .rp-doc-reference-text { font-size: 7.5pt; color: #444; }
  .rp-print-watermark { position: fixed; top: 45%; left: 0; right: 0; text-align: center; transform: rotate(-30deg);
    font-family: Arial, sans-serif; font-size: 34pt; font-weight: 700; color: rgba(180, 83, 9, 0.18); pointer-events: none; z-index: 10; }
</style></head><body>${printWatermark ? `<div class="rp-print-watermark">${escapeHtml(printWatermark)}</div>` : ''}${pageEl.outerHTML}</body></html>`);
      win.document.close();
      win.onload = () => { win.focus(); win.print(); win.close(); };
    } finally {
      setIsPrinting(false);
    }
  }, [caseData, buildReportRenderPayload, reportWatermarkFor, showToast, tGrossingNav]);

  const handleOrchPrint = useCallback(async () => {
    if (!caseData) { window.print(); return; }
    const plan = await planReportPrint({
      document: REPORT_DOCUMENT, caseId: caseData.id, caseRecord: caseData,
      pendingReleaseRestricted: caseData.status === 'pending-release' && orchPrintRestricted,
    });
    if (plan.askReason || plan.warnPendingRelease) { setPrintPlan(plan); return; }
    await printReport(plan, '');
  }, [caseData, orchPrintRestricted, printReport]);

  // caseComputationalFlags removed along with the Computational tab —
  // this derivation only ever fed that tab's flag list.

  // ps:suggest-protocols listener removed — nothing dispatches this
  // event anymore. It was fired by the old order-placement flow
  // (Flag.defaultProtocolIds), removed along with the rest of the
  // ordering/result apparatus.

  // Computational voice actions (open/close sidecar, read result,
  // next/prev assay, computational tab, order modal) removed along
  // with the Sidecar, the ordering apparatus, and the Computational
  // tab. Checked every event individually — zero remaining listeners
  // for any of them before removing this block.

  // ── Keyboard shortcuts for Report Draft (Orchestration mode) ──────────────
  useEffect(() => {
    if (!isOrchestrationMode) return;
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const tag  = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Ctrl+S — Save Draft
      if (ctrl && e.key === 's' && leftTab === 'draft') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_SAVE_DRAFT'));
        return;
      }
      // Ctrl+G — Generate Report
      if (ctrl && e.key === 'g' && leftTab === 'draft') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_GENERATE_REPORT'));
        return;
      }
      // Ctrl+Shift+D — Switch to Report Draft
      if (ctrl && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        safeSetLeftTab('draft');
        return;
      }
      // Ctrl+Shift+F — Switch to Full Report
      if (ctrl && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        safeSetLeftTab('report');
        return;
      }
      // Ctrl+Shift+Q — Switch to Sequencer
      if (ctrl && e.shiftKey && e.key === 'Q') {
        e.preventDefault();
        safeSetLeftTab('sequencer');
        return;
      }
      // Alt+1–4 — Jump to section by number (fires custom event for OrchestratorSectionEditor)
      if (e.altKey && !inInput && leftTab === 'draft') {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_JUMP_SECTION', { detail: { index: num - 1 } }));
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOrchestrationMode, leftTab, safeSetLeftTab]);

  // ── Voice actions for Report Draft ──────────────────────────────────────────
  useEffect(() => {
    if (!isOrchestrationMode) return;
    const actions = [
      { id: 'orch_open_draft',     phrases: ['open report draft', 'show report draft', 'go to draft'],              handler: () => safeSetLeftTab('draft')        },
      { id: 'orch_open_report',    phrases: ['open full report', 'show full report', 'view report'],                  handler: () => safeSetLeftTab('report')   },
      { id: 'orch_open_sequencer', phrases: ['open sequencer', 'show sequencer', 'synoptic fields'],                  handler: () => safeSetLeftTab('sequencer')    },
      { id: 'orch_save_draft',     phrases: ['save draft', 'save report', 'save my work'],                           handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_SAVE_DRAFT'))        },
      { id: 'orch_generate',       phrases: ['generate report', 'generate narrative', 'create report', 'generate'],  handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_GENERATE_REPORT'))    },
      { id: 'orch_regen',          phrases: ['regenerate report', 'regenerate all', 'redo report'],                   handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_REGEN_ALL'))                       },
      { id: 'orch_next_section',   phrases: ['next section', 'go to next section'],                                   handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_NEXT_SECTION'))                   },
      { id: 'orch_prev_section',   phrases: ['previous section', 'go back', 'prior section'],                         handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_PREV_SECTION'))                   },
      { id: 'orch_section_1',      phrases: ['go to section one', 'section one', 'first section'],                   handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_JUMP_SECTION', { detail: { index: 0 } })) },
      { id: 'orch_section_2',      phrases: ['go to section two', 'section two', 'second section'],                  handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_JUMP_SECTION', { detail: { index: 1 } })) },
      { id: 'orch_section_3',      phrases: ['go to section three', 'section three', 'third section'],               handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_JUMP_SECTION', { detail: { index: 2 } })) },
      { id: 'orch_section_4',      phrases: ['go to section four', 'section four', 'fourth section'],                handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_JUMP_SECTION', { detail: { index: 3 } })) },

      // ── Dictation actions ────────────────────────────────────────────────
      // "Dictate [section name]" → jump cursor + register dictation target.
      // Pathologist then activates the NavBar mic to start speaking.
      // Section names are matched by partial label — "dictate gross" matches
      // "Specimen & Gross Description", "dictate admin" matches "Administrative
      // & Clinical Header", etc.
      { id: 'orch_dictate_admin',    phrases: ['dictate administrative', 'dictate admin', 'dictate clinical header', 'dictate header'],
        handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_DICTATE_SECTION', { detail: { sectionIndex: 0 } })) },
      { id: 'orch_dictate_gross',    phrases: ['dictate gross', 'dictate gross description', 'dictate specimen', 'dictate macroscopic'],
        handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_DICTATE_SECTION', { detail: { sectionIndex: 1 } })) },
      { id: 'orch_dictate_synoptic', phrases: ['dictate synoptic', 'dictate synoptic summary', 'dictate summary'],
        handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_DICTATE_SECTION', { detail: { sectionIndex: 2 } })) },
      { id: 'orch_dictate_diagnosis', phrases: ['dictate diagnosis', 'dictate ancillary', 'dictate final diagnosis', 'dictate conclusion'],
        handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_DICTATE_SECTION', { detail: { sectionIndex: 3 } })) },
      // Generic — "dictate section two" etc mirrors existing jump pattern
      { id: 'orch_dictate_section_1', phrases: ['dictate section one', 'dictate first section'],   handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_DICTATE_SECTION', { detail: { sectionIndex: 0 } })) },
      { id: 'orch_dictate_section_2', phrases: ['dictate section two', 'dictate second section'],  handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_DICTATE_SECTION', { detail: { sectionIndex: 1 } })) },
      { id: 'orch_dictate_section_3', phrases: ['dictate section three', 'dictate third section'], handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_DICTATE_SECTION', { detail: { sectionIndex: 2 } })) },
      { id: 'orch_dictate_section_4', phrases: ['dictate section four', 'dictate fourth section'], handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_DICTATE_SECTION', { detail: { sectionIndex: 3 } })) },
      { id: 'orch_dark_mode',      phrases: ['dark mode', 'toggle dark mode', 'night mode'],                          handler: () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_TOGGLE_DARK'))                     },
    ];

    const eventListeners: [string, EventListener][] = [];
    actions.forEach(a => {
      (actionRegistryService as any).registerAction?.({
        id: a.id, label: a.phrases[0], phrases: a.phrases,
        event: `PATHSCRIBE_${a.id.toUpperCase()}`, context: 'ORCHESTRATOR', category: 'Report Draft',
      });
      const listener = a.handler as EventListener;
      window.addEventListener(`PATHSCRIBE_${a.id.toUpperCase()}`, listener);
      eventListeners.push([`PATHSCRIBE_${a.id.toUpperCase()}`, listener]);
    });

    return () => eventListeners.forEach(([event, fn]) => window.removeEventListener(event, fn));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrchestrationMode, leftTab]);

  // useSidecar's selectedFlag/isOpen effect removed — it switched
  // leftTab to 'results', a tab that no longer exists (removed along
  // with the Computational tab earlier), on top of depending on the
  // Sidecar itself, which is now gone too. Doubly dead code.

 const {
    flagCaseData, setFlagCaseData: _setFlagCaseData,
    flagDefinitions,
    showFlagManager, setShowFlagManager,
    openFlagManager,
    onApplyFlags,
    onRemoveFlag,
  } = useSynopticFlags(caseId ?? '');

  // ── Voice action execution ───────────────────────────────────────────────────
  // The context activation earlier in this component makes voice
  // recognition correctly match a spoken phrase to one of the SYNOPTIC
  // actions and dispatch it — but dispatching an event that nothing
  // listens for still does nothing. This used to only wire the 4
  // Grossing actions; the other 24 SYNOPTIC actions were recognized by
  // voice but genuinely inert. 20 of those 24 are wired for real below —
  // 4 more (DELEGATE_PEER_REVIEW/FORMAL_CONSULT/FULL_TRANSFER/CONFIRM):
  // CONFIRM is wired inside DelegateModal.tsx (the confirm state lives
  // there); the three type actions are wired below (Batch 610) and hand
  // the preset to the modal.
  //
  // Genuinely NOT wired, on purpose — not silently skipped:
  //   POOL_ACCEPT_CASE / POOL_PASS_CASE — these describe a pool case
  //   before it's been claimed. This page only ever opens an already-
  //   assigned case; there's no "unclaimed pool case" state reachable
  //   from here at all, so wiring these here would be unreachable and
  //   meaningless. They belong on WorklistPage.tsx if built at all.
  //   COMP_ORDER_PLACE / COMP_ORDER_CANCEL — these need to reach inside
  //   whatever renders the actual computational order modal once open
  //   (the "results" tab's own internal state), which wasn't located/
  //   verified this pass. Left inert rather than guessed at.
  //
  // Placed here, after openFlagManager/showTeamModal/etc. are all
  // actually declared, for the same reason as the comment that used to
  // sit above the old, Grossing-only version of this listener: an
  // earlier attempt referencing dependencies before they existed threw
  // on every load. Not repeating that.
  useEffect(() => {
    const unsubscribe = actionRegistryService.onAction((actionId: string) => {
      switch (actionId) {
        // ── Grossing (already wired) ──────────────────────────────────────
        case 'GROSSING_NEXT_BLOCK':
          setFocusedBlockIndex(i => Math.min(i + 1, allBlocks.length - 1));
          break;
        case 'GROSSING_PREVIOUS_BLOCK':
          setFocusedBlockIndex(i => Math.max(i - 1, 0));
          break;
        case 'GROSSING_MARK_GROSSED':
          handleAdvanceFocusedBlockStatus();
          break;
        case 'GROSSING_CONFIRM_TRIAGE':
          handleConfirmTriage();
          break;

        // ── Delegation entry point (the 4 sub-actions live inside ──────────
        // ── DelegateModal.tsx itself, wired separately) ────────────────────
        case 'OPEN_DELEGATE_MODAL':
        case 'DELEGATE_CONSULTATION':
          setDelegatePreset(null);
          setShowDelegateModal(true);
          break;

        // Batch 610 (#83): saying the type opens the dialog with it chosen
        // (and, when the dialog is already open, chooses it there).
        case 'DELEGATE_PEER_REVIEW':
        case 'DELEGATE_FORMAL_CONSULT':
        case 'DELEGATE_FULL_TRANSFER': {
          const typeId = delegationTypeForVoiceAction(actionId);
          if (typeId) setDelegatePreset(prev => ({ typeId, nonce: (prev?.nonce ?? 0) + 1 }));
          setShowDelegateModal(true);
          break;
        }

        // Batch 489: real fix — this action was declared in
        // constants/systemActions.ts ("Submit to Tumor Board") and
        // recognized by voice/keyboard, but never wired to any handler
        // anywhere in the app until now.
        case 'delegation.tumorBoard':
          setShowFlagForMdtModal(true);
          break;

        // Real, per direct follow-up ("the actions list is out of sync...
        // voice control... has to be flawless"): registering this action
        // alone isn't enough — without a real case here, saying "return to
        // trainee" would match, execute, and silently do nothing.
        // handleReturnToTrainee() already has its own real validation
        // (requires feedback text) — calling it directly behaves
        // correctly either way: submits what's already typed into
        // CaseSignOutModal.tsx's own textarea if the modal is open with
        // feedback entered, or surfaces that same existing "Feedback is
        // required" message otherwise, matching a physical button click.
        case 'RETURN_TO_TRAINEE':
          handleReturnToTrainee();
          break;

        // Real, per direct follow-up (same "flawless" pass as
        // RETURN_TO_TRAINEE above): handleRecall() lives inside
        // ReleaseBufferBanner.tsx, a separate child component — same
        // real CustomEvent pattern the AI_REVIEW_* cases just above
        // already use for exactly this "handler lives in a child
        // component" situation, not a new mechanism.
        case 'RECALL_REPORT':
          window.dispatchEvent(new CustomEvent('PATHSCRIBE_RECALL_REPORT'));
          break;

        // ── AI Review — this modal already has its own window-event ───────
        // ── listener for these exact 4 events; just dispatching them, ──────
        // ── not duplicating the logic. ─────────────────────────────────────
        case 'AI_REVIEW_CONFIRM':
          window.dispatchEvent(new CustomEvent('PATHSCRIBE_AI_REVIEW_CONFIRM'));
          break;
        case 'AI_REVIEW_OVERRIDE':
          window.dispatchEvent(new CustomEvent('PATHSCRIBE_AI_REVIEW_OVERRIDE'));
          break;
        case 'AI_REVIEW_SKIP':
          window.dispatchEvent(new CustomEvent('PATHSCRIBE_AI_REVIEW_SKIP'));
          break;
        case 'AI_REVIEW_CANCEL':
          window.dispatchEvent(new CustomEvent('PATHSCRIBE_AI_REVIEW_CANCEL'));
          break;

        // ── Case Team — CASE_TEAM_ADD/ASSIGN match the existing window- ────
        // ── event scope already in this file: they open the modal, they ───
        // ── don't yet pre-select a specific member or role within it. ──────
        case 'OPEN_CASE_TEAM':
        case 'CASE_TEAM_ADD':
        case 'CASE_TEAM_ASSIGN':
          setShowTeamModal(true);
          break;

        // Computational Sidecar voice cases (COMP_OPEN_SIDECAR,
        // COMP_ORDER_OPEN) removed — both dispatched events with zero
        // remaining listeners, tied to the Sidecar/order apparatus
        // removed elsewhere.

        // ── Flags — FLAG_APPLY_STAT opens the manager rather than ──────────
        // ── attempting a direct apply; ApplyFlagPayload's exact shape ──────
        // ── (case vs. specimen scoping) wasn't verified this pass, and a ───
        // ── wrong guess here risks a silent, wrong flag application — ──────
        // ── opening the manager for a real, deliberate click is safer. ─────
        case 'FLAG_OPEN_MANAGER':
        case 'FLAG_APPLY_STAT':
          openFlagManager(caseData);
          break;

        // ── Add Orders — four separate ids so "add block" lands directly
        // on that tab rather than opening generically and requiring a
        // manual tab click, same reasoning as the FLAG_APPLY_STAT
        // comment above but the opposite conclusion: here there's no
        // ambiguous-shape risk, just which tab opens first, so going
        // straight there is safe.
        case 'ADD_ORDERS':
          setAddOrdersInitialTab(undefined);
          setShowAddOrdersModal(true);
          break;
        case 'ADD_ORDERS_BLOCK':
          setAddOrdersInitialTab('blocks');
          setShowAddOrdersModal(true);
          break;
        case 'ADD_ORDERS_STAIN':
          setAddOrdersInitialTab('stains');
          setShowAddOrdersModal(true);
          break;
        case 'ADD_ORDERS_SPECIMEN':
          setAddOrdersInitialTab('specimens');
          setShowAddOrdersModal(true);
          break;

        // ── Save/Discard — reuses the real, existing save mechanism ────────
        // ── (the same one Ctrl+S and the Save Draft button use), not a ─────
        // ── new one. Scoped to Orchestration-mode cases specifically: the ──
        // ── PATHSCRIBE_ORCH_SAVE_DRAFT listener is only ever registered ────
        // ── when isOrchestrationMode is true, matching "Report Draft" ──────
        // ── being an orchestration-mode concept. Discard reloads from the ──
        // ── last saved state rather than trying to manually unwind local ───
        // ── React state, which is safer given how many places touch it. ────
        case 'SAVE_DRAFT':
          window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_SAVE_DRAFT'));
          break;
        case 'DISCARD_CHANGES':
          clearDirty();
          window.location.reload();
          break;

        case 'TEMPLATE_SELECT':
          setShowCentreTemplatePicker(true);
          break;
      }
    });
    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handleReturnToTrainee comes from useSignOutWorkflow further down (listing it here would read it before it exists); caseData, listed, re-subscribes when the case changes
  }, [
    allBlocks.length, handleAdvanceFocusedBlockStatus, handleConfirmTriage, setFocusedBlockIndex,
    openFlagManager, clearDirty, caseData,
  ]);


  // Tracks whether onApplyFlags/onRemoveFlag fired during this modal session
  // Watch caseFlags/specimenFlags — set dirty any time they change after initial load.
  // Works regardless of which modal or callback applied the change.
  const initialFlagsKey = React.useRef<string | null>(null);

  // When caseFlags or specimenFlags change after load → mark dirty
  React.useEffect(() => {
    if (!isLoaded || !caseData) return;
    const key = JSON.stringify([
      (caseData.caseFlags ?? []).map(f => f.id),
      (caseData.specimens ?? []).map(sp => (sp.specimenFlags ?? []).map(f => f.id)),
    ]);
    if (initialFlagsKey.current === null) {
      initialFlagsKey.current = key;
      return;
    }
    if (key !== initialFlagsKey.current) {
      markDirty('flags');
      initialFlagsKey.current = key;
    }
  }); // intentionally no dep array — runs after every render but only acts when key changes

  // Note: computational tab (results) is freely accessible regardless of unsaved state.
  // The unsaved state warning fires at finalize/navigate time instead.

  const guard = useCallback((path: string, state?: object) => {
    // Remap /worklist → /search when the user arrived from a search result
    const dest = (path === '/worklist' && navSource === 'search') ? '/search' : path;
    // Tell SearchPage to restore previous results when returning to it
    if (dest === '/search') markReturnToSearch();
    if (shouldWarnDirty()) { setPendingNavigation(dest); return; }
    navigate(dest, state ? { state } : undefined);
  }, [shouldWarnDirty, navSource, navigate]);

  // ── Jump to field — Cannot Finalise + PreFinalisationModal ─────────────────
  // Uses the existing scrollToField/alertFieldId mechanism in RightSynopticPanel
  // which has fieldRefs wired to actual DOM elements via useImperativeHandle.
  React.useEffect(() => {
    const handler = (e: Event) => {
      const { fieldKey } = (e as CustomEvent).detail ?? {};
      if (!fieldKey) return;
      safeSetLeftTabRef.current('draft');
      // Small delay to let the tab switch render before scrolling
      setTimeout(() => setAlertFieldId(fieldKey), 100);
    };
    window.addEventListener('PATHSCRIBE_JUMP_TO_FIELD', handler);
    return () => window.removeEventListener('PATHSCRIBE_JUMP_TO_FIELD', handler);
  }, []);

  React.useEffect(() => {
    const openTeam = () => setShowTeamModal(true);
    window.addEventListener('PATHSCRIBE_OPEN_CASE_TEAM',   openTeam);
    window.addEventListener('PATHSCRIBE_CASE_TEAM_ADD',    openTeam);
    window.addEventListener('PATHSCRIBE_CASE_TEAM_ASSIGN', openTeam);
    return () => {
      window.removeEventListener('PATHSCRIBE_OPEN_CASE_TEAM',   openTeam);
      window.removeEventListener('PATHSCRIBE_CASE_TEAM_ADD',    openTeam);
      window.removeEventListener('PATHSCRIBE_CASE_TEAM_ASSIGN', openTeam);
    };
  }, []);

  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedData) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedData]);

  // Block browser back/forward button when dirty.
  // BrowserRouter doesn't support useBlocker, so we use popstate instead.
  React.useEffect(() => {
    if (!hasUnsavedData) return;
    // Push a sentinel so the back button has somewhere to go
    window.history.pushState(null, '', window.location.href);
    const handlePop = () => {
      // Push again to keep the user on this page
      window.history.pushState(null, '', window.location.href);
      setPendingNavigation('__back__');
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [hasUnsavedData]);

  const navigateToCase = useCallback((direction: 'next' | 'prev') => {
    const newIndex = direction === 'next' ? worklistIndex + 1 : worklistIndex - 1;
    if (newIndex >= 0 && newIndex < worklistCases.length) {
      void openCasePage(worklistCases[newIndex], 'synoptic', {
        state: { worklistCaseIds: worklistCases },
      });
    }
  }, [worklistCases, worklistIndex, openCasePage]);

  // Previously an anonymous inline closure on UnsavedWarningModal's
  // onSaveAndLeave JSX prop — saves the draft via the shared
  // saveDraftInternal, then resumes whichever navigation was pending.
  const handleSaveAndLeave = useCallback(async () => {
    // This previously just cleared the dirty flag and showed a
    // "Draft saved" toast without ever actually calling
    // caseRouter.updateCase or writing the localStorage backup —
    // the toast was lying, and navigating away right after threw
    // away orchSections for real, since nothing had persisted it
    // anywhere. Now routed through the same shared saveDraftInternal
    // every other save trigger uses.
    const saved = await saveDraftInternal();
    if (!saved) return; // held by a real conflict — don't proceed with navigation
    if (pendingPath) confirmContextNavigate();
    const dest = pendingNavigation;
    setPendingNavigation(null);
    if (dest === 'next') navigateToCase('next');
    else if (dest === 'prev') navigateToCase('prev');
    else if (dest === '__back__') {
      if (backPath === '/search') markReturnToSearch();
      navigate(backPath);
    }
    else if (dest) navigate(dest);
  }, [saveDraftInternal, pendingPath, confirmContextNavigate, pendingNavigation, setPendingNavigation, navigateToCase, backPath, navigate]);

  // Previously an anonymous inline closure on the "required fields
  // incomplete" alert banner's onClick — decides whether to jump
  // straight to the unanswered field, or confirm first if there's an
  // unsaved AI draft that a tab switch would risk losing.
  const handleAlertBannerClick = useCallback(() => {
    if (isOrchestrationMode && leftTab === 'draft') {
      // Switch to Full Report (shows synoptic panel) then scroll to first required field
      // If unsaved draft, confirm first
      if (hasUnsavedData && orchSections.some(s => s.text)) {
        setPendingTabSwitch('report_and_scroll');
      } else {
        safeSetLeftTab('report');
        setTimeout(() => setAlertFieldId('scroll_to_unanswered'), 150);
      }
    } else {
      setAlertFieldId('scroll_to_unanswered');
    }
  }, [isOrchestrationMode, leftTab, hasUnsavedData, orchSections, setPendingTabSwitch, safeSetLeftTab, setAlertFieldId]);

  // Previously an anonymous inline closure on Sidebar's onEditSpecimen
  // JSX prop — looks up the specimen and opens the edit modal on it.
  const handleEditSpecimen = useCallback((specimenId: string) => {
    const sp = caseData?.specimens?.find(s => s.id === specimenId);
    setEditingSpecimen(sp ?? null);
    setShowSpecimenEdit(true);
  }, [caseData, setEditingSpecimen, setShowSpecimenEdit]);

  // Previously an anonymous inline closure on Sidebar's onDeleteReport
  // JSX prop — removes a synoptic report instance and, if it was the
  // currently active one, falls back to whatever report is now first.
  // Batch 427: "Parts covered" for a draft synoptic workup (services/reports/workupParts.ts).
  const [partsInstanceId, setPartsInstanceId] = useState<string | null>(null);
  const handleApplyWorkupParts = useCallback((choice: { mode: WorkupPartsMode; additionalSpecimenIds: string[] }) => {
    if (!caseData || !partsInstanceId) return;
    const r = setWorkupParts(caseData.synopticReports ?? [], (caseData.specimens ?? []).map(sp => sp.id), partsInstanceId, choice, new Date().toISOString());
    if (r.ok === false) return;
    setCaseData({ ...caseData, synopticReports: r.reports, updatedAt: new Date().toISOString() });
    markDirty('synopticReports');
    setPartsInstanceId(null);
  }, [caseData, partsInstanceId, setCaseData, markDirty]);

  const handleDeleteReport = useCallback((instanceId: string) => {
    if (!caseData) return;
    const remaining = (caseData.synopticReports ?? []).filter(r => r.instanceId !== instanceId);
    const updated: Case = { ...caseData, synopticReports: remaining, updatedAt: new Date().toISOString() };
    setCaseData(updated);
    markDirty('synopticReports');
    if (activeReportInstanceId === instanceId) {
      setActiveReportInstanceId(remaining[0]?.instanceId ?? '');
      setActiveSpecimenId(remaining[0]?.specimenId ?? '');
    }
  }, [caseData, setCaseData, markDirty, activeReportInstanceId, setActiveReportInstanceId, setActiveSpecimenId]);

  // Previously an anonymous inline closure on each "Cannot Finalise"
  // missing-field card's onClick — closes the modal, switches to the
  // Draft tab if in Orchestration mode, and scrolls to the field.
  // Previously an anonymous inline closure on the pending-tab-switch
  // confirmation's "Discard & Switch" button — abandons unsaved changes
  // and completes whichever tab switch was pending.
  const handleDiscardAndSwitchTab = useCallback(() => {
    const dest = pendingTabSwitch;
    setPendingTabSwitch(null);
    // Discard and switch
    clearDirty();
    const tab = dest === 'report_and_scroll' ? 'report' : dest as any;
    safeSetLeftTab(tab);
    if (dest === 'report_and_scroll') {
      setTimeout(() => setAlertFieldId('scroll_to_unanswered'), 150);
    }
  }, [pendingTabSwitch, setPendingTabSwitch, clearDirty, safeSetLeftTab, setAlertFieldId]);

  // Previously an anonymous inline closure on the pending-tab-switch
  // confirmation's "Save & Switch" button — saves via the shared
  // saveDraftInternal first, then completes the pending tab switch.
  const handleSaveAndSwitchTab = useCallback(async () => {
    // Save then switch
    const dest = pendingTabSwitch;
    setPendingTabSwitch(null);
    const saved = await saveDraftInternal();
    if (!saved) return; // held by a real conflict — don't proceed with the tab switch
    const tab = dest === 'report_and_scroll' ? 'report' : dest as any;
    safeSetLeftTab(tab);
    if (dest === 'report_and_scroll') {
      setTimeout(() => setAlertFieldId('scroll_to_unanswered'), 150);
    }
  }, [pendingTabSwitch, setPendingTabSwitch, saveDraftInternal, safeSetLeftTab, setAlertFieldId]);

  const [pendingReconciliation, setPendingReconciliation] = React.useState<{
    specimenId: string; caseType: string; frozenCategory: import('@/types/intraop/IntraoperativeEntry').FrozenCategory; frozenDx: string;
  } | null>(null);


  // Real, per direct guidance (outputFormat: 'text' — the real
  // extension to the render_report Cloud Function, functions/main.py,
  // for buildOruR01Payload.ts's own reportNarrativeText field, "requested
  // from the same real, authoritative rendering service as the PDF").
  // Extracted from generateReportPdfSnapshot's own real payload-
  // construction logic below — the exact same real payload this app
  // already sends for PDF, just with outputFormat added — so both real
  // output formats share one real, single source of truth for what
  // gets sent, never two independently maintained copies that could
  // drift out of sync with each other.
  const generateReportPdfSnapshot = useCallback(async (): Promise<{ pdfBase64?: string; generationError?: string }> => {
    try {
      const payload = await buildReportRenderPayload('pdf');
      const resp = await fetch(reportPdfEndpoint(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!resp.ok) return { generationError: `Report PDF generation failed (${resp.status})` };
      // Batch 609 (PS-44): the images attached to this report go in the released PDF too.
      const withImages = await applyCaseReportImagesToBlob(
        { caseId: caseData?.id, accession: caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber }, await resp.blob());
      if (withImages.failed) return { generationError: CASE_IMAGES_FAILED };
      const blob = withImages.blob;
      const pdfBase64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '');
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return { pdfBase64 };
    } catch (e: any) {
      return { generationError: e?.message ?? 'Unknown error generating PDF snapshot.' };
    }
  }, [buildReportRenderPayload, caseData]);

  // Real, per direct guidance (outputFormat: 'text' — the real
  // extension to the render_report Cloud Function for
  // buildOruR01Payload.ts's own reportNarrativeText field). Real,
  // deliberate, honest scope note: this function is now real and
  // working — verified against the actual render_report source
  // (functions/main.py) directly, not assumed — but no real caller
  // supplies it to buildOruR01Payload() yet as of this change. The
  // one real caller today, Config/System/OutboundMessagePreviewSection.tsx,
  // is deliberately a standalone admin tool with no access to this
  // component's own caseData/resolvedContext closures, so it can't
  // supply this function directly; wiring this into a real ORU^R01
  // dispatch trigger from within this page is real, separate,
  // next-step work, not done here.
  const generateReportTextSnapshot = useCallback(async (): Promise<{ text?: string; generationError?: string }> => {
    try {
      const payload = await buildReportRenderPayload('text');
      const resp = await fetch(reportPdfEndpoint(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!resp.ok) return { generationError: `Report text generation failed (${resp.status})` };
      const json = await resp.json();
      return { text: json.text };
    } catch (e: any) {
      return { generationError: e?.message ?? 'Unknown error generating text snapshot.' };
    }
  }, [buildReportRenderPayload]);
  // Real, honest suppression, not a workaround for a genuine bug: no
  // real caller supplies this to buildOruR01Payload() yet (see this
  // function's own header comment above for why) — noUnusedLocals
  // would otherwise fail the real build for real, working, tested
  // infrastructure with a known, deliberate next real caller.
  void generateReportTextSnapshot;



  const synopticPanelRef = React.useRef<RightSynopticPanelHandle>(null);
  const {
    releasePendingAmendmentOrAddendum,
    alertAdminsOfUnresolvedDrift,
    showProtoReview, setShowProtoReview,
    protoChanges,
    handleProtocolChangesDetected,
    handleProtoCommit,
    showGrossingProtoReview, setShowGrossingProtoReview,
    grossingProtoChanges,
    handleGrossingProtocolChangesDetected,
    handleGrossingProtoCommit,
    setAmendmentDraftId,
    amendmentSequenceNumber,
    amendmentSubmitError, setAmendmentSubmitError,
    versionHistory,
    resumingAmendment, setResumingAmendment,
    openAmendmentDraft,
    handleFieldOverridesConfirmed,
    handleRequestAmendment,
    handleAmendmentSubmit,
    amendmentMismatch, resumeAddendumAfterMismatch, cancelAddendumMismatch,
  } = useAmendmentWorkflow({
    caseData, setCaseData, signingUser, showToast, activeReportInstanceId,
    knownVersionRef, setConcurrencyConflict, sendSynopticReportToLis,
    generateReportPdfSnapshot, pendingLisNotice, setPendingLisNotice,
    amendmentMode, amendmentText, setAmendmentText, setAmendmentMode,
    setShowAmendmentModal, log,
  });
  // Stage 1: tracks whether a Stage 1 evaluation call is currently in
  // flight. Combined with showProtoReview (above) to gate Finalize/
  // Finalize & Next/Sign Out in BottomActionBar — see handleGrossComplete.
  // Per-instance snapshot of answers at the moment each GrossingReportInstance
  // was last finalized — set in handleGrossComplete, read by the drift-
  // detection useEffect right after it. Ref, not state: pure bookkeeping,
  // shouldn't trigger renders on its own.
  const grossingSnapshotRef = React.useRef<Map<string, string>>(new Map());
  const {
    isEvaluatingSynopticFit, handleGrossComplete,
    pendingProtocolConfirmation, confirmGrossCompleteWithoutProtocol, cancelGrossCompleteWithoutProtocol,
    showUpdateReasonPrompt, confirmUpdateReason, cancelUpdateReason,
  } = useGrossingCompletion({
    caseData, setCaseData, showToast, log, knownVersionRef,
    setConcurrencyConflict, grossingSnapshotRef, handleProtocolChangesDetected,
    handleGrossingProtocolChangesDetected,
    orchSections,
  });

  const microscopicEntry = useMicroscopicEntry({
    caseData, setCaseData, knownVersionRef, setConcurrencyConflict, showToast,
  });
  const effectiveSpecimenComplexity = useEffectiveSpecimenComplexity(caseData);

  // The Sequencer's reorder of specimens and their synoptic reports (services/reportEditing/reportSequence.ts).
  // Batch 579: the specimen order is saved at once; the reports' order is part of the draft (Save Draft).
  const handleSequencerSave = async (specimenOrder: string[], synopticOrders: Record<string, string[]>) => {
    const current = caseDataRef.current;
    if (!current) return;
    const next = sequenceCaseReports(current.specimens ?? [], current.synopticReports ?? [], specimenOrder, synopticOrders);
    if (next.reportsChanged) {
      setCaseData(prev => (prev ? ({ ...prev, synopticReports: next.synopticReports } as typeof prev) : prev));
      markDirty('reportSequence');
    }
    // Built again inside the save from the page's specimens at that moment (another save may come first).
    const saved = next.specimensChanged
      ? await saveSpecimensNow(sp => sequenceCaseReports(sp, [], specimenOrder, {}).specimens, { allOrNothing: false })
      : null;
    if (saved === 'conflict' || saved === 'failed') return; // the dialog or a warning has said so
    if (saved === 'saved') showToast(tGrossingNav(next.reportsChanged ? 'synopticReportPage.toast.sequenceSavedReportsWithDraft' : 'synopticReportPage.toast.sequenceSaved'));
    else if (next.reportsChanged) showToast(tGrossingNav('synopticReportPage.toast.sequenceReportsWithDraft'));
  };

  // Previously an anonymous inline closure on HeaderBar's onCaseUpdate JSX
  // prop — persists flag updates from the header's LIS-sync editor.
  // Real, confirmed fix (Jira PS-57 + its follow-up "should be able
  // to assign Flags at either a Case or Specimen level"): used to
  // persist a case-level specimenFlags field that's been removed —
  // it never reflected the real flag-application workflow anyway
  // (see Case.ts's own, fuller comment on why). HeaderBar.tsx's own
  // handleCheckNow() now builds a properly-shaped updated Case
  // (real caseFlags, and each affected specimen's own, nested
  // specimenFlags) — persisted here directly instead.
  const handleHeaderCaseUpdate = useCallback(async (updated: Case) => {
    try {
      await savePagePatch(updated.id, { caseFlags: updated.caseFlags, specimens: updated.specimens });
      setCaseData(updated);
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        setConcurrencyConflict({ actualVersion: e.actualVersion });
        return;
      }
      console.error(e);
    }
  }, [setCaseData, setConcurrencyConflict, savePagePatch]);

  // ── Spell check (PS-342, Batch 338) ─────────────────────────────────────
  // One checker for all of this report's free text: the report editor, the
  // synoptic text fields and the report modals. Language: this case's own
  // choice → the assigned pathologist's preference → the ordering
  // facility's default (services/spellcheck/resolveCaseSpellingContext.ts).
  const saveSpellingLocaleOverride = useCallback(async (locale: SpellingLocale | null) => {
    if (!caseData) return;
    try {
      await savePagePatch(caseData.id, { spellingLocaleOverride: locale });
      setCaseData(prev => (prev ? { ...prev, spellingLocaleOverride: locale } : prev));
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        setConcurrencyConflict({ actualVersion: e.actualVersion });
        return;
      }
      console.error(e);
    }
  }, [caseData, setCaseData, setConcurrencyConflict, savePagePatch]);

  const spellCheck = useCaseSpellCheck({
    caseId: caseData?.id,
    orderingFacilityId: caseData?.order?.facilityId,
    assignedPathologistId: caseData?.order?.assignedTo,
    caseOverride: caseData?.spellingLocaleOverride,
    saveCaseOverride: saveSpellingLocaleOverride,
  });

  // Previously an anonymous inline closure on SpecimenEditModal's onSave
  // JSX prop — handles post-hoc correction audit trail, persisting the
  // saved specimen, and (for newly-added specimens) auto-assigning a
  // grossing template so the new specimen isn't invisible in the
  // Sidebar's unified editor.
  const handleSpecimenSave = useCallback(async (saved: Specimen) => {
    // Post-Hoc Correction audit trail — deliberately generated
    // here, in the existing save path, rather than via a
    // separate correction-only modal. SpecimenEditModal already
    // covers every field someone would realistically need to
    // fix; building a second modal for the same fields would
    // just confuse people with two ways to do the same thing.
    // Only fires for genuine edits (editingSpecimen was set),
    // never for a newly-added specimen — there's no "before"
    // value to compare against for something that didn't exist
    // a moment ago, so nothing here is actually a correction.
    if (editingSpecimen && caseData?.id) {
      const before = editingSpecimen;
      const fieldsToCheck: { key: string; label: string; oldVal: string; newVal: string }[] = [
        { key: 'label', label: 'Specimen Label', oldVal: before.label ?? '', newVal: saved.label ?? '' },
        { key: 'description', label: 'Description', oldVal: before.description ?? '', newVal: saved.description ?? '' },
        { key: 'bodySite', label: 'Body Site', oldVal: (before as any).collection?.bodySite ?? '', newVal: (saved as any).collection?.bodySite ?? '' },
        { key: 'laterality', label: 'Laterality', oldVal: (before as any).collection?.laterality ?? '', newVal: (saved as any).collection?.laterality ?? '' },
        { key: 'containerType', label: 'Container Type', oldVal: (before as any).container?.type ?? '', newVal: (saved as any).container?.type ?? '' },
      ];
      fieldsToCheck.filter(f => f.oldVal.trim() !== f.newVal.trim()).forEach(f => {
        specimenDeficiencyService.raiseAndResolve(
          {
            caseId: caseData.id, specimenId: saved.id, specimenLabel: saved.label,
            deficiencyTypeId: 'def-post-hoc-correction',
            comment: `${f.label}: "${f.oldVal || '(blank)'}" → "${f.newVal || '(blank)'}"`,
            raisedBy: signingUser?.id ?? 'unknown',
          },
          { resolutionTypeId: 'res-value-corrected', resolvedBy: signingUser?.id ?? 'unknown' }
        ).catch(err => console.error('[PostHocCorrection] Failed to record:', err));
      });
    }

    // Real feature, per direct follow-up: "Specimen/Decant-level
    // foreign ID... the actual cytology fluid case." Audit Trail
    // Tracking — same real, merged pre/post-state check as
    // handleUpdateBlock/handleUpdateMatrixBlock's own identical fix
    // earlier this session (see those comments for the full
    // reasoning on why a naive "both fields present together" check
    // isn't enough on its own). Deliberately NOT gated on
    // `editingSpecimen` the way the Post-Hoc Correction block above
    // is — a brand-new specimen can genuinely be created with its
    // own foreign id already filled in (a PA who knows upfront this
    // is received, foreign-labeled fluid), and that's still a real,
    // new binding worth logging, not just a value that happened to
    // already be there.
    if (caseData?.id) {
      const beforeExternalId = editingSpecimen?.externalId;
      const beforeExternalIdSource = editingSpecimen?.externalIdSource;
      const wasComplete = !!beforeExternalId && !!beforeExternalIdSource;
      const isNowComplete = !!saved.externalId && !!saved.externalIdSource;
      if (isNowComplete && (!wasComplete || saved.externalId !== beforeExternalId)) {
        auditService.logEvent({
          type: 'system', event: 'Foreign ID Bound',
          detail: `Specimen ${saved.label} bound to foreign id "${saved.externalId}" (source: ${saved.externalIdSource}).`,
          user: signingUser?.id ?? 'unknown', caseId: caseData.id, confidence: null,
        }).catch(err => console.error('[Grossing] Failed to log Foreign ID Bound audit entry:', err));
      }
    }

    if (!caseData) return;
    const isNewSpecimen = (prev => (prev.specimens ?? []).findIndex(s => s.id === saved.id) < 0)(caseData!);
    const existingIdx = (caseData!.specimens ?? []).findIndex(s => s.id === saved.id);
    const nextSpecimens = existingIdx >= 0
      ? (caseData!.specimens ?? []).map(s => s.id === saved.id ? saved : s)
      : [...(caseData!.specimens ?? []), saved];
    setCaseData(prev => prev ? ({ ...prev, specimens: nextSpecimens }) : prev);
    try {
      await savePagePatch(caseData!.id, { specimens: nextSpecimens } as any);
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        setConcurrencyConflict({ actualVersion: e.actualVersion });
      } else {
        console.error('[PostHocCorrection] Failed to persist specimen:', e);
      }
    }

    // A specimen added mid-workflow (not at accession) never
    // goes through evaluateGrossingTemplateAssignment, so it
    // would otherwise have zero grossingReports — invisible in
    // the Sidebar's unified editor and permanently blocking
    // Gross Complete's per-specimen check with no way to
    // resolve it. Run the exact same evaluation accession uses,
    // so this specimen gets a real, fillable draft grossing
    // entry immediately, same as if it had existed from the
    // start.
    if (isNewSpecimen) {
      (async () => {
        try {
          const templateModule = await import('@/services/templates/templateService');
          const { grossingRoutingOverrideService } = await import('@/services');

          const allTemplates = await templateModule.listTemplates('published');
          const availableTemplates = (allTemplates as any[])
            .filter(t => t.isDiagnostic === false)
            .map(t => ({ id: t.id, name: t.name, category: t.category }));

          const overridesRes = await grossingRoutingOverrideService.getAll();
          const routingOverrides = (overridesRes.ok ? overridesRes.data : [])
            .filter((o: any) => o.active)
            .map((o: any) => ({ facilityId: o.clientId, specimenType: o.specimenType, grossingTemplateId: o.grossingTemplateId }));

          const evalResult = await evaluateGrossingTemplateAssignment({
            specimens: [{
              specimenId: saved.id,
              specimenLabel: saved.label,
              specimenDesc: saved.description,
              specimenType: (saved as any)._entry?.type,
              bodySite: (saved as any)._entry?.site,
              laterality: (saved as any)._entry?.laterality,
            }],
            clinicalIndication: caseData?.order?.clinicalIndication,
            caseContext: { facilityId: caseData?.order?.facilityId },
            availableTemplates,
            routingOverrides,
          } as any);

          const assignment = evalResult.assignments?.[0];
          const newGrossingReport = {
            instanceId: `${saved.id}_grossing_${Math.random().toString(36).slice(2, 10)}`,
            specimenId: saved.id,
            templateId: assignment?.templateId ?? 'grossing_standard_tissue',
            templateName: assignment?.templateName ?? 'Standard Tissue Grossing (Gold Standard) — Route A',
            status: 'draft' as const,
            answers: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const nextGrossingReports = [...((caseData as any)!.grossingReports ?? []), newGrossingReport];
          setCaseData(prev => prev ? ({ ...prev, grossingReports: nextGrossingReports } as any) : prev);
          try {
            await savePagePatch(caseData!.id, { grossingReports: nextGrossingReports } as any);
          } catch (e) {
            if (e instanceof ConcurrencyConflictError) {
              setConcurrencyConflict({ actualVersion: e.actualVersion });
              return;
            }
            console.error(e);
          }
          markDirty('specimens');
        } catch (err) {
          console.error('[AddSpecimen] Grossing template auto-assignment failed:', err);
          showToast(tGrossingNav('synopticReportPage.toast.grossingTemplateAssignFailed'), 'warning');
        }
      })();
    }
    // Batch 605: the LIS answers the write-back (the simulated engine in the demo); the sidebar badge moves to Sent or Rejected.
    if (saved.lisSyncState === 'pending_sync') {
      const caseIdForAck = caseData.id;
      void writeBackSpecimenToLis(caseIdForAck, saved, signingUser?.id ?? 'unknown').then(async answer => {
        if (!answer) return;
        const patched: Specimen[] = nextSpecimens.map(sp => sp.id === saved.id ? { ...sp, lisSyncState: answer.state } : sp);
        setCaseData(prev => prev ? ({ ...prev, specimens: (prev.specimens ?? []).map(sp => sp.id === saved.id && sp.lisSyncState === 'pending_sync' ? { ...sp, lisSyncState: answer.state } : sp) }) : prev);
        try { await savePagePatch(caseIdForAck, { specimens: patched } as any); } catch (e) { console.error('[LisAck] Failed to persist sync state:', e); }
      });
    }
    markDirty('specimens');
    setShowSpecimenEdit(false);
    setEditingSpecimen(null);
  }, [editingSpecimen, caseData, signingUser, setCaseData, setConcurrencyConflict, markDirty, showToast, setShowSpecimenEdit, setEditingSpecimen, savePagePatch, tGrossingNav]);




  // ── Stage 1: unified Grossing finalize/re-finalize action ──────────────────
  // Single handler covers both "Gross Complete" (first time) and "Update
  // Gross" (correcting something already finalized) — they're the same
  // event from evaluateSynopticAssignment's point of view: it already
  // takes currentSynoptics and decides replace/add/remove against whatever
  // is already assigned, so re-finalizing after a correction is just
  // calling it again, not a special case. No separate "unlock" action
  // exists — editing a finalized instance's answers is itself what
  // reopens it (see the snapshot-diff useEffect below); this handler only
  // fires on the explicit finalize click.
  //
  // isEvaluatingSynopticFit (below) gates Finalize/Finalize & Next/Sign Out
  // in BottomActionBar while this is running and while any resulting
  // ProtocolChangeModal review is still open (showProtoReview) — a case
  // should not be signable while its synoptic assignment might be stale
  // relative to a just-edited Gross.



  // ── Detects edits to an already-finalized Grossing instance ────────────────
  // Editing IS the reopen action — no separate "unlock" button. Compares
  // each finalized instance's current answers against the snapshot taken
  // at the moment it was last finalized (grossingSnapshotRef, set in
  // handleGrossComplete above). A mismatch means the PA edited a field
  // after finalizing — flip that instance back to 'draft' automatically,
  // which makes BottomActionBar's existing hasUnfinishedGrossing check
  // true again and brings the action button back (labeled "Update Gross",
  // since previouslyFinalized survives the revert).
  //
  // Deliberately reacts to DATA (caseData.grossingReports), not to a
  // specific editing component's onChange — robust regardless of which UI
  // path actually writes the edit (RightSynopticPanel, voice input, AI
  // suggestion acceptance, etc.), though it depends on that edit actually
  // reaching caseData. Grossing-answer editing is new enough in this app
  // (added this conversation) that the real save/autosave wiring for it
  // hasn't been independently confirmed — worth verifying this effect
  // actually fires once there's a running app to test against.

  useEffect(() => {
    if (!caseData?.grossingReports?.length) return;

    const drifted = caseData.grossingReports.filter(g => {
      if (g.status !== 'finalized') return false;
      const snapshot = grossingSnapshotRef.current.get(g.instanceId);
      return snapshot !== undefined && snapshot !== JSON.stringify(g.answers);
    });
    if (drifted.length === 0) return;

    const driftedIds = new Set(drifted.map(g => g.instanceId));
    const nowIso = new Date().toISOString();
    const grossingReports = caseData.grossingReports.map(g =>
      driftedIds.has(g.instanceId)
        ? { ...g, status: 'draft' as const, updatedAt: nowIso } // previouslyFinalized stays true
        : g
    );

    // Real telemetry, independent of the write's outcome — this is the
    // actual "how often does this happen at all" signal. The write below
    // also produces case.write/case.write.conflict events via
    // CaseRouter's own audit logging, but those are generic across every
    // write in this file; this entry is what makes drift specifically
    // attributable when reviewing the audit log later, not just visible
    // as an undifferentiated conflict count. No answer content included
    // — instance IDs and a count only, per this audit trail's PHI-safe
    // detail requirement.
    auditService.logEvent({
      type: 'system',
      event: 'Post-Finalization Drift Detected',
      detail: `${drifted.length} finalized grossing report(s) drifted from their finalized snapshot (instance IDs: ${drifted.map(g => g.instanceId).join(', ')}) — reverting to draft`,
      user: signingUser?.id ?? 'system',
      caseId: caseData.id,
      confidence: null,
    }).catch(() => {}); // never let a telemetry failure block the real correction below

    (async () => {
      try {
        await savePagePatch(caseData.id, { grossingReports } as any);
        // Both the snapshot clear AND the local optimistic update are
        // deliberately gated on write success now — not just the
        // snapshot. If setCaseData ran unconditionally (the first pass
        // at this fix), the local view would flip to 'draft' regardless
        // of whether the server write actually landed. That's a second,
        // related bug: the detection filter above requires
        // status === 'finalized', so once local state optimistically
        // moved past that condition, this instance could never be
        // re-examined again — even with the snapshot preserved — because
        // the thing that triggers detection had already been masked
        // locally. Gating both on success means a failed write leaves
        // local state exactly matching server truth (still finalized,
        // still drifted), so detection genuinely re-fires and retries
        // the next time grossingReports changes for any reason, instead
        // of silently diverging into a state nothing will ever revisit.
        drifted.forEach(g => grossingSnapshotRef.current.delete(g.instanceId));
        setCaseData(prev => prev ? ({ ...prev, grossingReports } as typeof prev) : prev);
        auditService.logEvent({
          type: 'system',
          event: 'Post-Finalization Drift Auto-Corrected',
          detail: `${drifted.length} report(s) reverted to draft and saved successfully`,
          user: signingUser?.id ?? 'system',
          caseId: caseData.id,
          confidence: null,
        }).catch(() => {});
      } catch (e) {
        // Deliberately silent to the USER, unlike every user-initiated
        // write elsewhere in this file — this effect runs automatically
        // in the background, not from something the pathologist clicked.
        // A blocking "someone else changed this case" modal popping up
        // unprompted would be jarring and confusing. Local state is
        // deliberately left untouched on failure (see above) so this
        // effect genuinely retries on a future render, instead of just
        // claiming to.
        //
        // NOT silent to telemetry, though — this is the real production
        // signal for "drift was detected but the correction hasn't
        // landed yet," distinct from both a successful correction and a
        // genuine unexpected error, so someone reviewing the audit log
        // can tell the difference between "rare, self-healed quickly"
        // and "detected often, frequently deferred" without having to
        // correlate against generic case.write.conflict counts from
        // every other write in this file.
        //
        // Real admin alert, not just an audit entry, for these two
        // outcomes specifically — this is the one place in the whole
        // drift-correction flow where NOBODY has any visibility at all,
        // not even the pathologist actively viewing this case. Local
        // state stays untouched on failure by design (see above), so
        // there's no visible signal in the UI that anything happened —
        // an audit log entry is real, but only useful to someone who
        // goes looking. A finalized report sitting with unresolved,
        // silently-drifted content until someone happens to check is a
        // real compliance exposure, not a hypothetical one.
        if (e instanceof ConcurrencyConflictError) {
          auditService.logEvent({
            type: 'system',
            event: 'Post-Finalization Drift Correction Deferred',
            detail: `${drifted.length} report(s) detected drifted, but the correction write hit a version conflict — will retry on next change`,
            user: signingUser?.id ?? 'system',
            caseId: caseData.id,
            confidence: null,
          }).catch(() => {});
          alertAdminsOfUnresolvedDrift(caseData.id, drifted.length, 'deferred (version conflict)');
        } else {
          console.error(e);
          auditService.logEvent({
            type: 'system',
            event: 'Post-Finalization Drift Correction Failed',
            detail: `${drifted.length} report(s) detected drifted; correction write failed with an unexpected error`,
            user: signingUser?.id ?? 'system',
            caseId: caseData.id,
            confidence: null,
          }).catch(() => {});
          alertAdminsOfUnresolvedDrift(caseData.id, drifted.length, 'failed (unexpected error)');
        }
      }
    })();
  }, [caseData?.grossingReports, alertAdminsOfUnresolvedDrift, caseData?.id, signingUser, savePagePatch]);

  const {
    finalizeSignOut,
    handleSignOutConfirm,
    handleReturnToTrainee,
    finalizeCase,
    missingFields,
    showMissingWarning, setShowMissingWarning,
    reviewFields,
    showAiReview, setShowAiReview,
    handleSuggestSynopticFromNarrative,
    isSuggestingSynoptic,
    handleGenerateNarrativeFromSynoptic,
    isGeneratingNarrative,
    showNarrativeReview, setShowNarrativeReview,
    generatedNarrativeText,
    handleAcceptGeneratedNarrative,
    finalizeAndNextPending,
    showPreFinalise, setShowPreFinalise,
    preFinalSynoptics,
    handleRequestFinalize,
    handlePreFinalConfirm,
    handleFinalizeConfirm,
    criticalFindings,
    showCriticalFindingsModal,
    handleRecordCriticalNotification,
    handleAcknowledgeCriticalFindings,
  } = useSignOutWorkflow({
    confirmWarnings: warningConfirm.confirm,
    caseData, setCaseData, signingUser, showToast, activeReportInstanceId,
    knownVersionRef, setConcurrencyConflict, sendSynopticReportToLis,
    generateReportPdfSnapshot, isOrchestrationMode, orchSections,
    setCaseSigned, setShowSignOutModal, setPendingReconciliation,
    countersignFeedback, followUpExpected, specimenDictionary, setFixativeGateSpecimens, setStainQcGateBlocking,
    setClinicalMismatch, setPeerReviewGate, setInkingGateBlocking,
    setPreAnalyticDateGateSpecimens, setPendingActionIsSignOut,
    setPendingFinalizeArgs, synopticPanelRef, setAlertFieldId, safeSetLeftTab, setAmendmentMode,
    setActiveSpecimenId, setActiveReportType,
    setShowAmendmentModal, setShowFinalizeModal, openAmendmentDraft,
    releasePendingAmendmentOrAddendum, log,
  });
  // Batch 453 (PS-323): the microscopic findings, for the per-specimen
  // Microscopic entry panel's highlight (one stable list per findings set).
  const microscopicFindings = useMemo(() => findingsForField(criticalFindings, 'microscopic'), [criticalFindings]);

  // Previously an anonymous inline closure on each "Cannot Finalise"
  // missing-field card's onClick — closes the modal, switches to the
  // Draft tab if in Orchestration mode, and scrolls to the field.
  const handleMissingFieldClick = useCallback((fieldId: string) => {
    setShowMissingWarning(false);
    if (isOrchestrationMode) safeSetLeftTab('draft');
    setTimeout(() => setAlertFieldId(fieldId), 100);
  }, [isOrchestrationMode, safeSetLeftTab, setAlertFieldId, setShowMissingWarning]);

  // Batch 461: the anatomical map companion (Pete's "Opt-In Companion"). Open or
  // closed is remembered per user; the map is drawn from the synoptic answers.
  const mapPreferenceKey = `reportAnatomicalMapOpen:${signingUser?.id ?? ''}`;
  const [mapOpen, setMapOpen] = useState<boolean>(() => getUiPreference(mapPreferenceKey, false));
  useEffect(() => { setMapOpen(getUiPreference(mapPreferenceKey, false)); }, [mapPreferenceKey]);
  const toggleMap = useCallback(() => {
    setMapOpen(prev => { setUiPreference(mapPreferenceKey, !prev); return !prev; });
  }, [mapPreferenceKey]);
  const organMap = useOrganMap({
    caseData, instanceId: activeReportInstanceId, open: mapOpen,
    user: signingUser ? { id: signingUser.id, name: signingUser.name ?? signingUser.id } : null,
    t: tGrossingNav, showToast,
    reportT: async () => i18nForDates.getFixedT((await resolveReportLocaleForFacility(caseData?.order?.facilityId)).language),
    onFiguresSaved: saved => takeUp(saved, (saved as any).version ?? knownVersionRef.current, { organMapFigures: saved.organMapFigures }),
  });
  const handleOrganMapSectorClick = useCallback((sector: { jumpFieldId?: string }) => {
    if (!sector.jumpFieldId) return;
    const fieldId = sector.jumpFieldId;
    setAlertFieldId(null);
    setTimeout(() => setAlertFieldId(fieldId), 50);
  }, [setAlertFieldId]);

  // Previously an anonymous inline closure on FixativeTimeGateModal's
  // onContinue JSX prop — persists the pathologist's fixation-time
  // resolutions, then resumes whichever finalize path was gated by them.
  const handleFixativeGateContinue = useCallback(async (resolutions: FixativeResolution[]) => {
    if (!caseData) return;
    const patchedSpecimens = (caseData.specimens ?? []).map((sp: any) => {
      const res = resolutions.find(r => r.specimenId === sp.id);
      if (!res) return sp;
      return {
        ...sp,
        processing: {
          ...sp.processing,
          ...(res.processedAt ? { processedAt: res.processedAt, processedAtIsEstimated: res.processedAtIsEstimated } : {}),
        },
      };
    });

    try {
      await savePagePatch(caseData.id, { specimens: patchedSpecimens } as any);
      setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);

      // Audit trail — one SpecimenDeficiency per resolved specimen,
      // same pattern as the order-import dictionary-match
      // deficiency (raised and resolved together, since detection
      // and resolution happen in the same sitting here too).
      await Promise.all(resolutions.map(res => {
        const sp = caseData.specimens?.find((s: any) => s.id === res.specimenId);
        if (!sp) return Promise.resolve();
        return specimenDeficiencyService.raiseAndResolve(
          {
            caseId: caseData.id,
            specimenId: res.specimenId,
            specimenLabel: sp.label,
            deficiencyTypeId: 'def-missing-fixation-time',
            comment: `Fixation time not documented for Specimen ${sp.label} at sign-out.`,
            raisedBy: 'system',
          },
          {
            resolutionTypeId: res.resolutionTypeId,
            resolutionComment: res.resolutionComment,
            resolvedBy: signingUser?.id ?? 'unknown',
          }
        );
      }));

      showToast(tGrossingNav('synopticReportPage.toast.fixationTimeRecorded'));
    } catch (err) {
      if (err instanceof ConcurrencyConflictError) {
        // Same reasoning as finalizeSignOut/handleAmendmentSubmit —
        // this gates entry into the finalize flow, so a stale
        // version here shouldn't silently proceed toward signing
        // out a report built against outdated specimen data.
        setConcurrencyConflict({ actualVersion: err.actualVersion, blockOverride: true });
        return;
      }
      console.error('[FixativeGate] Failed to persist resolutions:', err);
      showToast(tGrossingNav('synopticReportPage.toast.fixationSaveFailed'), 'warning');
      return;
    }

    setFixativeGateSpecimens(null);
    const args = pendingFinalizeArgs;
    const isSignOut = pendingActionIsSignOut;
    setPendingFinalizeArgs([]);
    setPendingActionIsSignOut(false);
    // Same gap as the other two finalize paths — fixed the same way.
    (async () => {
      if (isSignOut) {
        await handleSignOutConfirm();
        return;
      }
      const succeeded = await finalizeCase(args);
      if (succeeded) await releasePendingAmendmentOrAddendum();
    })();
  }, [caseData, setCaseData, signingUser, showToast, tGrossingNav, setConcurrencyConflict, setFixativeGateSpecimens, pendingFinalizeArgs, setPendingFinalizeArgs, pendingActionIsSignOut, setPendingActionIsSignOut, finalizeCase, handleSignOutConfirm, releasePendingAmendmentOrAddendum, savePagePatch]);

  // Real, per PS-289/PS-292's own Gating Strategy — simpler than
  // handleFixativeGateContinue above, since the real confirmation
  // itself (mockBatchService.confirmQcVisualRead()) already persisted
  // inside StainQcGateModal directly, rather than being handed back
  // here as data still needing to be saved.
  const handleStainQcGateContinue = useCallback(() => {
    setStainQcGateBlocking(null);
    const args = pendingFinalizeArgs;
    const isSignOut = pendingActionIsSignOut;
    setPendingFinalizeArgs([]);
    setPendingActionIsSignOut(false);
    (async () => {
      if (isSignOut) {
        await handleSignOutConfirm();
        return;
      }
      const succeeded = await finalizeCase(args);
      if (succeeded) await releasePendingAmendmentOrAddendum();
    })();
  }, [setStainQcGateBlocking, pendingFinalizeArgs, setPendingFinalizeArgs, pendingActionIsSignOut, setPendingActionIsSignOut, finalizeCase, handleSignOutConfirm, releasePendingAmendmentOrAddendum]);

  // Batch 439 (PS-145, PS-144): resume sign-out after the mismatch decision or
  // the urgent-care override, exactly as handleStainQcGateContinue does.
  const resumeAfterGate = useCallback(() => {
    const args = pendingFinalizeArgs;
    const isSignOut = pendingActionIsSignOut;
    setPendingFinalizeArgs([]);
    setPendingActionIsSignOut(false);
    (async () => {
      if (isSignOut) { await handleSignOutConfirm(); return; }
      const succeeded = await finalizeCase(args);
      if (succeeded) await releasePendingAmendmentOrAddendum();
    })();
  }, [pendingFinalizeArgs, setPendingFinalizeArgs, pendingActionIsSignOut, setPendingActionIsSignOut, finalizeCase, handleSignOutConfirm, releasePendingAmendmentOrAddendum]);
  const cancelGate = useCallback(() => {
    setClinicalMismatch(null); setPeerReviewGate(null); setInkingGateBlocking(null); setPendingFinalizeArgs([]); setPendingActionIsSignOut(false);
  }, [setPendingFinalizeArgs, setPendingActionIsSignOut]);

  // Batch 484: after a successful Administrative Override (Severity 3,
  // Gate B only — Gate A never offers one), resume exactly as
  // resumeAfterGate does for the mismatch/peer-review gates above.
  const handleInkingGateOverrideRecorded = useCallback(() => {
    setInkingGateBlocking(null);
    resumeAfterGate();
  }, [resumeAfterGate]);
  const peerReview = usePeerReview(caseData, signingUser?.id);
  // Batch 530 (PS-554, Gate A): the mismatch check in the background while the report is reviewed.
  const mismatchAlert = useClinicalMismatchAlert(caseData, orchSections);

  // Real, per direct follow-up: "Begin AutopsyAuthorizationCompletionForm.tsx
  // persistence — hands back updated data, nothing saves it." The
  // form itself is a real, deliberately presentational component
  // (per its own header comment) — it hands back a real, updated
  // AutopsyCaseDetails and leaves persistence to the caller. This is
  // that real caller, same real caseRouter.updateCase() +
  // knownVersionRef pattern as handleFixativeGateContinue above.
  const handleAutopsyAuthCompletionSubmit = useCallback(async (updatedDetails: AutopsyCaseDetails) => {
    if (!caseData) return;
    try {
      await savePagePatch(caseData.id, { autopsy: updatedDetails } as any);
      setCaseData(prev => prev ? ({ ...prev, autopsy: updatedDetails } as typeof prev) : prev);
      setShowAutopsyAuthCompletion(false);
      showToast(tGrossingNav('synopticReportPage.toast.authorizationRecorded'));
    } catch (err) {
      if (err instanceof ConcurrencyConflictError) {
        setConcurrencyConflict({ actualVersion: err.actualVersion, blockOverride: true });
        return;
      }
      console.error('[AutopsyAuthCompletion] Failed to persist authorization:', err);
      showToast(tGrossingNav('synopticReportPage.toast.authorizationSaveFailed'), 'warning');
    }
  }, [caseData, setCaseData, showToast, tGrossingNav, setConcurrencyConflict, savePagePatch]);

  // Real, per direct follow-up: "it all needs to be wired" —
  // AutopsyCaseDetails.organRetentionTier had no real UI anywhere to
  // set it at all (confirmed via a full-codebase search before
  // adding this), meaning resolveHtaApplicability.ts's own real gate
  // had nothing real to gate. Same real persistence pattern as
  // handleAutopsyAuthCompletionSubmit above, kept as its own,
  // separate handler since the two real actions have genuinely
  // different success messaging and neither should touch the
  // other's modal state.
  const handleOrganRetentionTierChange = useCallback(async (tier: AutopsyCaseDetails['organRetentionTier'], reasonOverride?: string) => {
    if (!caseData?.id || !caseData.autopsy) return;
    // Batch 499: saved through recordAutopsyOrganRetentionTier, which checks
    // autopsy:retention-tier:record, the jurisdiction and the consent on file
    // (Batch 468), and audits. Before this, the page wrote the tier straight to
    // the case with no permission check (disclosed since Batch 472). A reason
    // left undefined keeps the one on file (Batch 472).
    const result = await recordAutopsyOrganRetentionTier(caseData.id, tier, reasonOverride, signingUserName);
    if (!result.ok) {
      const code = result.reasonCode;
      showToast(
        code === 'consentRevoked' || code === 'retentionNotPermitted' ? tGrossingNav(`synopticReportPage.toast.organRetentionConsentRefusal.${code}`)
          : code === 'notPermitted' ? tGrossingNav('synopticReportPage.toast.organRetentionNotPermitted')
            : tGrossingNav('synopticReportPage.toast.organRetentionSaveFailed'),
        'warning',
      );
      return;
    }
    const saved = result.autopsy;
    if (saved) setCaseData(prev => prev ? ({ ...prev, autopsy: saved } as typeof prev) : prev);
    showToast(tGrossingNav('synopticReportPage.toast.organRetentionRecorded'));
  }, [caseData?.id, caseData?.autopsy, signingUserName, setCaseData, showToast, tGrossingNav]);

  // Real, per direct follow-up ("let's get that signing") — the real
  // UI trigger for signAutopsyReport.ts, this codebase's first real
  // PAD/FAD signing action. Thin: calls and renders only, same
  // "no inline logic" posture as every other real Autopsy handler in
  // this file — the actual countersign/gate/persist logic all lives
  // in signAutopsyReport.ts itself.
  // Batch 523 (PS-145, decision 15): before the FAD is signed, the
  // clinical-pathologic mismatch check runs against the report as on screen
  // (checkPeerReviewAndMismatch.ts); a suggestion is decided first.
  const [autopsyMismatch, setAutopsyMismatch] = useState<ClinicalMismatchAssessment | null>(null);
  const beginAutopsySign = useCallback(async (tier: 'PAD' | 'FAD') => {
    if (tier === 'FAD' && caseData) {
      const suggestion = await checkAutopsyClinicalMismatch(caseData, orchSections);
      if (suggestion) { setAutopsyMismatch(suggestion); return; }
    }
    setConfirmingAutopsyTier(tier);
  }, [caseData, orchSections]);

  const handleSignAutopsyReport = useCallback(async (tier: 'PAD' | 'FAD', confirmation: SignatureConfirmation) => {
    if (!caseData?.id || !signingUser?.id) return;
    // Batch 345: check the signature before anything is signed
    // (services/auth/signatureEvidence.ts).
    const accepted = await signatureGate.accept(confirmation, {
      caseId: caseData.id,
      caseRef: caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? null,
      actions: [tier === 'FAD' ? 'autopsy-fad' : 'autopsy-pad'],
    });
    if (accepted.ok === false) { showToast(tGrossingNav(`signatureEvidence.refused.${accepted.reason}`), 'warning'); return; }
    setSigningAutopsyTier(tier);
    try {
      // Real, deliberate: persist any unsaved orchSections edits first
      // — signAutopsyReport.ts snapshots Case.orchSections directly
      // (per direct correction: "the Final Diagnosis... that data
      // exist" — no separate content model needed), so the pathologist's
      // latest, actually-written diagnosis text must be on the real
      // case before the sign action reads it, not left behind in
      // local, unsaved component state.
      await writeCaseDraft(caseData, caseData.id, orchSections, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;

      const result = await signAutopsyReport(caseData.id, tier, {
        id: signingUser.id, name: signingUser.name ?? signingUser.id, isPathologist: true,
      }, generateReportPdfSnapshot, gateOverrideReason ?? undefined);
      if (!result.ok) {
        signatureGate.release(caseData.id);
        // Signing-authority refusals arrive already translated
        // (canFinalizeCase's reason); the rest have their own keys.
        showToast(result.errorCode === 'NOT_AUTHORIZED' && result.error
          ? result.error
          : tGrossingNav(AUTOPSY_SIGN_ERROR_KEY[result.errorCode ?? 'SAVE_FAILED'] ?? 'autopsySignOut.errors.saveFailed', { tier, jurisdiction: caseData.autopsy?.jurisdiction ? tGrossingNav(`jurisdictionNames.${caseData.autopsy.jurisdiction}`) : '' }), 'warning');
        return;
      }
      // Real, deliberate re-fetch rather than an optimistic local
      // patch: a countersign release changes CaseStatus only, while a
      // direct sign changes both CaseStatus (FAD only) and the real
      // autopsy snapshot — re-fetching the real, authoritative case
      // keeps both paths correct without duplicating
      // signAutopsyReport.ts's own real branching logic here too.
      const refreshed = await caseRouter.getCase(caseData.id);
      if (refreshed) {
        setCaseData(refreshed);
        // PS-71 (Batch 458): the page now holds the saved case, so its version.
        knownVersionRef.current = refreshed.version ?? knownVersionRef.current;
      }
      await signatureGate.commit(caseData.id, result.outcome === 'released_for_countersign' ? 'released_for_countersign' : 'signed', { kind: 'autopsy-snapshot', tier });
      showToast(result.outcome === 'released_for_countersign'
        ? tGrossingNav('autopsySignOut.toast.releasedForCountersign', { tier })
        : tGrossingNav('autopsySignOut.toast.signed', { tier }));
    } catch (err) {
      console.error('[AutopsySign] Failed to sign report:', err);
      showToast(tGrossingNav('autopsySignOut.toast.failed', { tier }), 'warning');
    } finally {
      setSigningAutopsyTier(null);
      // Batch 478: never carried over to a later, unrelated sign attempt.
      setGateOverrideReason(null);
    }
  }, [caseData, signingUser, orchSections, knownVersionRef, setCaseData, showToast, generateReportPdfSnapshot, tGrossingNav, gateOverrideReason]);
  // compliance research — same shape as handleFixativeGateContinue
  // above, for PreAnalyticDateGateModal. Genuinely different in one
  // way: a specimen resolved via administrative override raises a
  // real, OPEN SpecimenDeficiency (raise(), never raiseAndResolve()) —
  // this is a Pre-Analytic Non-Conformity warranting real
  // corrective/preventive review, not an instant, closed documentation
  // event. See def-missing-preanalytic-date's own doc comment.
  const handlePreAnalyticDateGateContinue = useCallback(async (resolutions: PreAnalyticDateResolution[]) => {
    if (!caseData) return;
    const org = getOrganisationByHospitalId(caseData.originHospitalId);
    const gateConfig = resolvePreAnalyticDateGateConfig(org?.country);

    const patchedSpecimens = (caseData.specimens ?? []).map((sp: any) => {
      const res = resolutions.find(r => r.specimenId === sp.id);
      if (!res) return sp;
      return {
        ...sp,
        ...(res.collectedAt ? { collectedAt: res.collectedAt } : {}),
        ...(res.collectedAtAdministrativeOverride ? { collectedAtAdministrativeOverride: true } : {}),
        ...(res.receivedAt ? { receivedAt: res.receivedAt } : {}),
        ...(res.receivedAtAdministrativeOverride ? { receivedAtAdministrativeOverride: true } : {}),
        ...(res.overrideComment ? { preAnalyticDateOverrideComment: res.overrideComment } : {}),
      };
    });

    try {
      await savePagePatch(caseData.id, { specimens: patchedSpecimens } as any);
      setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);

      // Real, OPEN SpecimenDeficiency per specimen that used an
      // administrative override on either date — deliberately left
      // open (not raiseAndResolve) so it reaches Operations/CAPA
      // Engine review, matching def-outbound-dispatch-failure's own
      // precedent. Fire-and-forget-adjacent: awaited here so a failure
      // is at least logged, but never blocks the actual sign-out this
      // gate already cleared.
      await Promise.all(resolutions
        .filter(res => res.collectedAtAdministrativeOverride || res.receivedAtAdministrativeOverride)
        .map(res => {
          const sp = caseData.specimens?.find((s: any) => s.id === res.specimenId);
          if (!sp) return Promise.resolve();
          const overriddenFields = [
            res.collectedAtAdministrativeOverride ? 'collection' : null,
            res.receivedAtAdministrativeOverride ? 'laboratory receipt' : null,
          ].filter(Boolean).join(' and ');
          return specimenDeficiencyService.raise({
            caseId: caseData.id,
            specimenId: res.specimenId,
            specimenLabel: sp.label,
            deficiencyTypeId: 'def-missing-preanalytic-date',
            comment: `Specimen ${sp.label}: ${overriddenFields} date/time not recoverable at sign-out. Administrative override "${gateConfig.administrativeOverrideLabel}" applied per ${gateConfig.standardReference}. Reason: ${res.overrideComment ?? ''}`,
            raisedBy: signingUser?.id ?? 'unknown',
          }).catch(err => console.error('[PreAnalyticDateGate] Failed to raise deficiency:', err));
        }));

      showToast(tGrossingNav('synopticReportPage.toast.preAnalyticDatesRecorded'));
    } catch (err) {
      if (err instanceof ConcurrencyConflictError) {
        setConcurrencyConflict({ actualVersion: err.actualVersion, blockOverride: true });
        return;
      }
      console.error('[PreAnalyticDateGate] Failed to persist resolutions:', err);
      showToast(tGrossingNav('synopticReportPage.toast.preAnalyticSaveFailed'), 'warning');
      return;
    }

    setPreAnalyticDateGateSpecimens(null);
    const args = pendingFinalizeArgs;
    const isSignOut = pendingActionIsSignOut;
    setPendingFinalizeArgs([]);
    setPendingActionIsSignOut(false);
    (async () => {
      if (isSignOut) {
        await handleSignOutConfirm();
        return;
      }
      const succeeded = await finalizeCase(args);
      if (succeeded) await releasePendingAmendmentOrAddendum();
    })();
  }, [caseData, setCaseData, signingUser, showToast, tGrossingNav, setConcurrencyConflict, setPreAnalyticDateGateSpecimens, pendingFinalizeArgs, setPendingFinalizeArgs, pendingActionIsSignOut, setPendingActionIsSignOut, finalizeCase, handleSignOutConfirm, releasePendingAmendmentOrAddendum, savePagePatch]);

  // Previously an anonymous inline closure on AddCodeModal's
  // onAddToSpecimens JSX prop — merges new ICD/SNOMED/CPT codes into the
  // case, routing each CPT code to its own specimen's coding.cpt.
  const handleAddCodesToSpecimens = useCallback(async (codes: any[], _specimenIndices: unknown, codedEntries?: CodedEntry[]) => {
    if (!caseData) return;
    // Real fix, per direct correction: "you can delete cpt codes in
    // the code manager - it uses the trash can icon." The modal's own
    // Save button resolves its FULL, final set of active codes
    // (AddCodeModal.tsx's own allActiveCodes, built from applied minus
    // whatever's pendingDelete) and hands that whole set back here -
    // not just newly-added ones. Treating it as "new additions to
    // append" (the previous behavior) would silently duplicate every
    // already-active, untouched code on every single save.
    // Real, per direct guidance's own follow-up on structured
    // linkage: the modal's own allActiveCodes already carries a real
    // specimenId on every code, ICD included (AddCodeModal.tsx's own
    // allActiveCodes construction) - this previously discarded it for
    // ICD entries, flattening every one into one, undifferentiated
    // case-wide list regardless of which specimen it was actually
    // applied to. A real specimenId here means a real, post-
    // examination, specimen-specific diagnosis (Specimen.coding.icd10,
    // see that field's own doc comment); no specimenId means the
    // real, case-wide, order-level indication, same as before.
    // PS-141: the per-specimen split (ICD-10 / SNOMED / ICD-O on each
    // specimen, unattached ICD-10 / SNOMED case-level) and the count-based
    // CPT diff live in services/codes/codeManagerCoding.ts.
    const { newCoding: savedCoding, updatedSpecimens, additionsBySpecimen, removalsBySpecimen } =
      resolveCodeManagerSave(codes as CodeManagerCode[], (caseData.specimens ?? []) as any[]);
    // Batch 607 (#138): the full-fidelity entries (release, source, AI detail) travel with the saved lists.
    const newCoding = codedEntries ? { ...savedCoding, entries: reconcileEntries([...(caseData.coding?.entries ?? [])], codedEntries) } : savedCoding;

    // Real, per direct guidance's own follow-up: billing is one of the
    // few things that can genuinely change after a case signs out, but
    // it needs a real, documented reason - gated here, before ANY
    // mutation (case update, setCaseData, or the transaction loops
    // below), never after. A cancelled prompt means nothing happens at
    // all - no partial state where the UI shows a change that was
    // never actually confirmed.
    const hasRealChange = additionsBySpecimen.size > 0 || removalsBySpecimen.size > 0;
    let postSignoutContext: PostSignoutChangeContext | undefined;
    if (postSignoutReasonNeeded({ billed: isOrchestrationMode, status: caseData.status, hasChange: hasRealChange })) {
      const addCount = [...additionsBySpecimen.values()].reduce((n, c) => n + c.length, 0);
      const removeCount = [...removalsBySpecimen.values()].reduce((n, c) => n + c.length, 0);
      const parts: string[] = [];
      if (addCount) parts.push(`${addCount} code${addCount === 1 ? '' : 's'} added`);
      if (removeCount) parts.push(`${removeCount} code${removeCount === 1 ? '' : 's'} removed`);
      try {
        postSignoutContext = await requestPostSignoutConfirmation(parts.join(', ') + '.');
      } catch {
        return; // cancelled - no mutation at all, modal stays open per the existing "stays open" contract
      }
    }

    try {
      await savePagePatch(caseData.id, { coding: newCoding, specimens: updatedSpecimens } as any);
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        setConcurrencyConflict({ actualVersion: e.actualVersion });
        throw e; // keep the modal open/showing an error, matching the existing "stays open on rejection" contract noted above
      }
      throw e;
    }
    setCaseData(prev => prev ? ({ ...prev, coding: newCoding, specimens: updatedSpecimens } as unknown as typeof prev) : prev);
    markDirty('codes');

    // Real fix, per direct requirement: this CPT path previously wrote
    // straight to coding.cpt with no real transaction or audit trail
    // at all - a second, silent way into the exact same field the
    // billing panel's own ledger governs. Real, per direct follow-up
    // ("can we still keep RVU... useful to track Pathologist
    // performance"): only a real, orchestration-mode change becomes an
    // actual financial charge/credit - LIS owns real billing in assist
    // mode, per established policy - but the code itself is still
    // written either way, since contributionDashboardCalculations.ts
    // genuinely prefers a specimen's real, applied CPT code over its
    // own generic estimate when one exists, and losing that would
    // make assist-mode RVU tracking less accurate, not more compliant.
    // Every path is audited regardless of mode - "All must be audited"
    // doesn't stop being true just because no money moved.
    for (const [specId, addedCodes] of additionsBySpecimen) {
      for (const code of addedCodes) {
        if (isOrchestrationMode) {
          recordChargeTransaction(specId, undefined, code, postSignoutContext);
        } else {
          const sp = caseData.specimens?.find(s => s.id === specId);
          auditService.logEvent({
            type: 'user',
            event: 'CPT code added (assist mode - RVU tracking only, not a real charge)',
            detail: `${sp?.label ?? specId}: ${code} added via Code Manager - LIS owns real billing in assist mode`,
            user: signingUser?.name ?? signingUser?.id ?? 'unknown',
            caseId: caseData.accession?.fullAccession ?? caseData.id,
            confidence: null,
          });
        }
      }
    }
    for (const [specId, removedCodes] of removalsBySpecimen) {
      for (const code of removedCodes) {
        if (isOrchestrationMode) {
          recordCreditTransaction(specId, undefined, code, postSignoutContext);
        } else {
          const sp = caseData.specimens?.find(s => s.id === specId);
          auditService.logEvent({
            type: 'user',
            event: 'CPT code removed (assist mode - no real charge to credit)',
            detail: `${sp?.label ?? specId}: ${code} removed via Code Manager - RVU tracking only, LIS owns real billing in assist mode`,
            user: signingUser?.name ?? signingUser?.id ?? 'unknown',
            caseId: caseData.accession?.fullAccession ?? caseData.id,
            confidence: null,
          });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recordChargeTransaction / recordCreditTransaction are plain functions recreated every render from the same caseData (listed); listing them would rebuild this callback every render
  }, [caseData, knownVersionRef, setConcurrencyConflict, setCaseData, markDirty, isOrchestrationMode, signingUser]);

  // ── Orchestrator handlers ──────────────────────────────────
  const {
    isOrchestrating,
    pendingAutoGenerate,
    handleGenerateReport,
    handleStartManualEntry,
    handleAbortGenerate,
    handleRegenerateSection,
    cancelAutoGenerate,
  } = useReportGeneration({
    caseData, signingUser, showToast, orchSections, setOrchSections,
    overrideTemplateId, safeSetLeftTab, leftTab, isOrchestrationMode,
    synopticPanelRef, caseId,
    setResolvedContext, setResolvedTemplateId, setResolvedTemplateName, setResolvedBy,
    setLastGeneratedAt,
  });

  // Real fix, per direct UX simplification: "if they are accessing
  // the Report Draft without touching the template, I think it is
  // safe to assume that... the intent is to dictate." Rather than
  // making every PA click "Start writing manually" every time,
  // auto-opens the same blank, dictation-ready sections the moment
  // they land on Report Draft with the active report genuinely
  // untouched (zero answered fields) — no extra click needed. Two
  // real guards keep this from ever clobbering something real:
  // orchSections.length > 0 (already has content — from a prior
  // Generate/manual start — never auto-replace real work) and the
  // "untouched" check itself, which only looks at the *currently
  // active* report (grossing or synoptic, whichever this stage of
  // the case is actually on) — a PA who went the synoptic-first
  // route and has real answers still sees the normal two-choice
  // empty state instead, since their intent is genuinely ambiguous
  // in that case, not inferrable.
  useEffect(() => {
    if (!isOrchestrationMode || leftTab !== 'draft') return;
    if (orchSections.length > 0) return; // already has content — never auto-clobber
    if (!caseData) return;

    const activeReports = activeReportType === 'grossing'
      ? (caseData.grossingReports ?? [])
      : (caseData.synopticReports ?? []);
    const activeInstance = activeReports.find(r => r.instanceId === activeReportInstanceId);
    const isUntouched = !activeInstance || Object.keys(activeInstance.answers ?? {}).length === 0;

    if (isUntouched) handleStartManualEntry();
  }, [leftTab, isOrchestrationMode, orchSections.length, caseData, activeReportType, activeReportInstanceId, handleStartManualEntry]);


  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  // ── Case not found ─────────────────────────────────────────────────────────
  if (isLoaded && caseNotFound) {
    // Batch 396: the same neutral screen as /report/:caseId, whatever the reason.
    return (
      <div className="ps-case-not-found">
        <CaseUnavailable caseId={caseId ?? ''} onBack={() => navigate('/')} />
      </div>
    );
  }

  return (
    <SpellCheckProvider value={spellCheck}>
    <div className={`ps-synrp-root ${isLoaded ? 'ps-synrp-root--loaded' : ''}`}>
      {/* Background */}
      <div className="ps-synrp-bg-image" />
      <div className="ps-synrp-bg-overlay" />
      <div className="ps-synrp-bg-gradient" />

      {/* Toast */}
      <SaveToast message={toastMsg} visible={toastVisible} kind={toastKind} containsPhi={toastContainsPhi} onDismiss={dismissToast} />

      {/* Auto-generate-once confirmation toast — cancelable window before
          a draft is silently created from completed synoptic data. */}
      {pendingAutoGenerate && (
        <div className="ps-autogen-toast">
          <span className="ps-autogen-toast-spinner" />
          <span className="ps-autogen-toast-text">
            {tGrossingNav('synopticReportPage.autoGenerate.generating')}
          </span>
          <button
            onClick={cancelAutoGenerate}
            className="ps-autogen-toast-cancel"
          >{tGrossingNav('common.cancel')}</button>
        </div>
      )}

      {/* Shell */}
      <div className="ps-synrp-shell" role="main">

        {/* NavBar */}
        <NavBar
          onLogoClick={() => guard('/')}
          onLogout={() => setShowLogoutModal(true)}
          onProfileClick={() => setIsProfileOpen(!isProfileOpen)}
        />

        {/* HeaderBar — compact single-strip when in Report Draft (maximises
            editor space), or when the user manually toggles it via the new
            Compact/Full view buttons -- either trigger independently puts
            the header into the same, already-existing compact render path. */}
        <HeaderBar
          caseData={caseData}
          onNavigate={guard}
          returnTarget={returnTarget}
          onSignOut={handleSignOutClick}
          aiSynthesisStatus={aiSynthesisStatus}
          onAiStatusClick={handleAiStatusReviewClick}
          compact={(isOrchestrationMode && leftTab === 'draft') || isHeaderCompactManual}
          isManuallyCompact={isHeaderCompactManual}
          onToggleManualCompact={() => setIsHeaderCompactManual(v => !v)}
          onChangePriority={canEditPriority ? handleChangePriority : undefined}
          priorityLevels={priorityLevels}
          deficiencyCount={caseDeficiencies.length}
          onOpenDeficiencyHistory={() => setShowDeficiencyModal(true)}
          versionCount={caseVersions.length}
          onOpenVersionHistory={() => setShowVersionHistoryModal(true)}
          changeCount={changeEntries.length}
          onOpenChangeHistory={() => setShowChangeHistory(true)}
          signatureCount={caseSignatures.length}
          onOpenSignatureHistory={() => setShowSignatureHistoryModal(true)}
          focusedBlockId={focusedBlockEntry?.block.id}
          onOpenBlockEditor={() => setShowBlockEditor(true)}
          onCaseUpdate={handleHeaderCaseUpdate}
        />

        {/* Alert bar */}
        {(() => {
          const reports = caseData?.synopticReports ?? [];
          const activeReport = activeReportInstanceId
            ? reports.find(r => r.instanceId === activeReportInstanceId)
            : reports[0];
          const answers = activeReport?.answers ?? caseData?.synopticAnswers ?? {};
          void answers;
          const templateId = activeReport?.templateId ?? caseData?.synopticTemplateId;
          if (!templateId) return null;
          return (
            <div className="ps-alert-banner">
              <div
                {...pressable(handleAlertBannerClick, { role: null })}
                className="ps-alert-banner-row"
              >
                <div className="ps-alert-banner-text">
                  ⚠️ {tGrossingNav('synopticReportPage.requiredAlert.title')}{' '}
                  <span className="ps-alert-banner-link">
                    {isOrchestrationMode && leftTab === 'draft' ? tGrossingNav('synopticReportPage.requiredAlert.reviewLink') : tGrossingNav('synopticReportPage.requiredAlert.clickLink')}
                  </span>
                </div>
                <span
                  className={`ps-alert-chevron${isAlertExpanded ? ' ps-alert-chevron--expanded' : ''}`}
                  {...pressable(e => { e.stopPropagation(); setIsAlertExpanded(a => !a); })}
                  aria-expanded={isAlertExpanded} aria-label={tGrossingNav('a11y.showDetails')}
                ><span aria-hidden="true">▼</span></span>
              </div>
              {isAlertExpanded && (
                <div className="ps-alert-banner-detail">
                  <Trans i18nKey="synopticReportPage.requiredAlert.detail" components={{ strong: <strong /> }} />
                </div>
              )}
            </div>
          );
        })()}

        {/* Main body */}
        <div className="ps-synrp-main-body">

          {/* Sidebar */}
          <SynopticSidebar>
            <Sidebar
              caseData={caseData}
              activeTab={activeTab}
              onChangeTab={setActiveTab}
              activeSpecimenId={activeSpecimenId}
              onSelectSpecimen={setActiveSpecimenId}
              onAddSynoptic={() => setShowAddSynopticModal(true)}
              onAddMicroscopic={(specimenId) => {
                setActiveSpecimenId(specimenId);
                setActiveReportType('microscopic');
              }}
              onEditSpecimen={handleEditSpecimen}
              onOpenCaseComment={() => setShowCaseCommentModal(true)}
              onOpenSpecimenComment={(id) => { setActiveSpecimenCommentId(id); setShowSpecimenCommentModal(true); }}
              hasCaseComment={hasCaseComment}
              onOpenRetentionHold={() => setShowRetentionHoldModal(true)}
              hasActiveRetentionHold={(caseData?.retentionHolds ?? []).some(h => h.active)}
              onOpenCaseHold={() => setShowCaseHoldModal(true)}
              hasActiveCaseHold={(caseData?.caseHolds ?? []).some(h => h.active)}
              specimenComments={specimenComments}
              activeReportInstanceId={activeReportInstanceId}
              onSelectReport={(instanceId, specimenId, reportType) => {
                setActiveReportInstanceId(instanceId);
                setActiveSpecimenId(specimenId);
                setActiveReportType(reportType);
              }}
              onDeleteReport={handleDeleteReport}
              onEditWorkupParts={setPartsInstanceId}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(v => !v)}
            />
          </SynopticSidebar>

          {/* Batch 427: which parts a synoptic workup covers. */}
          <WorkupPartsModal
            instance={(caseData?.synopticReports ?? []).find(r => r.instanceId === partsInstanceId) ?? null}
            reports={caseData?.synopticReports ?? []}
            specimens={(caseData?.specimens ?? []).map(sp => ({ id: sp.id, label: sp.label, description: sp.description }))}
            onApply={handleApplyWorkupParts}
            onClose={() => setPartsInstanceId(null)}
          />

          {/* Left panel — tabbed ──────────────────────────────────────────── */}
          <div className="ps-syn-left-panel-wrap">

            {/* Collapsed sidebar nav strip */}
            {sidebarCollapsed && (() => {
              const allSynoptics = (caseData?.specimens ?? []).flatMap(sp =>
                (caseData?.synopticReports ?? [])
                  .filter(r => r.specimenId === sp.id)
                  .map(r => ({ ...r, specimenLabel: sp.label, specimenDesc: sp.description }))
              );
              const idx     = allSynoptics.findIndex(r => r.instanceId === activeReportInstanceId);
              const current = allSynoptics[idx];
              const prev    = allSynoptics[idx - 1];
              const next    = allSynoptics[idx + 1];
              return (
                <div className="ps-syn-nav-strip">
                  <button
                    className="ps-syn-nav-strip-btn"
                    onClick={() => prev && (setActiveReportInstanceId(prev.instanceId), setActiveSpecimenId(prev.specimenId))}
                    disabled={!prev}
                  >‹</button>
                  <div className="ps-syn-nav-strip-text">
                    {current ? (
                      <>
                        <span className="ps-syn-nav-strip-letter">{current.specimenLabel}:</span>
                        {' '}{current.specimenDesc}
                        <span className="ps-syn-nav-strip-sep">›</span>
                        <span className="ps-syn-nav-strip-name">{current.templateName}</span>
                        <span className="ps-syn-nav-strip-count">{idx + 1} / {allSynoptics.length}</span>
                      </>
                    ) : (
                      <span className="ps-syn-nav-strip-empty">{tGrossingNav('synopticReportPage.noSynopticSelected')}</span>
                    )}
                  </div>
                  <button
                    className="ps-syn-nav-strip-btn"
                    onClick={() => next && (setActiveReportInstanceId(next.instanceId), setActiveSpecimenId(next.specimenId))}
                    disabled={!next}
                  >›</button>
                </div>
              );
            })()}

            {/* Tab bar */}
            <div className="ps-syn-tabbar">
              {(['draft', 'report', 'material'] as const)
                .filter(tab => tab !== 'draft' || isOrchestrationMode)
                .map(tab => {
                const label = tab === 'draft' ? `✍️ ${tGrossingNav('synopticReportPage.tabs.draft')}` : tab === 'report' ? `📑 ${tGrossingNav('synopticReportPage.tabs.report')}` : `🧱 ${tGrossingNav('synopticReportPage.tabs.material')}`;
                const isActive = leftTab === tab;
                const st2 = caseData?.status ?? 'draft';
                // 'pending-countersign' is a per-synoptic-instance status (SynopticReportInstance),
                // not a CaseStatus value — check whether any instance on this case needs it.
                const needsCountersign2 = (caseData?.synopticReports ?? []).some(r => r.status === 'pending-countersign');
                const dot2Class = st2 === 'finalized' ? 'ps-syn-tab-dot--finalized'
                  : st2 === 'pending-review' || needsCountersign2 ? 'ps-syn-tab-dot--pending'
                  : st2 === 'in-progress' ? 'ps-syn-tab-dot--in-progress'
                  : 'ps-syn-tab-dot--draft';
                return (
                  <button
                    key={tab}
                    onClick={() => safeSetLeftTab(tab)}
                    className={`ps-syn-tab-btn${isActive ? ' ps-syn-tab-btn--active' : ''}`}
                  >
                    {label}
                    {tab === 'draft' && isOrchestrationMode && (
                      <span
                        title={tGrossingNav('synopticReportPage.reportStatusTitle', { status: tGrossingNav(`synopticReportPage.reportStatus.${String(st2)}`, { defaultValue: String(st2) }) })}
                        className={`ps-syn-tab-dot ${dot2Class}`}
                      />
                    )}
                  </button>
                );
              })}

              {/* Batch 577: who else has the case open sits in the tab bar's own row, with the tools, so it
                  appearing or going never moves the page (it used to add a line above the tabs' content). Both
                  stay pinned to the right while the tabs scroll underneath on a narrow window. */}
              <div className="ps-syn-tabbar-end">
              <CasePresenceStrip presence={casePresence} />

              {/* Sequencer + DEV tools — right side of tab bar.
                  Hidden in Orchestration draft mode — these move into the
                  centre Full Report pane's own header there instead, since
                  they're document-level controls, not tab-bar navigation. */}
              {!(isOrchestrationMode && leftTab === 'draft') && (
              <div className="ps-syn-tabbar-tools">
                {import.meta.env.DEV && caseData && (
                  <div className="ps-syn-devmenu-wrap">
                    <button
                      ref={devToolsBtnRef}
                      onClick={() => {
                        if (!showDevToolsMenu && devToolsBtnRef.current) {
                          const r = devToolsBtnRef.current.getBoundingClientRect();
                          setDevToolsMenuPos({ top: r.bottom + 4, left: r.left });
                        }
                        setShowDevToolsMenu(v => !v);
                      }}
                      className="ps-syn-dev-btn ps-syn-dev-btn--microscopic"
                      title={tGrossingNav('synopticReportPage.devTools.menuTitle')}
                    >
                      🛠️ {tGrossingNav('synopticReportPage.devTools.menu')} {showDevToolsMenu ? '▴' : '▾'}
                    </button>
                    {showDevToolsMenu && devToolsMenuPos && ReactDOM.createPortal(
                      <div className="ps-syn-devmenu ps-syn-devmenu--portaled" style={{ '--devmenu-top': `${devToolsMenuPos.top}px`, '--devmenu-left': `${devToolsMenuPos.left}px` } as React.CSSProperties}>
                        <button
                          className="ps-syn-devmenu-item"
                          onClick={() => { setShowDevToolsMenu(false); handleProtocolChangesDetected([{
                            id: 'demo-proto-1',
                            specimenId:           caseData.specimens?.[0]?.id ?? 'sp-1',
                            specimenLabel:        (caseData.specimens?.[0] as any)?.label ?? 'A',
                            specimenDesc:         caseData.specimens?.[0]?.description ?? 'Core biopsy',
                            currentTemplateId:    'breast_core_general',
                            currentTemplateName:  'Breast Core Biopsy (General)',
                            proposedTemplateId:   'breast_invasive_carcinoma',
                            proposedTemplateName: 'Breast Invasive Carcinoma',
                            reason:               'Microscopic shows invasive ductal carcinoma, nuclear grade 2, tubule formation score 3.',
                            confidence:           92,
                          }]); }}
                          title={tGrossingNav('synopticReportPage.devTools.simMicroscopicTitle')}
                        >
                          ⚡ {tGrossingNav('synopticReportPage.devTools.simMicroscopic')}
                        </button>
                        <button
                          className="ps-syn-devmenu-item"
                          onClick={() => { setShowDevToolsMenu(false); simulateLisAmendmentReceived(); }}
                          title={tGrossingNav('synopticReportPage.devTools.simLisAmendmentTitle')}
                        >
                          ⚡ {tGrossingNav('synopticReportPage.devTools.simLisAmendment')}
                        </button>
                        <button
                          className="ps-syn-devmenu-item"
                          onClick={() => { setShowDevToolsMenu(false); simulateBlockExceptionReceived(); }}
                          title={tGrossingNav('synopticReportPage.devTools.simBlockExceptionTitle')}
                        >
                          ⚡ {tGrossingNav('synopticReportPage.devTools.simBlockException')}
                        </button>
                        <button
                          className="ps-syn-devmenu-item"
                          onClick={() => { setShowDevToolsMenu(false); simulateMaterialLocationReceived(); }}
                          title={tGrossingNav('synopticReportPage.devTools.simLocationTitle')}
                        >
                          ⚡ {tGrossingNav('synopticReportPage.devTools.simLocation')}
                        </button>
                        <button
                          className="ps-syn-devmenu-item"
                          onClick={() => { setShowDevToolsMenu(false); simulateCassetteDispatchOutcomeReceived(); }}
                          title={tGrossingNav('synopticReportPage.devTools.simCassetteDispatchTitle')}
                        >
                          ⚡ {tGrossingNav('synopticReportPage.devTools.simCassetteDispatch')}
                        </button>
                        <button
                          className="ps-syn-devmenu-item"
                          onClick={() => { setShowDevToolsMenu(false); simulateFullMaterialTreeLocationUpdate(); }}
                          title={tGrossingNav('synopticReportPage.devTools.simAllLocationsTitle')}
                        >
                          ⚡ {tGrossingNav('synopticReportPage.devTools.simAllLocations')}
                        </button>
                      </div>,
                      document.body,
                    )}
                  </div>
                )}
                <button
                  onClick={() => setShowSequencer(true)}
                  title={tGrossingNav('synopticReportPage.sequencer.title')}
                  className="ps-syn-sequencer-btn"
                >
                  🔀 {tGrossingNav('synopticReportPage.sequencer.button')} ↗
                </button>
              </div>
              )}
              </div>

            </div>

            {/* Tab content */}
            <CaseUpdatedBanner version={caseUpdate.version} overlap={caseUpdateOverlap} busy={caseUpdateBusy}
              onShow={() => void handleCaseUpdateShow()} onLater={() => caseUpdate.dismiss()} onOverlapSeen={() => setCaseUpdateOverlap(false)} />
            <div className="ps-syn-tab-content">
              {/* Report Draft — three-column Orchestration layout (O26- cases only)
                  Navigator (foldable) | Full Report (centre, read-only) | Section Editor (right)
                  All three share activeSectionId — clicking in any pane updates the other two. */}
              {isOrchestrationMode && (
              <div className={`ps-syn-tab-panel ps-syn-tab-panel--dark${leftTab === 'draft' ? ' ps-syn-tab-panel--visible-flex' : ''}`}>

                {/* ── CENTRE: Full Report — read-only formatted preview ───────
                    Has its own sticky header for document-level controls:
                    template identity/selector, Sim Microscopic, Sequencer,
                    Print. These are properties of the DOCUMENT, not the
                    editor — they don't belong in the right-hand editor's
                    toolbar, which is reserved for editing actions only. */}
                <div className="ps-ose-centre-pane-wrap">
                  <div className="ps-ose-centre-header">
                    <div className="ps-ose-centre-header-left">
                      <span className="ps-ose-centre-tmpl-name">{resolvedTemplateName === GOLD_STANDARD_TEMPLATE_NAME ? tGrossingNav('synopticReportPage.templatePicker.goldStandardGeneral') : resolvedTemplateName}</span>
                      <span className="ps-ose-centre-tmpl-by">
                        {overrideTemplateId ? tGrossingNav('synopticReportPage.templatePicker.pathologistOverride') : tGrossingNav('synopticReportPage.templatePicker.resolvedBy', { source: tGrossingNav(`synopticReportPage.templatePicker.sources.${resolvedBy ?? 'gold-standard'}`, { defaultValue: (resolvedBy ?? 'gold-standard').replace(/-/g, ' ') }) })}
                      </span>
                      <div className="ps-ose-tmpl-change-wrap">
                        <button className="ps-ose-centre-btn" onClick={() => setShowCentreTemplatePicker(v => !v)}>{tGrossingNav('synopticReportPage.templatePicker.change')} ▾</button>
                        {showCentreTemplatePicker && (
                          <div className="ps-ose-tmpl-picker">
                            <div className="ps-ose-tmpl-picker-title">{tGrossingNav('synopticReportPage.templatePicker.title')}</div>
                            {orchSections.some(s => s.text) && (
                              <div className="ps-ose-tmpl-picker-warn">⚠️ {tGrossingNav('synopticReportPage.templatePicker.regenerateWarning')}</div>
                            )}
                            {centreTemplates.map(t => (
                              <div
                                key={t.id}
                                className={`ps-ose-tmpl-option${(overrideTemplateId ?? '') === t.id ? ' ps-ose-tmpl-option--active' : ''}`}
                                {...pressable(() => { setOverrideTemplateId(t.id); setShowCentreTemplatePicker(false); })}
                              >
                                <span className="ps-ose-tmpl-option-name">{t.name}</span>
                                {t.specialty && <span className="ps-ose-tmpl-option-meta">{t.specialty}</span>}
                              </div>
                            ))}
                            <div className="ps-ose-tmpl-option" {...pressable(() => { setOverrideTemplateId(null); setShowCentreTemplatePicker(false); })}>
                              <span className="ps-ose-tmpl-option-name">↺ {tGrossingNav('synopticReportPage.templatePicker.systemResolved')}</span>
                              <span className="ps-ose-tmpl-option-meta">{resolvedTemplateName === GOLD_STANDARD_TEMPLATE_NAME ? tGrossingNav('synopticReportPage.templatePicker.goldStandard') : resolvedTemplateName}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ps-ose-centre-header-right">
                      {import.meta.env.DEV && caseData && (
                        <button
                          className="ps-ose-centre-btn ps-ose-centre-btn--sim"
                          onClick={() => handleProtocolChangesDetected([{
                            id: 'demo-proto-1',
                            specimenId:           caseData.specimens?.[0]?.id ?? 'sp-1',
                            specimenLabel:        (caseData.specimens?.[0] as any)?.label ?? 'A',
                            specimenDesc:         caseData.specimens?.[0]?.description ?? 'Core biopsy',
                            currentTemplateId:    'breast_core_general',
                            currentTemplateName:  'Breast Core Biopsy (General)',
                            proposedTemplateId:   'breast_invasive_carcinoma',
                            proposedTemplateName: 'Breast Invasive Carcinoma',
                            reason:               'Microscopic shows invasive ductal carcinoma, nuclear grade 2, tubule formation score 3.',
                            confidence:           92,
                          }])}
                          title={tGrossingNav('synopticReportPage.devTools.simMicroscopicTitle')}
                        >⚡ {tGrossingNav('synopticReportPage.devTools.simMicroscopic')}</button>
                      )}
                      <button className="ps-ose-centre-btn" onClick={() => setShowSequencer(true)} title={tGrossingNav('synopticReportPage.sequencer.title')}>
                        🔀 {tGrossingNav('synopticReportPage.sequencer.button')} ↗
                      </button>
                      <CapabilityButton
                        capability="report:case-report:print"
                        context={{ caseId: caseData?.id ?? null, facilityId: caseData?.order?.facilityId ?? null }}
                        className="ps-ose-centre-btn"
                        onClick={() => { void handleOrchPrint(); }}
                        disabled={isPrinting}
                        title={tGrossingNav('synopticReportPage.print.buttonTitle')}
                      >
                        🖨 {isPrinting ? tGrossingNav('synopticReportPage.print.printing') : tGrossingNav('synopticReportPage.print.button')}
                      </CapabilityButton>
                    </div>
                  </div>
                  <div className="ps-ose-centre-pane">
                    <ReportPreviewRenderer
                      sections={orchSections}
                      bodyAssembly={resolvedContext?.narrativeTemplate.bodyAssembly ?? []}
                      headerAssembly={resolvedContext?.narrativeTemplate.headerAssembly ?? []}
                      footerAssembly={resolvedContext?.narrativeTemplate.footerAssembly ?? []}
                      structuredContext={resolvedContext}
                      caseData={caseData}
                      templateName={resolvedTemplateName}
                      resolvedBy={resolvedBy}
                      activeSectionId={activeSectionId}
                      onSectionClick={setActiveSectionId}
                      documentStyle={resolvedContext?.narrativeTemplate.documentStyle}
                      fontUnits={resolvedContext?.narrativeTemplate.fontUnits}
                      revisionStatus={reportRevisionStatus}
                      intraoperativeDiagnosis={intraopDiagnosisText}
                      relatedCases={attachedRelated}
                    />
                  </div>
                </div>

                {/* ── RIGHT: Section editor ────────────────────────────────── */}
                <div className="ps-ose-right-pane">
                  <OrchestratorSectionEditor
                    tabWidthChars={tabWidthChars}
                    onTabWidthChange={handleTabWidthChange}
                    sections={orchSections}
                    isGenerating={isOrchestrating}
                    lastGeneratedAt={lastGeneratedAt}
                    caseData={caseData}
                    resolvedTemplateName={resolvedTemplateName}
                    resolvedBy={resolvedBy}
                    overrideTemplateId={overrideTemplateId}
                    onOverrideTemplate={setOverrideTemplateId}
                    activeSectionId={activeSectionId}
                    onActiveSectionChange={setActiveSectionId}
                    onSectionChange={handleSectionTextChange}
                    onAcceptSection={handleAcceptSection}
                    onAcceptDraft={handleAcceptDraft}
                    onKeepVersion={handleKeepVersion}
                    onRegenerateSection={handleRegenerateSection}
                    onAcceptAll={handleAcceptAllSections}
                    onGenerateReport={isOrchestrationMode ? handleGenerateReport : undefined}
                    onStartManualEntry={isOrchestrationMode ? handleStartManualEntry : undefined}
                    documentStyle={resolvedContext?.narrativeTemplate.documentStyle}
                    fontUnits={resolvedContext?.narrativeTemplate.fontUnits}
                    criticalFindings={criticalFindings}
                  />
                </div>
              </div>
              )}

              {/* Sequencer — now a modal, triggered by tab button */}
              <SequencerPanel
                show={showSequencer}
                onClose={() => setShowSequencer(false)}
                onSave={handleSequencerSave}
                caseData={caseData}
                activeReportInstanceId={activeReportInstanceId}
                onSelectReport={(instanceId, specimenId, reportType) => {
                  setActiveReportInstanceId(instanceId);
                  setActiveSpecimenId(specimenId);
                  setActiveReportType(reportType ?? 'synoptic'); // the Sequencer lists synoptic reports and omits the type
                }}
              />

              {/* Full Report — LIS-sourced for CoPilot mode; for
                  Orchestration mode, caseData.diagnostic is kept synced
                  from orchSections (see syncOrchSectionsToDiagnostic above
                  — runs both on orchSections change and explicitly on
                  switching onto this tab), so LeftReportPanel reflects the
                  current draft without needing a different renderer here.
                  Keeping LeftReportPanel for both modes preserves the
                  field-label "click to highlight source in report"
                  feature (RightSynopticPanel's onHighlight callback only
                  ever targeted LeftReportPanel's highlightText prop). */}
              <div className={`ps-syn-tab-panel ps-syn-tab-panel--scroll${leftTab === 'report' ? ' ps-syn-tab-panel--visible-block' : ''}`}>
                {pendingLisNotice && (
                  <div className="ps-lis-triage-banner">
                    <div>
                      <div className="ps-lis-triage-title">⚠ {tGrossingNav('synopticReportPage.lisAmendment.title')}</div>
                      <p className="ps-lis-triage-summary">{pendingLisNotice.lisAmendmentSummary}</p>
                    </div>
                    <button className="ps-conf-btn-primary" onClick={handleMarkReviewedNoChanges}>
                      {tGrossingNav('synopticReportPage.lisAmendment.markReviewed')}
                    </button>
                  </div>
                )}
                <AmendmentDraftBanner caseData={caseData} activeReportInstanceId={activeReportInstanceId} onEdit={handleRequestAmendment} />
                <AmendmentStatusBanner caseId={caseData?.id} synopticReports={caseData?.synopticReports} specimens={caseData?.specimens} refreshKey={takenUpKey} />
                {/* Batch 613: the patient's other cases this person can't open, and the request to see them (settled while the case is worked up; sign-out shows it too). */}
                <RelatedCasesAmendedNotice caseId={caseData?.id} status={caseData?.status} />
                {caseData?.patient?.id && caseData?.id && <RestrictedCasesNotice patientId={caseData.patient.id} caseId={caseData.id} />}

                {/* Real, per direct follow-up: "it all needs to be
                    wired" \u2014 resolveAutopsyAccessionStatus.ts had
                    zero real UI callers anywhere; the gate-blocking
                    banner below only ever fires the 'temporary' case
                    (when blocked), so the positive 'fully_authorized'
                    state had no visible confirmation anywhere on the
                    case. This is that real, always-visible read \u2014
                    same real ps-autopsy-status-badge--* classes
                    AutopsyAuthorizationCompletionForm.tsx already
                    established, deliberately the same status
                    function the gate itself is built on top of, per
                    that function's own doc comment ("never a second,
                    separate definition of authorized"). */}
                {caseData?.autopsy && (
                  <div className="ps-autopsy-intake-status">
                    <span className={`ps-autopsy-status-badge ps-autopsy-status-badge--${resolveAutopsyAccessionStatus(caseData.autopsy)}`} data-phi="accession">{resolveAutopsyAccessionStatus(caseData.autopsy) === 'fully_authorized' ? tGrossingNav('synopticReportPage.autopsy.fullyAuthorized') : tGrossingNav('synopticReportPage.autopsy.temporaryAccession')}</span>
                    {/* Real, per direct follow-up: "it all needs to
                        be wired" \u2014 resolveAutopsyTatSlaMatrix.ts
                        had zero real UI callers; this is that real
                        surfacing, right alongside the status badge
                        above rather than a separate, easy-to-miss
                        screen. */}
                    <p className="ps-conf-section-subtitle ps-conf-section-subtitle--form-gap">
                      {formatAutopsyTatSlaSummary(resolveAutopsyTatSlaMatrix(caseData.autopsy.jurisdiction))}
                    </p>
                    {/* Batch 610 (#60, #88): the verdict against that target, on the report status line. */}
                    <AutopsyTatChip autopsy={caseData.autopsy} caseSource={caseData} />
                  </div>
                )}

                {/* Batch 476 (PS-261 follow-up, Module 4 of the FE
                    feature-complete plan) — the real, unified case
                    timeline: every forensic order, consent event,
                    custody transfer, toxicology order/result/
                    cancellation, organ retention detail/disposal,
                    ancillary hold, report signing, and addendum
                    already recorded on this case, merged into one
                    chronological view (buildAutopsyCaseTimeline.ts)
                    rather than requiring staff to piece the sequence
                    together from the separate sections below. */}
                {caseData?.autopsy && (
                  <div className="ps-autopsy-timeline-section">
                    <div className="ps-conf-form-section-title">{tGrossingNav('synopticReportPage.autopsy.timeline.title')}</div>
                    <AutopsyCaseTimeline entries={autopsyTimeline} />
                  </div>
                )}

                {/* Real, per direct follow-up: "it all needs to be
                    wired" — organRetentionTier had no real UI
                    anywhere to set it; resolveHtaApplicability.ts is
                    the real, deliberate gate on whether it means
                    anything at all for this case's own jurisdiction
                    (UK HTA 2004/2006, NZ Coroners Act 2006 only —
                    never shown for a real jurisdiction the spec
                    didn't name). */}
                {caseData?.autopsy && resolveHtaApplicability(caseData.autopsy.jurisdiction) && (
                  <div className="ps-conf-form-field ps-conf-form-field--narrow">
                    <label className="ps-conf-label" htmlFor="organ-retention-tier">{tGrossingNav('synopticReportPage.autopsy.organRetentionTier')}</label>
                    <select
                      id="organ-retention-tier"
                      className="ps-conf-select"
                      disabled={!capabilities.has('autopsy:retention-tier:record', { caseId: caseData.id })}
                      value={caseData.autopsy.organRetentionTier ?? ''}
                      onChange={e => handleOrganRetentionTierChange((e.target.value || undefined) as AutopsyCaseDetails['organRetentionTier'])}
                    >
                      <option value="">{tGrossingNav('synopticReportPage.autopsy.tierNotRecorded')}</option>
                      <option value="tier_0_no_retention">{tGrossingNav('synopticReportPage.autopsy.tiers.tier_0_no_retention')}</option>
                      <option value="tier_1_diagnostic_tissue_only">{tGrossingNav('synopticReportPage.autopsy.tiers.tier_1_diagnostic_tissue_only')}</option>
                      <option value="tier_2_full_organ_retention">{tGrossingNav('synopticReportPage.autopsy.tiers.tier_2_full_organ_retention')}</option>
                      <option value="tier_3_education_research_genomic">{tGrossingNav('synopticReportPage.autopsy.tiers.tier_3_education_research_genomic')}</option>
                    </select>
                  </div>
                )}
                {/* Batch 472 — an optional reason for the tier
                    selection itself, saved through the same write
                    site as the select above. */}
                {caseData?.autopsy && resolveHtaApplicability(caseData.autopsy.jurisdiction) && (
                  <div className="ps-conf-form-field ps-conf-form-field--narrow">
                    <label className="ps-conf-label" htmlFor="organ-retention-tier-reason">{tGrossingNav('synopticReportPage.autopsy.tierReasonLabel')}</label>
                    <input
                      id="organ-retention-tier-reason"
                      className="ps-conf-input"
                      disabled={!capabilities.has('autopsy:retention-tier:record', { caseId: caseData.id })}
                      value={retentionTierReasonDraft}
                      onChange={e => setRetentionTierReasonDraft(e.target.value)}
                      onBlur={() => {
                        if (retentionTierReasonDraft !== (caseData.autopsy?.organRetentionTierReason ?? '')) {
                          void handleOrganRetentionTierChange(caseData.autopsy?.organRetentionTier, retentionTierReasonDraft);
                        }
                      }}
                    />
                  </div>
                )}

                {/* Batch 471 (PS-261 follow-up) — who holds retained
                    organs/tissue and where, while retention is
                    ongoing. Same gate as the disposal panel below:
                    an HTA-applicable jurisdiction with a retention
                    tier beyond tier_0_no_retention on file. Shown
                    before the disposal panel — disposal only makes
                    sense once retention itself has a real record. */}
                {caseData?.autopsy && resolveHtaApplicability(caseData.autopsy.jurisdiction)
                  && caseData.autopsy.organRetentionTier && caseData.autopsy.organRetentionTier !== 'tier_0_no_retention' && (
                  <div className="ps-autopsy-custody-log">
                    <div className="ps-conf-form-section-title">{tGrossingNav('synopticReportPage.autopsy.retentionDetail.title')}</div>
                    {caseData.autopsy.organRetentionDetail && !showAutopsyRetentionDetailForm ? (
                      <div className="ps-autopsy-custody-entry">
                        <div className="ps-autopsy-custody-entry__transfer">
                          {tGrossingNav('synopticReportPage.autopsy.retentionDetail.summaryLine', { recipient: caseData.autopsy.organRetentionDetail.recipientName, location: caseData.autopsy.organRetentionDetail.location })}
                        </div>
                        <div className="ps-autopsy-custody-entry__meta">
                          {tGrossingNav('synopticReportPage.autopsy.retentionDetail.metaLine', { at: formatDateTime(caseData.autopsy.organRetentionDetail.recordedAt, i18nForDates.language), by: caseData.autopsy.organRetentionDetail.recordedByName })}
                          {caseData.autopsy.organRetentionDetail.reason ? tGrossingNav('synopticReportPage.autopsy.retentionDetail.reasonSuffix', { reason: caseData.autopsy.organRetentionDetail.reason }) : ''}
                        </div>
                        <button className="ps-conf-btn-secondary" onClick={() => {
                          const current = caseData.autopsy!.organRetentionDetail!;
                          setRetentionDetailForm({ recipientName: current.recipientName, location: current.location, reason: current.reason ?? '' });
                          setShowAutopsyRetentionDetailForm(true);
                        }}>
                          {tGrossingNav('synopticReportPage.autopsy.retentionDetail.updateBtn')}
                        </button>
                        {(caseData.autopsy.organRetentionHistory?.length ?? 0) > 1 && (
                          <div className="ps-autopsy-retention-history" data-testid="retention-history">
                            <div className="ps-conf-section-subtitle">{tGrossingNav('synopticReportPage.autopsy.retentionDetail.historyTitle')}</div>
                            {[...caseData.autopsy.organRetentionHistory!].slice(0, -1).reverse().map(h => (
                              <div key={h.recordedAt} className="ps-autopsy-custody-entry">
                                <div className="ps-autopsy-custody-entry__transfer">
                                  {tGrossingNav('synopticReportPage.autopsy.retentionDetail.summaryLine', { recipient: h.recipientName, location: h.location })}
                                </div>
                                <div className="ps-autopsy-custody-entry__meta">
                                  {tGrossingNav('synopticReportPage.autopsy.retentionDetail.metaLine', { at: formatDateTime(h.recordedAt, i18nForDates.language), by: h.recordedByName })}
                                  {h.reason ? tGrossingNav('synopticReportPage.autopsy.retentionDetail.reasonSuffix', { reason: h.reason }) : ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {!caseData.autopsy.organRetentionDetail && (
                          <p className="ps-conf-section-subtitle">{tGrossingNav('synopticReportPage.autopsy.retentionDetail.empty')}</p>
                        )}
                        {!showAutopsyRetentionDetailForm && (
                          <button className="ps-conf-btn-secondary" onClick={() => setShowAutopsyRetentionDetailForm(true)}>
                            {tGrossingNav('synopticReportPage.autopsy.retentionDetail.recordBtn')}
                          </button>
                        )}
                      </>
                    )}
                    {showAutopsyRetentionDetailForm && (
                      <div className="ps-conf-card">
                        <div className="ps-conf-form-row">
                          <div>
                            <label className="ps-label" htmlFor="retention-detail-recipient">{tGrossingNav('synopticReportPage.autopsy.retentionDetail.recipientLabel')}</label>
                            <input id="retention-detail-recipient" className="ps-conf-input" value={retentionDetailForm.recipientName}
                              onChange={e => setRetentionDetailForm({ ...retentionDetailForm, recipientName: e.target.value })} />
                          </div>
                          <div>
                            <label className="ps-label" htmlFor="retention-detail-location">{tGrossingNav('synopticReportPage.autopsy.retentionDetail.locationLabel')}</label>
                            <input id="retention-detail-location" className="ps-conf-input" value={retentionDetailForm.location}
                              onChange={e => setRetentionDetailForm({ ...retentionDetailForm, location: e.target.value })} />
                          </div>
                        </div>
                        <div className="ps-conf-form-row">
                          <div>
                            <label className="ps-label" htmlFor="retention-detail-reason">{tGrossingNav('synopticReportPage.autopsy.retentionDetail.reasonLabel')}</label>
                            <input id="retention-detail-reason" className="ps-conf-input" value={retentionDetailForm.reason}
                              onChange={e => setRetentionDetailForm({ ...retentionDetailForm, reason: e.target.value })} />
                          </div>
                        </div>
                        <div className="ps-conf-modal-footer">
                          <button className="ps-conf-btn-secondary" onClick={() => setShowAutopsyRetentionDetailForm(false)}>{tGrossingNav('synopticReportPage.autopsy.retentionDetail.cancelBtn')}</button>
                          <CapabilityButton capability="autopsy:retention-detail:record" context={{ caseId: caseData?.id ?? null }} className="ps-conf-btn-primary"
                            disabled={submittingRetentionDetail || !retentionDetailForm.recipientName || !retentionDetailForm.location}
                            onClick={handleOrganRetentionDetailSubmit}>
                            {tGrossingNav('synopticReportPage.autopsy.retentionDetail.submitBtn')}
                          </CapabilityButton>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Batch 469 (PS-261 §2.4.2) — disposal of retained
                    organs/tissue. Only shown once an HTA-applicable
                    jurisdiction has a retention tier beyond
                    tier_0_no_retention on file — the same gate
                    recordAutopsyOrganRetentionDisposal.ts itself
                    enforces. */}
                {caseData?.autopsy && resolveHtaApplicability(caseData.autopsy.jurisdiction)
                  && caseData.autopsy.organRetentionTier && caseData.autopsy.organRetentionTier !== 'tier_0_no_retention' && (
                  <div className="ps-autopsy-custody-log">
                    <div className="ps-conf-form-section-title">{tGrossingNav('synopticReportPage.autopsy.disposal.title')}</div>
                    {caseData.autopsy.organRetentionDisposal ? (
                      <div className="ps-autopsy-custody-entry">
                        <div className="ps-autopsy-custody-entry__transfer">
                          {tGrossingNav(`synopticReportPage.autopsy.disposal.methods.${caseData.autopsy.organRetentionDisposal.disposalMethod}`)}
                          {' · '}
                          {tGrossingNav('synopticReportPage.autopsy.disposal.certificateLine', { ref: caseData.autopsy.organRetentionDisposal.certificateReference })}
                        </div>
                        <div className="ps-autopsy-custody-entry__meta">
                          {tGrossingNav('synopticReportPage.autopsy.disposal.metaLine', { at: formatDateTime(caseData.autopsy.organRetentionDisposal.disposalTimestamp, i18nForDates.language), by: caseData.autopsy.organRetentionDisposal.recordedByName })}
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="ps-conf-section-subtitle">{tGrossingNav('synopticReportPage.autopsy.disposal.empty')}</p>
                        {!showAutopsyDisposalForm && (
                          <button className="ps-conf-btn-secondary" onClick={() => setShowAutopsyDisposalForm(true)}>
                            {tGrossingNav('synopticReportPage.autopsy.disposal.recordBtn')}
                          </button>
                        )}
                        {showAutopsyDisposalForm && (
                          <div className="ps-conf-card">
                            <div className="ps-conf-form-row">
                              <div>
                                <label className="ps-label" htmlFor="disposal-method">{tGrossingNav('synopticReportPage.autopsy.disposal.methodLabel')}</label>
                                <select id="disposal-method" className="ps-conf-select" value={disposalForm.disposalMethod}
                                  onChange={e => setDisposalForm({ ...disposalForm, disposalMethod: e.target.value as OrganRetentionDisposalRecord['disposalMethod'] })}>
                                  <option value="cremation">{tGrossingNav('synopticReportPage.autopsy.disposal.methods.cremation')}</option>
                                  <option value="incineration">{tGrossingNav('synopticReportPage.autopsy.disposal.methods.incineration')}</option>
                                </select>
                              </div>
                              <div>
                                <label className="ps-label" htmlFor="disposal-cert">{tGrossingNav('synopticReportPage.autopsy.disposal.certificateLabel')}</label>
                                <input id="disposal-cert" className="ps-conf-input" value={disposalForm.certificateReference}
                                  onChange={e => setDisposalForm({ ...disposalForm, certificateReference: e.target.value })} />
                              </div>
                            </div>
                            <div className="ps-conf-modal-footer">
                              <button className="ps-conf-btn-secondary" onClick={() => setShowAutopsyDisposalForm(false)}>{tGrossingNav('synopticReportPage.autopsy.disposal.cancelBtn')}</button>
                              <CapabilityButton capability="autopsy:retention-disposal:record" context={{ caseId: caseData?.id ?? null }} className="ps-conf-btn-primary"
                                disabled={submittingDisposal || !disposalForm.certificateReference}
                                onClick={handleOrganRetentionDisposalSubmit}>
                                {tGrossingNav('synopticReportPage.autopsy.disposal.submitBtn')}
                              </CapabilityButton>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Batch 468 (PS-261 §2.5.1) — consent-scope warning.
                    See resolveAutopsyConsentScopeViolation.ts's own
                    header comment for why this is a warning, not a
                    hard per-finding block: the grossing template has
                    no per-field organ tag, only specimen-level organ
                    codes, so this surfaces the organ(s) the consent
                    excludes that are nonetheless present among the
                    case's specimens — a clear flag for the pathologist,
                    not a silent hide. */}
                {caseData?.autopsy?.caseAuthority === 'hospital_consented' && (() => {
                  const excluded = resolveExcludedOrgansPresent(caseData.specimens ?? [], caseData.autopsy.hospitalConsent);
                  if (excluded.length === 0) return null;
                  const organNames = excluded.map(o => tGrossingNav(AUTOPSY_ORGAN_LABEL_KEY[o])).join(', ');
                  return (
                    <div className="ps-lis-triage-banner" data-testid="autopsy-consent-scope-warning">
                      <div>
                        <div className="ps-lis-triage-title">⚠ {tGrossingNav('synopticReportPage.autopsy.consentScope.warningTitle')}</div>
                        <p className="ps-lis-triage-summary">{tGrossingNav('synopticReportPage.autopsy.consentScope.warningBody', { organs: organNames })}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Batch 468 (PS-261 §2.4.3, §3.3) — forensic chain-of-
                    custody: a read-only log plus the one action that
                    appends to it. Forensic-only, same as the capability
                    and service behind it (recordAutopsyCustodyTransfer.ts). */}
                {caseData?.autopsy?.caseAuthority === 'statutory_judicial' && (
                  <div className="ps-autopsy-custody-log">
                    <div className="ps-conf-form-section-title">{tGrossingNav('synopticReportPage.autopsy.custody.title')}</div>
                    {(caseData.autopsy.custodyLog?.length ?? 0) === 0 && (
                      <p className="ps-conf-section-subtitle">{tGrossingNav('synopticReportPage.autopsy.custody.empty')}</p>
                    )}
                    {caseData.autopsy.custodyLog?.map(entry => (
                      <div className="ps-autopsy-custody-entry" key={entry.id}>
                        <div className="ps-autopsy-custody-entry__item">
                          {entry.itemDescription}
                          {/* Batch 475 (PS-261 follow-up) — ties this entry back to the
                              toxicology order it's about, if any. */}
                          {entry.toxicologyOrderId && (() => {
                            const linkedOrder = caseData.autopsy?.toxicologyOrders?.find(o => o.id === entry.toxicologyOrderId);
                            return linkedOrder ? (
                              <span className="ps-autopsy-custody-entry__tox-link">
                                {tGrossingNav('synopticReportPage.autopsy.custody.linkedSpecimen', { barcode: linkedOrder.specimenBarcode })}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <div className="ps-autopsy-custody-entry__transfer">
                          {tGrossingNav('synopticReportPage.autopsy.custody.transferLine', {
                            from: tGrossingNav(`synopticReportPage.autopsy.custody.custodianType.${entry.fromCustodianType}`),
                            fromName: entry.fromCustodianName,
                            to: tGrossingNav(`synopticReportPage.autopsy.custody.custodianType.${entry.toCustodianType}`),
                            toName: entry.toCustodianName,
                          })}
                        </div>
                        <div className="ps-autopsy-custody-entry__meta">
                          {tGrossingNav('synopticReportPage.autopsy.custody.metaLine', { at: formatDateTime(entry.occurredAt, i18nForDates.language), by: entry.releasedByName })}
                          {entry.receivedByName ? tGrossingNav('synopticReportPage.autopsy.custody.receivedBy', { name: entry.receivedByName }) : ''}
                        </div>
                      </div>
                    ))}
                    {!showAutopsyCustodyForm && (
                      <button className="ps-conf-btn-secondary" onClick={() => setShowAutopsyCustodyForm(true)}>
                        {tGrossingNav('synopticReportPage.autopsy.custody.recordTransferBtn')}
                      </button>
                    )}
                    {showAutopsyCustodyForm && (
                      <div className="ps-conf-card">
                        {/* Batch 475 (PS-261 follow-up) — optional: ties this
                            transfer to a specific toxicology specimen, so its
                            own chain of custody shows under its order too. */}
                        {(caseData.autopsy.toxicologyOrders?.length ?? 0) > 0 && (
                          <div className="ps-conf-form-row">
                            <div>
                              <label className="ps-label" htmlFor="custody-tox-link">{tGrossingNav('synopticReportPage.autopsy.custody.linkToxOrderLabel')}</label>
                              <select id="custody-tox-link" className="ps-conf-select" value={custodyForm.toxicologyOrderId ?? ''}
                                onChange={e => {
                                  const orderId = e.target.value || null;
                                  const linkedOrder = caseData.autopsy?.toxicologyOrders?.find(o => o.id === orderId);
                                  setCustodyForm({
                                    ...custodyForm, toxicologyOrderId: orderId,
                                    itemDescription: linkedOrder
                                      ? tGrossingNav('synopticReportPage.autopsy.custody.toxItemDescription', { barcode: linkedOrder.specimenBarcode, description: linkedOrder.specimenDescription })
                                      : custodyForm.itemDescription,
                                  });
                                }}>
                                <option value="">{tGrossingNav('synopticReportPage.autopsy.custody.linkToxOrderNone')}</option>
                                {caseData.autopsy.toxicologyOrders?.map(o => (
                                  <option key={o.id} value={o.id}>{o.specimenBarcode} — {o.specimenDescription}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                        <div className="ps-conf-form-row">
                          <div>
                            <label className="ps-label" htmlFor="custody-item">{tGrossingNav('synopticReportPage.autopsy.custody.itemLabel')}</label>
                            <input id="custody-item" className="ps-conf-input" value={custodyForm.itemDescription}
                              onChange={e => setCustodyForm({ ...custodyForm, itemDescription: e.target.value })} />
                          </div>
                          <div>
                            <label className="ps-label" htmlFor="custody-to-type">{tGrossingNav('synopticReportPage.autopsy.custody.toTypeLabel')}</label>
                            <select id="custody-to-type" className="ps-conf-select" value={custodyForm.toCustodianType}
                              onChange={e => setCustodyForm({ ...custodyForm, toCustodianType: e.target.value as AutopsyCustodianType })}>
                              {(['pathology_department', 'medical_examiner', 'law_enforcement', 'funeral_home', 'family', 'other'] as AutopsyCustodianType[]).map(ct => (
                                <option key={ct} value={ct}>{tGrossingNav(`synopticReportPage.autopsy.custody.custodianType.${ct}`)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="ps-conf-form-row">
                          <div>
                            <label className="ps-label" htmlFor="custody-to-name">{tGrossingNav('synopticReportPage.autopsy.custody.toNameLabel')}</label>
                            <input id="custody-to-name" className="ps-conf-input" value={custodyForm.toCustodianName}
                              onChange={e => setCustodyForm({ ...custodyForm, toCustodianName: e.target.value })} />
                          </div>
                          <div>
                            <label className="ps-label" htmlFor="custody-released-by">{tGrossingNav('synopticReportPage.autopsy.custody.releasedByLabel')}</label>
                            <input id="custody-released-by" className="ps-conf-input" value={custodyForm.releasedByName}
                              onChange={e => setCustodyForm({ ...custodyForm, releasedByName: e.target.value })} />
                          </div>
                        </div>
                        <div className="ps-conf-form-row">
                          <div>
                            <label className="ps-label" htmlFor="custody-received-by">{tGrossingNav('synopticReportPage.autopsy.custody.receivedByLabel')}</label>
                            <input id="custody-received-by" className="ps-conf-input" value={custodyForm.receivedByName}
                              onChange={e => setCustodyForm({ ...custodyForm, receivedByName: e.target.value })} />
                          </div>
                          <div>
                            <label className="ps-label" htmlFor="custody-notes">{tGrossingNav('synopticReportPage.autopsy.custody.notesLabel')}</label>
                            <input id="custody-notes" className="ps-conf-input" value={custodyForm.notes}
                              onChange={e => setCustodyForm({ ...custodyForm, notes: e.target.value })} />
                          </div>
                        </div>
                        <div className="ps-conf-modal-footer">
                          <button className="ps-conf-btn-secondary" onClick={() => setShowAutopsyCustodyForm(false)}>{tGrossingNav('synopticReportPage.autopsy.custody.cancelBtn')}</button>
                          <CapabilityButton capability="autopsy:custody:transfer" context={{ caseId: caseData?.id ?? null }} className="ps-conf-btn-primary"
                            disabled={submittingCustodyTransfer || !custodyForm.itemDescription || !custodyForm.toCustodianName || !custodyForm.releasedByName}
                            onClick={handleCustodyTransferSubmit}>
                            {tGrossingNav('synopticReportPage.autopsy.custody.submitBtn')}
                          </CapabilityButton>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Batch 478 (PS-261 follow-up; Pete's own scoping decision) —
                    per-organ gross-exam findings: a read-only log plus the
                    one action that appends to it. Available for either
                    caseAuthority (unlike the forensic-only custody log
                    above) — recording a gross finding against an organ
                    isn't a legal/chain-of-custody action. */}
                {caseData?.autopsy && (
                  <div className="ps-autopsy-organ-tag-log">
                    <div className="ps-conf-form-section-title">{tGrossingNav('synopticReportPage.autopsy.organTag.title')}</div>
                    {(caseData.autopsy.organTags?.length ?? 0) === 0 && (
                      <p className="ps-conf-section-subtitle">{tGrossingNav('synopticReportPage.autopsy.organTag.empty')}</p>
                    )}
                    {caseData.autopsy.organTags?.map(tag => (
                      <div className="ps-autopsy-organ-tag-entry" key={tag.id}>
                        <div className="ps-autopsy-organ-tag-entry__line">
                          {tGrossingNav('synopticReportPage.autopsy.organTag.entryLine', {
                            organ: tGrossingNav(AUTOPSY_ORGAN_LABEL_KEY[tag.organCode]),
                            status: tGrossingNav(`synopticReportPage.autopsy.organTag.status.${tag.status}`),
                          })}
                          {tag.finding && <span className="ps-autopsy-organ-tag-entry__finding"> — {tag.finding}</span>}
                        </div>
                        <div className="ps-autopsy-organ-tag-entry__meta">
                          {tGrossingNav('synopticReportPage.autopsy.organTag.metaLine', { at: formatDateTime(tag.recordedAt, i18nForDates.language), by: tag.recordedByName })}
                        </div>
                      </div>
                    ))}
                    {!showOrganTagForm && (
                      <button className="ps-conf-btn-secondary" onClick={() => setShowOrganTagForm(true)}>
                        {tGrossingNav('synopticReportPage.autopsy.organTag.addBtn')}
                      </button>
                    )}
                    {showOrganTagForm && (
                      <div className="ps-conf-card">
                        <div className="ps-conf-form-row">
                          <div>
                            <label className="ps-label" htmlFor="organ-tag-organ">{tGrossingNav('synopticReportPage.autopsy.organTag.organLabel')}</label>
                            <select id="organ-tag-organ" className="ps-conf-select" value={organTagForm.organCode}
                              onChange={e => setOrganTagForm({ ...organTagForm, organCode: e.target.value as AutopsyOrganCode })}>
                              {ALL_AUTOPSY_ORGAN_CODES.map(organ => (
                                <option key={organ} value={organ}>{tGrossingNav(AUTOPSY_ORGAN_LABEL_KEY[organ])}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="ps-label" htmlFor="organ-tag-status">{tGrossingNav('synopticReportPage.autopsy.organTag.statusLabel')}</label>
                            <select id="organ-tag-status" className="ps-conf-select" value={organTagForm.status}
                              onChange={e => setOrganTagForm({ ...organTagForm, status: e.target.value as AutopsyOrganTagStatus })}>
                              {(['normal', 'abnormal', 'not_examined'] as AutopsyOrganTagStatus[]).map(s => (
                                <option key={s} value={s}>{tGrossingNav(`synopticReportPage.autopsy.organTag.status.${s}`)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="ps-conf-form-row">
                          <div>
                            <label className="ps-label" htmlFor="organ-tag-finding">{tGrossingNav('synopticReportPage.autopsy.organTag.findingLabel')}</label>
                            <input id="organ-tag-finding" className="ps-conf-input" value={organTagForm.finding}
                              onChange={e => setOrganTagForm({ ...organTagForm, finding: e.target.value })} />
                          </div>
                        </div>
                        <div className="ps-conf-modal-footer">
                          <button className="ps-conf-btn-secondary" onClick={() => setShowOrganTagForm(false)}>{tGrossingNav('synopticReportPage.autopsy.organTag.cancelBtn')}</button>
                          <CapabilityButton capability="autopsy:organ-tag:record" context={{ caseId: caseData?.id ?? null }} className="ps-conf-btn-primary"
                            disabled={submittingOrganTag}
                            onClick={handleOrganTagSubmit}>
                            {tGrossingNav('synopticReportPage.autopsy.organTag.submitBtn')}
                          </CapabilityButton>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Batch 469 (PS-261 §2.5.1 follow-up) — narrowing or
                    revoking an already-granted next-of-kin consent.
                    Hospital-consented-only, same as the capability and
                    service behind it (recordAutopsyConsentStatusChange.ts).
                    That function itself still only ever narrows — the
                    Reinstate button below (Batch 471) is a genuinely
                    separate action, its own capability
                    (autopsy:consent:reinstate), so this form's own
                    guarantee is unaffected by reinstatement existing
                    at all. */}
                {caseData?.autopsy?.caseAuthority === 'hospital_consented' && caseData.autopsy.hospitalConsent && (
                  <div className="ps-autopsy-custody-log">
                    <div className="ps-conf-form-section-title">{tGrossingNav('synopticReportPage.autopsy.consent.title')}</div>
                    <div className="ps-autopsy-custody-entry">
                      <div className="ps-autopsy-custody-entry__transfer">
                        {tGrossingNav(`synopticReportPage.autopsy.consent.status.${caseData.autopsy.hospitalConsent.status}`)}
                      </div>
                      {caseData.autopsy.hospitalConsent.statusChangedAt && (
                        <div className="ps-autopsy-custody-entry__meta">
                          {tGrossingNav('synopticReportPage.autopsy.consent.changedAtLine', { at: formatDateTime(caseData.autopsy.hospitalConsent.statusChangedAt, i18nForDates.language) })}
                          {caseData.autopsy.hospitalConsent.revocationNote ? tGrossingNav('synopticReportPage.autopsy.consent.noteSuffix', { note: caseData.autopsy.hospitalConsent.revocationNote }) : ''}
                        </div>
                      )}
                    </div>
                    {caseData.autopsy.hospitalConsent.status !== 'revoked' && !showAutopsyConsentForm && (
                      <button className="ps-conf-btn-secondary" onClick={() => {
                        // Real, per independent review: seed the draft from the
                        // CURRENT record, not a fixed default — otherwise
                        // submitting without manually re-picking every
                        // already-excluded organ or re-selecting "No" for
                        // retention would look like a widening request.
                        // applyAutopsyConsentStatusChange.ts itself now also
                        // refuses to actually widen, but the form should never
                        // invite that in the first place.
                        const current = caseData.autopsy!.hospitalConsent!;
                        setConsentForm({
                          status: current.status === 'active' ? 'narrowed' : current.status,
                          excludedOrgans: current.excludedOrgans,
                          retentionPermitted: current.retentionPermitted,
                          revocationNote: current.revocationNote ?? '',
                        });
                        setShowAutopsyConsentForm(true);
                      }}>
                        {tGrossingNav('synopticReportPage.autopsy.consent.changeBtn')}
                      </button>
                    )}
                    {/* Batch 471 (PS-261 follow-up) — reinstating an
                        already-narrowed or revoked consent. Shown
                        whenever there's actually something to
                        reinstate (status isn't 'active'); its own
                        form, its own capability, never sharing state
                        with the narrowing form above. */}
                    {caseData.autopsy.hospitalConsent.status !== 'active' && !showAutopsyConsentReinstateForm && (
                      <button className="ps-conf-btn-secondary" onClick={() => {
                        const current = caseData.autopsy!.hospitalConsent!;
                        setReinstateForm({
                          status: 'active',
                          excludedOrgans: current.excludedOrgans,
                          retentionPermitted: current.retentionPermitted,
                          reinstatementNote: '',
                        });
                        setShowAutopsyConsentReinstateForm(true);
                      }}>
                        {tGrossingNav('synopticReportPage.autopsy.consent.reinstateBtn')}
                      </button>
                    )}
                    {showAutopsyConsentReinstateForm && (
                      <div className="ps-conf-card">
                        <div className="ps-conf-form-row">
                          <div>
                            <label className="ps-label" htmlFor="reinstate-status">{tGrossingNav('synopticReportPage.autopsy.consent.reinstateStatusLabel')}</label>
                            <select id="reinstate-status" className="ps-conf-select" value={reinstateForm.status}
                              onChange={e => setReinstateForm({ ...reinstateForm, status: e.target.value as HospitalConsentStatus })}>
                              <option value="active">{tGrossingNav('synopticReportPage.autopsy.consent.status.active')}</option>
                              <option value="narrowed">{tGrossingNav('synopticReportPage.autopsy.consent.status.narrowed')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="ps-label" htmlFor="reinstate-retention">{tGrossingNav('synopticReportPage.autopsy.consent.retentionLabel')}</label>
                            <select id="reinstate-retention" className="ps-conf-select" value={reinstateForm.retentionPermitted ? 'yes' : 'no'}
                              onChange={e => setReinstateForm({ ...reinstateForm, retentionPermitted: e.target.value === 'yes' })}>
                              <option value="yes">{tGrossingNav('synopticReportPage.autopsy.consent.retentionYes')}</option>
                              <option value="no">{tGrossingNav('synopticReportPage.autopsy.consent.retentionNo')}</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="ps-label">{tGrossingNav('synopticReportPage.autopsy.consent.excludedOrgansLabel')}</label>
                          <div className="ps-autopsy-organ-chip-row">
                            {ALL_AUTOPSY_ORGAN_CODES.map(organ => {
                              const checked = reinstateForm.excludedOrgans.includes(organ);
                              return (
                                <label key={organ} className={`ps-autopsy-organ-chip${checked ? ' ps-autopsy-organ-chip--checked' : ''}`}>
                                  <input type="checkbox" checked={checked} onChange={() => {
                                    const next = checked
                                      ? reinstateForm.excludedOrgans.filter(o => o !== organ)
                                      : [...reinstateForm.excludedOrgans, organ];
                                    setReinstateForm({ ...reinstateForm, excludedOrgans: next });
                                  }} />
                                  {tGrossingNav(AUTOPSY_ORGAN_LABEL_KEY[organ])}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div className="ps-conf-form-row">
                          <div>
                            <label className="ps-label" htmlFor="reinstate-note">{tGrossingNav('synopticReportPage.autopsy.consent.reinstateNoteLabel')}</label>
                            <input id="reinstate-note" className="ps-conf-input" value={reinstateForm.reinstatementNote}
                              onChange={e => setReinstateForm({ ...reinstateForm, reinstatementNote: e.target.value })} />
                          </div>
                        </div>
                        <div className="ps-conf-modal-footer">
                          <button className="ps-conf-btn-secondary" onClick={() => setShowAutopsyConsentReinstateForm(false)}>{tGrossingNav('synopticReportPage.autopsy.consent.cancelBtn')}</button>
                          <CapabilityButton capability="autopsy:consent:reinstate" context={{ caseId: caseData?.id ?? null }} className="ps-conf-btn-primary"
                            disabled={submittingReinstate || !reinstateForm.reinstatementNote.trim()}
                            onClick={handleConsentReinstateSubmit}>
                            {tGrossingNav('synopticReportPage.autopsy.consent.submitReinstateBtn')}
                          </CapabilityButton>
                        </div>
                      </div>
                    )}
                    {showAutopsyConsentForm && (
                      <div className="ps-conf-card">
                        <div className="ps-conf-form-row">
                          <div>
                            <label className="ps-label" htmlFor="consent-status">{tGrossingNav('synopticReportPage.autopsy.consent.statusLabel')}</label>
                            <select id="consent-status" className="ps-conf-select" value={consentForm.status}
                              onChange={e => setConsentForm({ ...consentForm, status: e.target.value as HospitalConsentStatus })}>
                              <option value="narrowed">{tGrossingNav('synopticReportPage.autopsy.consent.status.narrowed')}</option>
                              <option value="revoked">{tGrossingNav('synopticReportPage.autopsy.consent.status.revoked')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="ps-label" htmlFor="consent-retention">{tGrossingNav('synopticReportPage.autopsy.consent.retentionLabel')}</label>
                            <select id="consent-retention" className="ps-conf-select" value={consentForm.retentionPermitted ? 'yes' : 'no'}
                              onChange={e => setConsentForm({ ...consentForm, retentionPermitted: e.target.value === 'yes' })}>
                              <option value="yes">{tGrossingNav('synopticReportPage.autopsy.consent.retentionYes')}</option>
                              <option value="no">{tGrossingNav('synopticReportPage.autopsy.consent.retentionNo')}</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="ps-label">{tGrossingNav('synopticReportPage.autopsy.consent.excludedOrgansLabel')}</label>
                          <div className="ps-autopsy-organ-chip-row">
                            {ALL_AUTOPSY_ORGAN_CODES.map(organ => {
                              const checked = consentForm.excludedOrgans.includes(organ);
                              return (
                                <label key={organ} className={`ps-autopsy-organ-chip${checked ? ' ps-autopsy-organ-chip--checked' : ''}`}>
                                  <input type="checkbox" checked={checked} onChange={() => {
                                    const next = checked
                                      ? consentForm.excludedOrgans.filter(o => o !== organ)
                                      : [...consentForm.excludedOrgans, organ];
                                    setConsentForm({ ...consentForm, excludedOrgans: next });
                                  }} />
                                  {tGrossingNav(AUTOPSY_ORGAN_LABEL_KEY[organ])}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div className="ps-conf-form-row">
                          <div>
                            <label className="ps-label" htmlFor="consent-note">{tGrossingNav('synopticReportPage.autopsy.consent.noteLabel')}</label>
                            <input id="consent-note" className="ps-conf-input" value={consentForm.revocationNote}
                              onChange={e => setConsentForm({ ...consentForm, revocationNote: e.target.value })} />
                          </div>
                        </div>
                        <div className="ps-conf-modal-footer">
                          <button className="ps-conf-btn-secondary" onClick={() => setShowAutopsyConsentForm(false)}>{tGrossingNav('synopticReportPage.autopsy.consent.cancelBtn')}</button>
                          <CapabilityButton capability="autopsy:consent:manage" context={{ caseId: caseData?.id ?? null }} className="ps-conf-btn-primary"
                            disabled={submittingConsentChange} onClick={handleConsentStatusChangeSubmit}>
                            {tGrossingNav('synopticReportPage.autopsy.consent.submitBtn')}
                          </CapabilityButton>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Batch 469 (PS-261 §2.3) — postmortem toxicology: a
                    read-only order list, an order form, and a
                    "record result" action per still-ordered row. Not
                    forensic-only — either caseAuthority may order
                    toxicology. */}
                {caseData?.autopsy && (
                  <div className="ps-autopsy-custody-log">
                    <div className="ps-conf-form-section-title">{tGrossingNav('synopticReportPage.autopsy.toxicology.title')}</div>
                    {(caseData.autopsy.toxicologyOrders?.length ?? 0) === 0 && (
                      <p className="ps-conf-section-subtitle">{tGrossingNav('synopticReportPage.autopsy.toxicology.empty')}</p>
                    )}
                    {caseData.autopsy.toxicologyOrders?.map(order => (
                      <div className="ps-autopsy-custody-entry" key={order.id}>
                        <div className="ps-autopsy-custody-entry__item">
                          {order.analytesRequested} — {order.specimenDescription}
                          <span className="ps-autopsy-custody-entry__tox-link">{order.specimenBarcode}</span>
                        </div>
                        <div className="ps-autopsy-custody-entry__transfer">
                          {tGrossingNav('synopticReportPage.autopsy.toxicology.orderLine', { lab: order.labName, status: tGrossingNav(`synopticReportPage.autopsy.toxicology.status.${order.status}`) })}
                        </div>
                        <div className="ps-autopsy-custody-entry__meta">
                          {tGrossingNav('synopticReportPage.autopsy.toxicology.orderedMetaLine', { at: formatDateTime(order.orderedAt, i18nForDates.language), by: order.orderedByName })}
                        </div>
                        {order.status === 'resulted' && order.resultSummary && (
                          <div className="ps-autopsy-custody-entry__meta">{order.resultSummary}</div>
                        )}
                        {/* Batch 475 (PS-261 follow-up) — this specimen's own
                            chain of custody, when it has one. Forensic-only,
                            same as custodyLog itself (recordAutopsyCustodyTransfer.ts). */}
                        {caseData.autopsy?.caseAuthority === 'statutory_judicial' && (() => {
                          const toxCustody = custodyEventsForToxicologyOrder(caseData.autopsy?.custodyLog, order.id);
                          return toxCustody.length > 0 ? (
                            <div className="ps-autopsy-tox-custody">
                              <div className="ps-autopsy-tox-custody__title">{tGrossingNav('synopticReportPage.autopsy.toxicology.custodyTitle')}</div>
                              {toxCustody.map(entry => (
                                <div className="ps-autopsy-custody-entry__meta" key={entry.id}>
                                  {tGrossingNav('synopticReportPage.autopsy.custody.transferLine', {
                                    from: tGrossingNav(`synopticReportPage.autopsy.custody.custodianType.${entry.fromCustodianType}`),
                                    fromName: entry.fromCustodianName,
                                    to: tGrossingNav(`synopticReportPage.autopsy.custody.custodianType.${entry.toCustodianType}`),
                                    toName: entry.toCustodianName,
                                  })} — {formatDateTime(entry.occurredAt, i18nForDates.language)}
                                </div>
                              ))}
                            </div>
                          ) : null;
                        })()}
                        {/* Batch 471 (PS-261 follow-up) — a cancelled
                            order shows its reason and timestamp,
                            same meta-line treatment as a resulted
                            one above. */}
                        {order.status === 'cancelled' && order.cancelReason && (
                          <div className="ps-autopsy-custody-entry__meta">
                            {tGrossingNav('synopticReportPage.autopsy.toxicology.cancelledMetaLine', { at: order.cancelledAt ? formatDateTime(order.cancelledAt, i18nForDates.language) : '', reason: order.cancelReason })}
                          </div>
                        )}
                        {order.status === 'ordered' && toxResultOrderId !== order.id && toxCancelOrderId !== order.id && (
                          <div className="ps-autopsy-custody-entry__actions">
                            <button className="ps-conf-btn-secondary" onClick={() => { setToxResultOrderId(order.id); setToxResultSummary(''); }}>
                              {tGrossingNav('synopticReportPage.autopsy.toxicology.recordResultBtn')}
                            </button>
                            <button className="ps-conf-btn-secondary" onClick={() => { setToxCancelOrderId(order.id); setToxCancelReason(''); }}>
                              {tGrossingNav('synopticReportPage.autopsy.toxicology.cancelOrderBtn')}
                            </button>
                          </div>
                        )}
                        {order.status === 'ordered' && toxResultOrderId === order.id && (
                          <div className="ps-conf-card">
                            <div className="ps-conf-form-row">
                              <div>
                                <label className="ps-label" htmlFor={`tox-result-${order.id}`}>{tGrossingNav('synopticReportPage.autopsy.toxicology.resultLabel')}</label>
                                <input id={`tox-result-${order.id}`} className="ps-conf-input" value={toxResultSummary}
                                  onChange={e => setToxResultSummary(e.target.value)} />
                              </div>
                            </div>
                            <div className="ps-conf-modal-footer">
                              <button className="ps-conf-btn-secondary" onClick={() => setToxResultOrderId(null)}>{tGrossingNav('synopticReportPage.autopsy.toxicology.cancelBtn')}</button>
                              <CapabilityButton capability="autopsy:toxicology:result" context={{ caseId: caseData?.id ?? null }} className="ps-conf-btn-primary"
                                disabled={submittingToxResult || !toxResultSummary} onClick={handleToxicologyResultSubmit}>
                                {tGrossingNav('synopticReportPage.autopsy.toxicology.submitResultBtn')}
                              </CapabilityButton>
                            </div>
                          </div>
                        )}
                        {/* Batch 471 (PS-261 follow-up) — cancel-order
                            mini-form, same per-row toggle pattern as
                            the result form above, kept in its own
                            state so recording a result and cancelling
                            never collide on the same row. */}
                        {order.status === 'ordered' && toxCancelOrderId === order.id && (
                          <div className="ps-conf-card">
                            <div className="ps-conf-form-row">
                              <div>
                                <label className="ps-label" htmlFor={`tox-cancel-${order.id}`}>{tGrossingNav('synopticReportPage.autopsy.toxicology.cancelReasonLabel')}</label>
                                <input id={`tox-cancel-${order.id}`} className="ps-conf-input" value={toxCancelReason}
                                  onChange={e => setToxCancelReason(e.target.value)} />
                              </div>
                            </div>
                            <div className="ps-conf-modal-footer">
                              <button className="ps-conf-btn-secondary" onClick={() => setToxCancelOrderId(null)}>{tGrossingNav('synopticReportPage.autopsy.toxicology.cancelBtn')}</button>
                              <CapabilityButton capability="autopsy:toxicology:cancel" context={{ caseId: caseData?.id ?? null }} className="ps-conf-btn-primary"
                                disabled={submittingToxCancel || !toxCancelReason.trim()} onClick={handleToxicologyCancelSubmit}>
                                {tGrossingNav('synopticReportPage.autopsy.toxicology.submitCancelBtn')}
                              </CapabilityButton>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {!showAutopsyToxOrderForm && (
                      <button className="ps-conf-btn-secondary" onClick={() => setShowAutopsyToxOrderForm(true)}>
                        {tGrossingNav('synopticReportPage.autopsy.toxicology.orderBtn')}
                      </button>
                    )}
                    {showAutopsyToxOrderForm && (
                      <div className="ps-conf-card">
                        <div className="ps-conf-form-row">
                          <div>
                            <label className="ps-label" htmlFor="tox-specimen">{tGrossingNav('synopticReportPage.autopsy.toxicology.specimenLabel')}</label>
                            <input id="tox-specimen" className="ps-conf-input" value={toxOrderForm.specimenDescription}
                              onChange={e => setToxOrderForm({ ...toxOrderForm, specimenDescription: e.target.value })} />
                          </div>
                          {/* Batch 475 (PS-261 follow-up) — a real, scannable
                              identifier for the specimen itself, distinct from
                              the free-text description above. */}
                          <div>
                            <label className="ps-label" htmlFor="tox-barcode">{tGrossingNav('synopticReportPage.autopsy.toxicology.specimenBarcodeLabel')}</label>
                            <input id="tox-barcode" className="ps-conf-input" value={toxOrderForm.specimenBarcode}
                              onChange={e => setToxOrderForm({ ...toxOrderForm, specimenBarcode: e.target.value })} />
                          </div>
                        </div>
                        <div className="ps-conf-form-row">
                          <div>
                            <label className="ps-label" htmlFor="tox-analytes">{tGrossingNav('synopticReportPage.autopsy.toxicology.analytesLabel')}</label>
                            <input id="tox-analytes" className="ps-conf-input" value={toxOrderForm.analytesRequested}
                              onChange={e => setToxOrderForm({ ...toxOrderForm, analytesRequested: e.target.value })} />
                          </div>
                          <div>
                            <label className="ps-label" htmlFor="tox-lab">{tGrossingNav('synopticReportPage.autopsy.toxicology.labLabel')}</label>
                            <input id="tox-lab" className="ps-conf-input" value={toxOrderForm.labName}
                              onChange={e => setToxOrderForm({ ...toxOrderForm, labName: e.target.value })} />
                          </div>
                        </div>
                        <div className="ps-conf-modal-footer">
                          <button className="ps-conf-btn-secondary" onClick={() => setShowAutopsyToxOrderForm(false)}>{tGrossingNav('synopticReportPage.autopsy.toxicology.cancelBtn')}</button>
                          <CapabilityButton capability="autopsy:toxicology:order" context={{ caseId: caseData?.id ?? null }} className="ps-conf-btn-primary"
                            disabled={submittingToxOrder || !toxOrderForm.specimenDescription || !toxOrderForm.specimenBarcode || !toxOrderForm.analytesRequested || !toxOrderForm.labName}
                            onClick={handleToxicologyOrderSubmit}>
                            {tGrossingNav('synopticReportPage.autopsy.toxicology.submitOrderBtn')}
                          </CapabilityButton>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {caseData?.autopsy && (() => {
                  const gate = resolveAutopsyGrossExaminationGate(caseData.autopsy);
                  if (gate.allowed) return null;
                  // Batch 478: the one real way past this now (besides
                  // actually completing authorization) — an audited
                  // override, offered only to whoever holds
                  // autopsy:gross-exam-gate:override. Overrides whichever
                  // tier is next: PAD, or FAD if PAD is already signed.
                  const overrideTier: 'PAD' | 'FAD' = caseData.autopsy.padSnapshot ? 'FAD' : 'PAD';
                  return (
                    <div className="ps-lis-triage-banner">
                      <div>
                        <div className="ps-lis-triage-title">⚠ {tGrossingNav('synopticReportPage.autopsy.authorizationPending')}</div>
                        <p className="ps-lis-triage-summary">
                          {formatList(gate.blockedReasons.map(r => tGrossingNav(`autopsySignOut.blockedReasons.${r}`)), i18nForDates.language)}
                        </p>
                      </div>
                      <div className="ps-lis-triage-actions">
                        <button className="ps-conf-btn-primary" onClick={() => setShowAutopsyAuthCompletion(true)}>
                          {tGrossingNav('synopticReportPage.autopsy.completeAuthorization')}
                        </button>
                        {capabilities.has('autopsy:gross-exam-gate:override', { caseId: caseData.id }) && (
                          <button className="ps-conf-btn-secondary" onClick={() => setShowGateOverridePrompt(overrideTier)}>
                            {tGrossingNav('synopticReportPage.autopsy.gateOverride.overrideBtn', { tier: overrideTier })}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Real, per direct follow-up ("let's get that signing") —
                    the real Sign PAD / Sign FAD triggers. PAD becomes
                    available once authorization is complete (the gate
                    above allows); FAD only once a real, signed PAD
                    already exists — same real ordering
                    signAutopsyReport.ts itself enforces server-side,
                    never trusted from this UI check alone. */}
                {caseData?.autopsy && resolveAutopsyGrossExaminationGate(caseData.autopsy).allowed && !caseData.autopsy.padSnapshot && (
                  <div className="ps-lis-triage-banner">
                    <div>
                      <div className="ps-lis-triage-title">{tGrossingNav('autopsySignOut.padReadyTitle')}</div>
                      <p className="ps-lis-triage-summary">{tGrossingNav('autopsySignOut.padReadySummary')}</p>
                    </div>
                    <button className="ps-conf-btn-primary" disabled={signingAutopsyTier === 'PAD'} onClick={() => setConfirmingAutopsyTier('PAD')}>
                      {signingAutopsyTier === 'PAD' ? tGrossingNav('autopsySignOut.signing') : tGrossingNav('autopsySignOut.signPad')}
                    </button>
                  </div>
                )}

                {/* Batch 608 (#32, #84): the attending can return a released autopsy report to the trainee
                    with feedback; the trainee sees that feedback here once it is returned. */}
                {caseData?.autopsy && (
                  <ReturnToTraineeBar caseId={caseData.id} user={signingUser?.id ? { id: signingUser.id, name: signingUser.name ?? signingUser.id } : null}
                    onReturned={async () => {
                      const refreshed = await caseRouter.getCase(caseData.id);
                      if (refreshed) { setCaseData(refreshed); knownVersionRef.current = refreshed.version ?? knownVersionRef.current; }
                    }} />
                )}

                {caseData?.autopsy?.padSnapshot && !caseData.autopsy.fadSnapshot && (
                  <div className="ps-lis-triage-banner">
                    <div>
                      <div className="ps-lis-triage-title">{tGrossingNav('autopsySignOut.fadReadyTitle')}</div>
                      <p className="ps-lis-triage-summary">{tGrossingNav('autopsySignOut.fadReadySummary', { date: formatDate(caseData.autopsy.padSnapshot.signedAt, i18nForDates.language), name: caseData.autopsy.padSnapshot.signedBy.name })}</p>
                    </div>
                    <button className="ps-conf-btn-primary" disabled={signingAutopsyTier === 'FAD'} onClick={() => { void beginAutopsySign('FAD'); }}>
                      {signingAutopsyTier === 'FAD' ? tGrossingNav('autopsySignOut.signing') : tGrossingNav('autopsySignOut.signFad')}
                    </button>
                  </div>
                )}

                {/* Real, per direct follow-up: "AutopsyBodyReleaseForm.tsx's
                    mounting," then further centralized per a real,
                    later follow-up ("a quick helper like
                    getMainBodySpecimen... could provide a central
                    place to update that logic system-wide") \u2014
                    getMainBodySpecimen.ts (services/autopsy/) is now
                    that one, real place; see its own header comment
                    for the current index-0 heuristic and where an
                    explicit designation check would slot in first,
                    if Specimen ever gains one. */}
                {caseData?.autopsy && getMainBodySpecimen(caseData.specimens) && (() => {
                  const bodySpecimen = getMainBodySpecimen(caseData.specimens)!;
                  if (resolveAutopsyBodyAlreadyReleased(bodySpecimen.locationHistory)) return null;
                  const gate = resolveAutopsyBodyReleaseGate(caseData.autopsy);
                  if (!gate.allowed) return null;
                  return (
                    <div className="ps-lis-triage-banner">
                      <div>
                        <div className="ps-lis-triage-title">{tGrossingNav('autopsyBodyRelease.bannerTitle')}</div>
                        <p className="ps-lis-triage-summary">{tGrossingNav('autopsyBodyRelease.bannerSummary')}</p>
                      </div>
                      <button className="ps-conf-btn-primary" onClick={() => setShowAutopsyBodyRelease(true)}>
                        {tGrossingNav('autopsyBodyRelease.title')}
                      </button>
                    </div>
                  );
                })()}

                <ReleaseBufferBanner
                  caseData={caseData}
                  currentUserId={signingUser?.id}
                  currentUserName={signingUser?.name}
                  setCaseData={setCaseData}
                  showToast={showToast}
                />
                {/* Batch 534 (Pete): preliminaries, corrections, addenda and autopsy reports held for the release delay. */}
                <HeldReportsBanner caseId={caseData?.id}
                  user={signingUser?.id ? { id: signingUser.id, name: signingUser.name ?? signingUser.id } : null}
                  onRecalled={async () => { if (caseData?.id) { const fresh = await caseRouter.getCase(caseData.id); if (fresh) setCaseData(fresh); } }} />
                <RevisionFeedbackBanner caseId={caseData?.id} isReturned={(caseData as any)?.status === 'returned'} />
                {/* Batch 530 (Pete): the clinical history, addable until sign-out; with none, the mismatch check is deferred. */}
                {caseData && (
                  <CaseClinicalHistoryBar caseData={caseData}
                    onSaved={(clinicalHistory, version) => { knownVersionRef.current = adoptSavedVersion(knownVersionRef.current, version); setCaseData(prev => (prev ? { ...prev, order: { ...prev.order, clinicalHistory }, version } : prev)); }} />
                )}
                {caseData && mismatchAlert.assessment && (
                  <ClinicalMismatchAlert
                    assessment={mismatchAlert.assessment}
                    caseId={caseData.id}
                    caseType={caseData.specimens?.[0]?.description || caseData.id}
                    subspecialtyId={caseData.subspecialtyId}
                    clinicalIndication={caseData.order?.clinicalIndication}
                    discipline={caseData.autopsy ? 'autopsy' : 'surgical'}
                    onRecorded={mismatchAlert.recorded}
                  />
                )}
                {caseData && signingUser && (
                  <PeerReviewBanner
                    caseId={caseData.id}
                    accession={caseData.accession?.fullAccession}
                    caseStatus={caseData.status}
                    currentUser={{ id: signingUser.id, name: signingUser.name }}
                    status={peerReview.status}
                    reviewers={peerReview.reviewers}
                    onChanged={() => { void peerReview.reload(); }}
                  />
                )}
                {(caseData as any)?.status === 'pending-countersign' && (() => {
                  const residentP = (caseData as any)?.participants?.find((p: any) => p.status === 'active' && p.participationTypeIds?.includes('resident'));
                  const attendingP = (caseData as any)?.participants?.find((p: any) => p.status === 'active' && p.participationTypeIds?.includes('attending'));
                  const viewerIsResident = residentP?.staffId === signingUser?.id;
                  return (
                    <div className="ps-defic-review-banner ps-defic-review-banner--blue">
                      <span>
                        🎓 {viewerIsResident
                          ? (attendingP?.staffName ? tGrossingNav('synopticReportPage.countersign.awaitingNamed', { name: attendingP.staffName }) : tGrossingNav('synopticReportPage.countersign.awaiting'))
                          : (residentP?.staffName ? tGrossingNav('synopticReportPage.countersign.releasedByNamed', { name: residentP.staffName }) : tGrossingNav('synopticReportPage.countersign.releasedBy'))}
                      </span>
                    </div>
                  );
                })()}
                <LeftReportPanel caseData={caseData} highlightText={highlightText ?? undefined} rawHighlightText={rawHighlightText} onMatchResolved={found => setHighlightNotFound(!found)} criticalFindings={criticalFindings} />
              </div>
              <div className={`ps-syn-tab-panel${leftTab === 'material' ? ' ps-syn-tab-panel--visible-block' : ''}`}>
                <button
                  type="button"
                  className="ps-btn-secondary ps-grossing-screen-nav-btn"
                  onClick={() => { if (caseData) void openCasePage(caseData.id, 'grossing'); }}
                >
                  {tGrossingNav('grossingScreen.openGrossingScreen')}
                </button>
                <MaterialTreePanel
                  caseData={caseData}
                  activeSpecimenId={activeSpecimenId}
                  highlightedStainId={highlightedStainId}
                  onOpenBlockEditor={(blockOrDecantId) => {
                    // Real bug fix, per direct follow-up: "decant-level
                    // linking UI." MaterialTreePanel.tsx's own decant
                    // slide row already called this same callback with
                    // a real decant's own id — previously, allBlocks
                    // never matched it, silently failing to focus
                    // anything while still opening the modal, which
                    // then showed every ordinary block with nothing
                    // decant-related in it at all. Checks blocks first
                    // (the common case), falls through to decants.
                    // PS-316 (Batch 451): decided in services/billing/billingMaterialSync.ts.
                    const target = resolveMaterialAssetClick(blockOrDecantId, allBlocks.map(b => b.block.id), allDecants.map(d => d.decant.id));
                    if (target.kind === 'block') {
                      setFocusedBlockIndex(target.blockIndex);
                      setFocusedDecantId(null);
                      setMaterialSelectedBlockId(target.blockId);
                    } else if (target.kind === 'decant') {
                      setFocusedDecantId(target.decantId);
                      // Batch 452: a decant has a billing row too now.
                      setMaterialSelectedBlockId(target.decantId);
                    }
                    if (target.kind !== 'none') setMaterialSelectionSeq(n => n + 1);
                    setShowBlockEditor(true);
                  }}
                  onOpenMatrixBlockEditor={(matrixBlockId) => setViewingMatrixBlockId(matrixBlockId)}
                  onAddSpecimen={() => { setEditingSpecimen(null); setShowSpecimenEdit(true); }}
                  onAddBlock={handleAddBlock}
                  onUpdateBlock={handleUpdateBlock}
                  onReleaseGrossingBlocks={handleReleaseGrossingBlocks}
                  onConfirmTriageChecklistItem={handleConfirmTriageChecklistItem}
                  onOverrideTriage={handleOverrideTriage}
                  onRemovePendingBlock={handleRemovePendingBlock}
                  onAddDecant={handleAddDecant}
                  onDeleteDecant={handleDeleteDecant}
                  onAssignBaseCode={(_specimenId, specimenIndex) => {
                    // Real fix, per direct guidance: "remove [Code
                    // Manager's billing code tab] altogether, and let
                    // the billing review handle the coding." In
                    // Orchestration mode, BillingReviewPanel already
                    // has its own real "+ Add a code manually" flow
                    // for a specimen's base code - opening Code
                    // Manager's own, now-removed CPT tab here would be
                    // a dead end. Redirects to the Material tab, where
                    // BillingReviewPanel actually renders, instead.
                    if (isOrchestrationMode) {
                      safeSetLeftTab('material');
                      setActiveReportType('billing');
                      return;
                    }
                    setCodesModalTargetSpecimenIndex(specimenIndex);
                    setShowCodesModal(true);
                    log('codes_modal_opened', { caseId: caseId ?? '' });
                  }}
                  onCreateBiopsyArray={() => setShowCreateBiopsyArrayModal(true)}
                  onEditBiopsyArray={(matrixBlockId) => setEditingMatrixBlockId(matrixBlockId)}
                  onBatchPrintCassettes={handleBatchPrintCassettes}
                  onReprintAllSlides={handleBatchPrintSlides}
                  pendingCassetteVerification={pendingCassetteVerification}
                  isOrchestrationMode={isOrchestrationMode}
                />
              </div>

              {/* Computational */}
            </div>
          </div>


          {/* Right panel — hidden in orchestration draft mode (Sequencer provides synoptic access) */}
          <div className={`ps-syn-right-panel${isOrchestrationMode && leftTab === 'draft' ? ' ps-syn-right-panel--collapsed' : ''}`}>
            <div className="ps-syn-right-panel-scroll">
              {aiReportToolsVisibility(caseData?.reportingMode).suggestSynoptic && (
                <div className="ps-syn-right-panel-toolrow">
                  {/* PS-274 / PS-275: Suggest Synoptic from Narrative (orchestrator
                      and assist mode) and Generate Narrative from Synoptic
                      (orchestrator mode only) — see AiReportToolButtons.tsx and
                      services/aiIntegration/aiReportTools.ts. */}
                  <AiReportToolButtons
                    reportingMode={caseData?.reportingMode}
                    availability={resolveBuildReportAvailability(aiReportToolsInputs(caseData, activeReportInstanceId))}
                    isSuggestingSynoptic={isSuggestingSynoptic}
                    isGeneratingNarrative={isGeneratingNarrative}
                    onSuggestSynopticFromNarrative={handleSuggestSynopticFromNarrative}
                    onGenerateNarrativeFromSynoptic={handleGenerateNarrativeFromSynoptic}
                  />
                  {isOrchestrationMode && (
                    <button
                      className={`${activeReportType === 'billing' ? 'ps-btn-primary' : 'ps-btn-ghost-dark'} ps-syn-toolbtn-sm`}
                      onClick={() => setActiveReportType(activeReportType === 'billing' ? 'synoptic' : 'billing')}
                    >
                      {activeReportType === 'billing' ? `← ${tGrossingNav('synopticReportPage.billing.backToSynoptic')}` : `$ ${tGrossingNav('synopticReportPage.billing.review')}`}
                    </button>
                  )}
                </div>
              )}
              {activeReportType === 'synoptic' && organMap.context?.binding && (
                <div className="ps-syn-right-panel-maprow">
                  <button
                    type="button"
                    className="ps-btn-ghost-dark ps-syn-toolbtn-sm ps-organmap-toggle"
                    aria-expanded={mapOpen}
                    title={tGrossingNav('organMap.panel.toggleTitle')}
                    onClick={toggleMap}
                  >{tGrossingNav('organMap.panel.toggle')}</button>
                </div>
              )}
              {activeReportType === 'synoptic' && mapOpen && organMap.context?.binding && (
                // Batch 502 (PS-472): a map crash doesn't take down the report.
                <ErrorBoundary scope="panel" name="panel:organ-map">
                <OrganMapPanel
                  context={organMap.context}
                  loading={organMap.loading}
                  payload={organMap.payload}
                  figureState={organMap.figureState}
                  busy={organMap.busy}
                  caseId={caseData?.id}
                  facilityId={caseData?.order?.facilityId ?? null}
                  marginInk={collectMarginInk(caseData?.specimens)}
                  onSectorClick={handleOrganMapSectorClick}
                  onInsert={() => { void organMap.insert(); }}
                  onRemove={() => { void organMap.remove(); }}
                />
                </ErrorBoundary>
              )}
              {activeReportType === 'billing' && isOrchestrationMode ? (
                <BillingReviewPanel
                  specimens={(caseData?.specimens as any) ?? []}
                  matrixBlocks={(caseData?.matrixBlocks as any) ?? []}
                  onSetMatrixEvaluatedCores={handleSetMatrixEvaluatedCores}
                  onApplyMatrixCode={handleApplyMatrixBillingCode}
                  onRejectMatrixCode={handleRejectMatrixBillingCode}
                  onApprove={handleApproveBillingCode}
                  onOverride={handleOverrideBillingCode}
                  onRejectOnly={handleRejectBillingCode}
                  onDelete={handleDeleteBillingCode}
                  onDeleteBaseCode={handleDeleteSpecimenBaseCode}
                  onCorrect={handleCorrectBillingCode}
                  onCorrectBaseCode={handleCorrectSpecimenBaseCode}
                  onAddBaseCode={handleAddSpecimenBaseCode}
                  onApproveAll={handleApproveAllBillingCodes}
                  onHighlight={setRawHighlightText}
                  onHighlightStain={setHighlightedStainId}
                  materialSelectedBlockId={materialSelectedBlockId}
                  materialSelectionSeq={materialSelectionSeq}
                  caseId={caseData?.id}
                  onFocusBlock={(specimenId) => { setLeftTab('material'); setActiveSpecimenId(specimenId); }}
                  contextLabel="sign-out"
                />
              ) : activeReportType === 'microscopic' && activeSpecimenId ? (
                <MicroscopicEntryPanel
                  specimenId={activeSpecimenId}
                  specimenLabel={caseData?.specimens?.find(sp => sp.id === activeSpecimenId)?.label ?? ''}
                  specimenDesc={caseData?.specimens?.find(sp => sp.id === activeSpecimenId)?.description}
                  instance={microscopicEntry.getInstance(activeSpecimenId)}
                  onSaveDraft={microscopicEntry.saveDraft}
                  onConfirmAndSave={microscopicEntry.confirmAndSave}
                  onClearAndSave={microscopicEntry.clearAndSave}
                  highlightFindings={microscopicFindings}
                />
              ) : (
              <ErrorBoundary scope="panel" name="panel:synoptic">
              <RightSynopticPanel
                ref={synopticPanelRef}
                reloadKey={takenUpKey}
                caseData={caseData}
                activeTab={activeTab}
                activeReportInstanceId={activeReportInstanceId}
                activeReportType={activeReportType === 'microscopic' || activeReportType === 'billing' ? 'synoptic' : activeReportType}
                activeSpecimenId={activeSpecimenId}
                onReportInstanceChange={setActiveReportInstanceId}
                onReportTypeChange={setActiveReportType}
                onCaseUpdate={(updated) => { setCaseData(updated); markDirty('synopticFields'); }}
                isDirty={hasUnsavedData}
                scrollToField={alertFieldId}
                onScrollComplete={() => setAlertFieldId(null)}
                onHighlight={setHighlightText}
                highlightNotFound={highlightNotFound}
                onAiSuggestionsUpdate={setAiSuggestions}
                onMustHaveFieldsUpdate={setMustHave}
              />
              </ErrorBoundary>
              )}
            </div>
          </div>
        </div>


        {/* Bottom action bar */}
        <BottomActionBar
          caseData={caseData}
          isDirty={hasUnsavedData}
          onSaveDraft={async () => {
            await saveDraftInternal();
          }}
          onSaveAndNext={async () => {
            const saved = await saveDraftInternal();
            if (!saved) return; // held by a real conflict — don't proceed to the next case
            navigateToCase('next');
          }}
          onFinalize={() => handleRequestFinalize(false)}
          onFinalizeAndNext={() => handleRequestFinalize(true)}
          onSignOut={() => { if (caseData?.reportingMode !== 'assist') handleSignOutClick(); }}
          onReleasePreliminary={caseData?.id ? async () => {
            const result = await releasePreliminaryReport(caseData.id!, {
              id: signingUser?.id ?? 'unknown', name: signingUser?.name ?? signingUser?.id ?? 'unknown', role: 'Pathologist',
            }, generateReportPdfSnapshot);
            if (!result.ok) {
              showToast(result.error ?? tGrossingNav('synopticReportPage.toast.preliminaryReleaseFailed'), 'warning');
              return;
            }
            // Batch 534: held for the release delay (recallable from the held-reports line until then).
            if (result.heldUntil) {
              const refreshedHeld = await caseRouter.getCase(caseData.id!);
              if (refreshedHeld) setCaseData(refreshedHeld);
              showToast(tGrossingNav('synopticReportPage.toast.preliminaryHeld', { time: formatDateTime(result.heldUntil, i18nForDates.language) }));
              return;
            }
            if (result.dispatchedCount === 0) {
              showToast(tGrossingNav('synopticReportPage.toast.nothingToRelease'));
              return;
            }
            const refreshed = await caseRouter.getCase(caseData.id!);
            if (refreshed) setCaseData(refreshed);
            showToast(tGrossingNav('synopticReportPage.toast.preliminaryReleased', { count: result.dispatchedCount }));
          } : undefined}
          onRequestAmendment={handleRequestAmendment}
          followUpOffer={followUpOffer}
          onMarkFollowUp={handleMarkFollowUpAfterSignOut}
          onPrint={openCopilotReportView}
          onOpenReprints={() => setShowReprintModal(true)}
          onAttachImages={() => setShowAttachImages(true)}
          
          onHistory={() => setIsSimilarCasesOpen(true)}
          onFlags={() => { openFlagManager(caseData); log('flag_manager_opened', { caseId: caseId ?? '' }); }}
          onFlagForMdt={() => setShowFlagForMdtModal(true)}
          onDelegate={() => setShowDelegateModal(true)}
          onTeam={() => { setShowTeamModal(true); log('team_modal_opened', { caseId: caseId ?? '' }); }}
          onCodes={() => { setCodesModalTargetSpecimenIndex(null); setShowCodesModal(true); log('codes_modal_opened', { caseId: caseId ?? '' }); }}
          onNextCase={() => { if (shouldWarnDirty()) { setPendingNavigation('next'); } else { navigateToCase('next'); } }}
          onPreviousCase={() => { if (shouldWarnDirty()) { setPendingNavigation('prev'); } else { navigateToCase('prev'); } }}
          onGenerateReport={isOrchestrationMode ? handleGenerateReport : undefined}
          onGrossComplete={isOrchestrationMode ? handleGrossComplete : undefined}
          synopticFitPending={isEvaluatingSynopticFit || showProtoReview || showGrossingProtoReview}
          isGenerating={isOrchestrating}
          onAbortGenerate={handleAbortGenerate}
        />
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}

      {/* Batch 398 (PS-359): Gross Complete with the Grossing protocol rule
          switched off, for specimens with neither a protocol nor a Grossing
          template: confirm, then they're routed for secondary review. */}
      <ConfirmModal
        show={!!pendingProtocolConfirmation}
        title={tGrossingNav('useGrossingCompletion.withoutProtocol.title')}
        message={tGrossingNav('useGrossingCompletion.withoutProtocol.body', { count: pendingProtocolConfirmation?.length ?? 0, specimens: formatList(pendingProtocolConfirmation ?? [], i18nForDates.language) })}
        confirmLabel={tGrossingNav('grossingScreen.complete.withoutProtocol.confirm')}
        onConfirm={() => { void confirmGrossCompleteWithoutProtocol(); }}
        onCancel={cancelGrossCompleteWithoutProtocol}
      />

      {/* Quick fix (PS-359): replaces the previous window.prompt() — a
          correction to an already-finalized Gross requires a typed, audited
          reason (see useGrossingCompletion's handleGrossComplete). */}
      <ReasonPromptModal
        show={showUpdateReasonPrompt}
        title={tGrossingNav('useGrossingCompletion.prompt.title')}
        reasonLabel={tGrossingNav('useGrossingCompletion.prompt.reasonForUpdate')}
        confirmLabel={tGrossingNav('common.confirm')}
        onConfirm={confirmUpdateReason}
        onCancel={cancelUpdateReason}
      />

      {/* Batch 478: the authorization gate's own audited override —
          autopsy:gross-exam-gate:override. The reason is captured here,
          then the existing signature-confirm flow runs as usual
          (setConfirmingAutopsyTier), with the reason carried through to
          signAutopsyReport.ts via handleSignAutopsyReport. */}
      <ReasonPromptModal
        show={showGateOverridePrompt !== null}
        title={tGrossingNav('synopticReportPage.autopsy.gateOverride.promptTitle', { tier: showGateOverridePrompt ?? 'PAD' })}
        message={tGrossingNav('synopticReportPage.autopsy.gateOverride.promptMessage')}
        reasonLabel={tGrossingNav('synopticReportPage.autopsy.gateOverride.reasonLabel')}
        confirmLabel={tGrossingNav('synopticReportPage.autopsy.gateOverride.overrideBtn', { tier: showGateOverridePrompt ?? 'PAD' })}
        onConfirm={(reason) => {
          const tier = showGateOverridePrompt;
          setShowGateOverridePrompt(null);
          setGateOverrideReason(reason);
          if (tier) void beginAutopsySign(tier);
        }}
        onCancel={() => setShowGateOverridePrompt(null)}
      />

      <CaseSignOutModal
        show={showSignOutModal}
        accession={caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? ''}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleSignOutConfirm}
        onReject={handleReturnToTrainee}
        isCountersign={(caseData as any)?.status === 'pending-countersign'}
        residentName={(caseData as any)?.participants?.find((p: any) => p.status === 'active' && p.participationTypeIds?.includes('resident'))?.staffName}
        countersignFeedback={countersignFeedback}
        onCountersignFeedbackChange={setCountersignFeedback}
        followUpExpected={followUpExpected}
        onFollowUpExpectedChange={canMarkFollowUp ? setFollowUpExpected : undefined}
        relatedCases={caseData?.id ? { caseId: caseData.id, patientId: caseData.patient?.id, facilityId: caseData.order?.facilityId ?? null, user: signingUser?.id ?? 'unknown' } : undefined}
        specimens={caseData?.specimens as any}
        matrixBlocks={(caseData?.matrixBlocks as any) ?? []}
        onAssignBaseCode={(_specimenId, specimenIndex) => {
          // Real fix, per direct guidance: same redirect as the
          // Material tab's own "+ Code" button - see that call site's
          // own comment for the full reasoning.
          if (isOrchestrationMode) {
            safeSetLeftTab('material');
            setActiveReportType('billing');
            return;
          }
          setCodesModalTargetSpecimenIndex(specimenIndex);
          setShowCodesModal(true);
          log('codes_modal_opened', { caseId: caseId ?? '' });
        }}
      />

      {mergeReview && (
        <MergeReviewDialog
          theirsChanged={mergeReview.theirsChanged}
          mineChanged={mergeReview.mineChanged}
          busy={mergeReviewBusy}
          onSave={() => { void handleMergeReviewSave(); }}
          onNotYet={handleMergeReviewNotYet}
        />
      )}
      {concurrencyConflict && !mergeReview && (
        <EditConflictDialog
          actualVersion={concurrencyConflict.actualVersion}
          blockOverride={!!concurrencyConflict.blockOverride}
          rows={conflictRows}
          onKeepWorking={closeConcurrencyConflict}
          onViewChanges={() => { void handleConcurrencyViewChanges(); }}
          busy={caseUpdateBusy}
          onUseTheirs={() => { void handleConcurrencyUseTheirs(); }}
          onSaveMine={() => { void handleConcurrencyForceSave(); }}
        />
      )}

      {pendingReconciliation && caseData && (
        <DiscordanceReconciliationModal
          caseId={caseData.id}
          specimenId={pendingReconciliation.specimenId}
          caseType={pendingReconciliation.caseType}
          frozenCategory={pendingReconciliation.frozenCategory}
          frozenDx={pendingReconciliation.frozenDx}
          performedBy={{ userId: signingUser?.id ?? 'unknown', userName: signingUser?.name ?? unknownUserName }}
          draftedBy={(() => {
            // A resident/fellow participant whose draft is being
            // reconciled by whoever is currently signing out — undefined
            // for the common non-teaching path (no resident on the team,
            // or the signing pathologist IS the resident themselves,
            // which isn't a teaching relationship).
            const resident = (caseData as any)?.participants?.find(
              (p: any) => p.status === 'active' && p.participationTypeIds?.includes('resident') && p.staffId !== signingUser?.id
            );
            return resident ? { userId: resident.staffId, userName: resident.staffName } : undefined;
          })()}
          subspecialtyId={(caseData as any)?.subspecialtyId}
          onDone={finalizeSignOut}
        />
      )}

      {intraopMatch && caseData && (
        <IntraopMergePromptModal
          caseId={caseData.id}
          match={intraopMatch}
          onMergeNow={handleIntraopMergeNow}
          onGoToQueueLater={() => { setIntraopMatch(null); navigate('/intraop-queue'); }}
          onDismiss={() => setIntraopMatch(null)}
        />
      )}

      {printPlan && (
        <ReportPrintPromptModal
          plan={printPlan}
          onCancel={() => setPrintPlan(null)}
          onPrint={(reason) => { const plan = printPlan; setPrintPlan(null); void printReport(plan, reason); }}
        />
      )}

      <CopilotReportViewModal
        show={showCopilotReportView}
        onClose={() => setShowCopilotReportView(false)}
        accession={caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? ''}
        patient={caseData?.patient ? `${caseData.patient.familyNames ?? caseData.patient.lastName}, ${caseData.patient.givenNames ?? caseData.patient.firstName}` : ''}
        mrn={caseData?.patient?.mrn ?? ''}
        instances={copilotReportInstances}
        caseRecord={caseData}
      />

      {showAiReview && (
        <AiReviewModal
          fields={reviewFields}
          finalizeAndNext={finalizeAndNextPending}
          onConfirm={(fieldId: string) => synopticPanelRef.current?.setFieldVerification(fieldId, 'verified')}
          onOverride={(fieldId: string) => synopticPanelRef.current?.setFieldVerification(fieldId, 'disputed')}
          onSkip={(_fieldId: string) => { /* stays unverified */ }}
          onComplete={(summary) => {
            console.info('[PathScribe] AI review summary:', summary);
            setShowAiReview(false);
            setShowFinalizeModal(true);
          }}
          onCancel={() => setShowAiReview(false)}
        />
      )}

      {showNarrativeReview && (
        <AiNarrativeReviewModal
          narrativeText={generatedNarrativeText}
          defaultTargetField="gross"
          onAccept={handleAcceptGeneratedNarrative}
          onCancel={() => setShowNarrativeReview(false)}
        />
      )}

      {warningConfirm.modal}

      {showMissingWarning && (
        <div className="ps-cannot-fin-overlay" onClick={() => setShowMissingWarning(false)}>
          <div className="ps-cannot-fin-modal" onClick={e => e.stopPropagation()}>
            <div className="ps-cannot-fin-header">
              <span className="ps-cannot-fin-header-icon">⚠️</span>
              <div>
                <div className="ps-cannot-fin-header-tag">{tGrossingNav('synopticReportPage.cannotFinalise.tag')}</div>
                <div className="ps-cannot-fin-header-title">{tGrossingNav('synopticReportPage.cannotFinalise.title')}</div>
              </div>
            </div>
            <div className="ps-cannot-fin-body">
              <p className="ps-cannot-fin-desc">
                {tGrossingNav('synopticReportPage.cannotFinalise.body')}
              </p>
              <div className="ps-cannot-fin-list">
                {missingFields.map((f, i) => (
                  <button
                    key={i}
                    className="ps-cannot-fin-card"
                    title={tGrossingNav('synopticReportPage.cannotFinalise.jumpTitle')}
                    onClick={() => handleMissingFieldClick(f.fieldId)}
                  >
                    <span className="ps-cannot-fin-card-x">✗</span>
                    <div className="ps-cannot-fin-card-body">
                      <div className="ps-cannot-fin-card-label">{f.fieldLabel}</div>
                      <div className="ps-cannot-fin-card-section">{f.sectionTitle}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="ps-cannot-fin-footer">
              <span className="ps-cannot-fin-footer-count">{tGrossingNav('synopticReportPage.cannotFinalise.count', { count: missingFields.length })}</span>
              <button className="ps-btn-primary" onClick={() => setShowMissingWarning(false)}>
                {tGrossingNav('synopticReportPage.cannotFinalise.returnAndFix')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-finalisation review — two-pane: specimen list + Q&A preview + signing */}
      <PreFinalisationModal
        show={showPreFinalise}
        onJumpToField={(_instanceId, fieldKey) => {
          setShowPreFinalise(false);
          safeSetLeftTab('draft');
          setTimeout(() => setAlertFieldId(fieldKey), 100);
        }}
        caseAccession={caseData?.accession?.fullAccession ?? ''}
        patientName={`${caseData?.patient?.firstName ?? ''} ${caseData?.patient?.lastName ?? ''}`.trim()}
        reportingMode={caseData?.reportingMode === 'assist' ? 'assisted' : 'pathscribe'}
        synoptics={preFinalSynoptics}
        finalizeAndNext={finalizeAndNextPending}
        onConfirm={handlePreFinalConfirm}
        onCancel={() => setShowPreFinalise(false)}
      />

      {/* Batch 344: confirm who is signing an autopsy PAD/FAD. */}
      <SignatureConfirmModal
        show={confirmingAutopsyTier !== null}
        action={confirmingAutopsyTier === 'FAD' ? 'autopsy-fad' : 'autopsy-pad'}
        caseRef={caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? null}
        title={tGrossingNav('autopsySignOut.confirmTitle', { tier: confirmingAutopsyTier ?? 'PAD' })}
        confirmLabel={confirmingAutopsyTier === 'FAD' ? tGrossingNav('autopsySignOut.signFad') : tGrossingNav('autopsySignOut.signPad')}
        onConfirmed={(confirmation) => { const tier = confirmingAutopsyTier; setConfirmingAutopsyTier(null); if (tier) void handleSignAutopsyReport(tier, confirmation); }}
        onCancel={() => setConfirmingAutopsyTier(null)}
      />

      {/* Per-synoptic finalize confirmation (deferred/amendment flow) */}
      <FinalizeSynopticModal
        show={showFinalizeModal}
        activeSynoptic={null}
        finalizeAndNext={false}
        caseRef={caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? null}
        onClose={() => setShowFinalizeModal(false)}
        onConfirm={handleFinalizeConfirm}
      />

      {/* Real, per direct guidance's own follow-up: the general Codes
          manager save path can now pause and require a real reason +
          comment before any post-signout charge/credit or case-data
          mutation happens - see requestPostSignoutConfirmation above. */}
      {pendingPostSignoutPrompt && (
        <PostSignoutBillingChangeModal
          summary={pendingPostSignoutPrompt.summary}
          onConfirm={(context) => { pendingPostSignoutPrompt.resolve(context); setPendingPostSignoutPrompt(null); }}
          onCancel={() => { pendingPostSignoutPrompt.reject(); setPendingPostSignoutPrompt(null); }}
        />
      )}

      {/* Real, per direct guidance's own follow-up: "post-signout
          additions may be required if the wrong code was billed...
          the original bill is credited and the new billing code
          submitted." Captures the real, new replacement code before
          handleConfirmCodeCorrection runs the actual orchestration. */}
      {correctingCode && (
        <CorrectAppliedCodeModal
          originalCode={correctingCode.oldCode}
          caseId={caseData?.id}
          onConfirm={handleConfirmCodeCorrection}
          onCancel={() => setCorrectingCode(null)}
        />
      )}


      {/* Protocol change review — AI proposes after microscopic received */}
      <ProtocolChangeModal
        show={showProtoReview}
        changes={protoChanges}
        onCommit={handleProtoCommit}
        onCancel={() => setShowProtoReview(false)}
      />

      {/* Real feature, per direct follow-up: "there is kind of a workflow
          that allows the Gross to be dictated and on submission, the AI
          reads the Text, and updates the template... Not sure if there is
          bearing here." Real bearing — this is that same real, proven
          ProtocolChangeModal component, reused as-is (its own props are
          genuinely generic, nothing Synoptic-specific), now also reviewing
          real Grossing Template fit changes proposed after Gross
          Description dictation. Deliberately a second, separate instance
          from the Synoptic one above, not a shared one — a single Gross
          Complete can propose real changes to both independently; see
          useAmendmentWorkflow.ts's own comment on showGrossingProtoReview
          for why conflating them would be worse, not simpler. */}
      <ProtocolChangeModal
        show={showGrossingProtoReview}
        changes={grossingProtoChanges}
        onCommit={handleGrossingProtoCommit}
        onCancel={() => setShowGrossingProtoReview(false)}
      />

      <AmendmentModal
        show={showAmendmentModal}
        amendmentMode={amendmentMode}
        amendmentText={amendmentText}
        activeSynopticTitle={(() => {
          const r = caseData?.synopticReports?.find(rr => rr.instanceId === activeReportInstanceId);
          if (!r) return caseData?.accession?.fullAccession ?? 'Case';
          const specimen = caseData?.specimens?.find((s: any) => s.id === r.specimenId);
          return specimen ? `Specimen ${specimen.label}: ${r.templateName}` : r.templateName;
        })()}
        sequenceNumber={amendmentSequenceNumber}
        amendedByName={signingUser?.name ?? unknownUserName}
        versionHistory={versionHistory}
        resuming={resumingAmendment}
        orderingPhysicianName={caseData?.order?.requestingProvider}
        onModeChange={setAmendmentMode}
        onTextChange={setAmendmentText}
        onClose={() => { setShowAmendmentModal(false); setAmendmentDraftId(null); setAmendmentSubmitError(null); setResumingAmendment(undefined); }}
        onSubmit={handleAmendmentSubmit}
        onFieldOverridesConfirmed={handleFieldOverridesConfirmed}
        submitError={amendmentSubmitError}
      />

      <LogoutWarningModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onLogout={() => { setShowLogoutModal(false); handleLogout(); }}
      />

      <AddOrdersModal
        show={showAddOrdersModal}
        caseData={caseData}
        activeSpecimenId={activeSpecimenId}
        initialTab={addOrdersInitialTab}
        onClose={() => setShowAddOrdersModal(false)}
        onGoToAddSpecimen={() => {
          setShowAddOrdersModal(false);
          setEditingSpecimen(null);
          setShowSpecimenEdit(true);
        }}
        onGoToAddStain={() => {
          setShowAddOrdersModal(false);
          // openFlagManager doesn't currently support pre-scoping to a
          // specimen — opens at its own default (Case) scope, same as
          // the toolbar Flags button. A real specimen-preselect would
          // mean touching useSynopticFlags/FlagManagerModal's internal
          // state, which is working, tested code — not risking that
          // for this.
          openFlagManager(caseData);
          log('flag_manager_opened', { caseId: caseId ?? '', source: 'add_orders_modal' });
        }}
        onAddBlock={handleAddBlockWithCassette}
      />

      {showSpecimenEdit && caseData && (
        <SpecimenEditModal
          specimen={editingSpecimen}
          nextLabel={String.fromCharCode(65 + (caseData.specimens?.length ?? 0))}
          existingSpecimens={caseData.specimens ?? []}
          isOrchestrationMode={isOrchestrationMode}
          // Real, per direct guidance's own follow-up: the real,
          // auto-derived effective complexity (getEffectiveComplexity,
          // via useEffectiveSpecimenComplexity above) for this
          // specific specimen, if any - undefined when this specimen
          // has no real evidence to derive one from. Resolved once,
          // for every specimen, by the parent; the modal never
          // computes this itself.
          effectiveComplexity={editingSpecimen ? effectiveSpecimenComplexity[editingSpecimen.id] : undefined}
          onClose={() => { setShowSpecimenEdit(false); setEditingSpecimen(null); }}
          onSave={handleSpecimenSave}
        />
      )}

      {showCreateBiopsyArrayModal && caseData && (
        <CreateBiopsyArrayModal
          specimens={caseData.specimens ?? []}
          onClose={() => setShowCreateBiopsyArrayModal(false)}
          onSave={async (specimenIds, cassetteLabel) => {
            await handleCreateBiopsyArray(specimenIds, cassetteLabel);
            setShowCreateBiopsyArrayModal(false);
          }}
        />
      )}

      {editingMatrixBlockId && caseData && (() => {
        // Real, architectural fix, per direct follow-up: completes the
        // Biopsy Array feature — computes the current selection (in
        // real position order) from the real MatrixBlock's own
        // participants[], so the edit modal opens pre-populated with
        // what's really linked right now, not a guess.
        const matrixBlockId = editingMatrixBlockId;
        const matrixBlock = (caseData.matrixBlocks ?? []).find(m => m.id === matrixBlockId);
        if (!matrixBlock) return null;
        const linked = matrixBlock.participants.slice().sort((a, b) => a.positionInBlock - b.positionInBlock);
        return (
          <CreateBiopsyArrayModal
            specimens={caseData.specimens ?? []}
            existingCassetteId={matrixBlock.label}
            initialSelectedIds={linked.map(l => l.specimenId)}
            onClose={() => setEditingMatrixBlockId(null)}
            onSave={async (specimenIds) => {
              await handleUpdateBiopsyArray(matrixBlockId, specimenIds);
              setEditingMatrixBlockId(null);
            }}
            onDissolve={async () => {
              await handleDissolveBiopsyArray(matrixBlockId);
              setEditingMatrixBlockId(null);
              setViewingMatrixBlockId(null);
            }}
          />
        );
      })()}

      {/* Real, architectural fix, per direct follow-up: "the matrix
          block itself is the tracked asset." The real, dedicated
          status/piece-tracking editor for a MatrixBlock — distinct
          from the membership editor above. */}
      {viewingMatrixBlockId && caseData && (() => {
        const matrixBlock = (caseData.matrixBlocks ?? []).find(m => m.id === viewingMatrixBlockId);
        if (!matrixBlock) return null;
        return (
          <MatrixBlockEditorModal
            matrixBlock={matrixBlock}
            specimens={caseData.specimens ?? []}
            fullAccession={caseData.accession?.fullAccession ?? caseData.id}
            onUpdate={handleUpdateMatrixBlock}
            onPrintCassette={() => printMatrixCassette?.(matrixBlock.id)}
            onEditMembership={() => { setEditingMatrixBlockId(matrixBlock.id); setViewingMatrixBlockId(null); }}
            onOrderTargetedStain={handleOrderTargetedMatrixStain}
            currentUserId={signingUser?.id ?? 'unknown'}
            currentUserName={signingUser?.name ?? unknownUserName}
            onClose={() => setViewingMatrixBlockId(null)}
          />
        );
      })()}

      {showAddSynopticModal && (
        <AddSynopticModal
          caseData={caseData}
          availableProtocols={availableProtocols}
          onClose={() => setShowAddSynopticModal(false)}
          onAdd={handleAddSynopticReports}
        />
      )}

      {showCaseCommentModal && (
        <CaseCommentModal
          accession={caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? ''}
          comments={caseComments}
          currentUserId={signingUser?.id ?? 'unknown'}
          currentUserName={signingUser?.name ?? unknownUserName}
          onAddComment={handleAddCaseComment}
          onClose={() => setShowCaseCommentModal(false)}
        />
      )}

      {showRetentionHoldModal && caseData && (
        <RetentionHoldModal
          caseId={caseData.id}
          accession={caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? ''}
          retentionHolds={caseData.retentionHolds ?? []}
          currentUserId={signingUser?.id ?? 'unknown'}
          currentUserName={signingUser?.name ?? unknownUserName}
          onUpdated={(updated, version) => { knownVersionRef.current = adoptSavedVersion(knownVersionRef.current, version); setCaseData(prev => prev ? { ...prev, retentionHolds: updated } : prev); }}
          onClose={() => setShowRetentionHoldModal(false)}
        />
      )}

      {showCaseHoldModal && caseData && (
        <CaseHoldModal
          caseId={caseData.id}
          accession={caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? ''}
          caseHolds={caseData.caseHolds ?? []}
          currentUserId={signingUser?.id ?? 'unknown'}
          currentUserName={signingUser?.name ?? unknownUserName}
          onUpdated={(updated, version) => { knownVersionRef.current = adoptSavedVersion(knownVersionRef.current, version); setCaseData(prev => prev ? { ...prev, caseHolds: updated } : prev); }}
          onClose={() => setShowCaseHoldModal(false)}
        />
      )}

      {showCriticalFindingsModal && (
        <CriticalFindingsModal
          findings={criticalFindings}
          defaultNotifiedByName={signingUser?.name}
          caseReference={caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber}
          onRecord={handleRecordCriticalNotification}
          onAcknowledge={handleAcknowledgeCriticalFindings}
        />
      )}

      {showSpecimenCommentModal && activeSpecimenCommentId && (
        <ReportCommentModal
          specimenName={
            caseData?.specimens?.find(s => s.id === activeSpecimenCommentId)
              ? `Specimen ${caseData.specimens.find(s => s.id === activeSpecimenCommentId)!.label} › ${caseData.specimens.find(s => s.id === activeSpecimenCommentId)!.description}`
              : 'Specimen'
          }
          specimenId={activeSpecimenCommentId}
          comments={specimenComments[activeSpecimenCommentId] ?? []}
          isFinalized={false}
          currentUserId={signingUser?.id ?? 'unknown'}
          currentUserName={signingUser?.name ?? unknownUserName}
          onAddComment={handleAddSpecimenComment}
          onClose={() => setShowSpecimenCommentModal(false)}
        />
      )}

      {showDeficiencyModal && (
        <DeficiencyHistoryModal
          deficiencies={caseDeficiencies}
          deficiencyTypes={deficiencyTypes}
          resolutionTypes={resolutionTypes}
          onClose={() => setShowDeficiencyModal(false)}
        />
      )}

      {showVersionHistoryModal && (
        <VersionHistoryModal
          versions={caseVersions}
          facilityId={caseData?.order?.facilityId ?? null}
          caseId={caseData?.id}
          versionsPartial={caseVersionsPartial}
          onClose={() => setShowVersionHistoryModal(false)}
        />
      )}

      {showSignatureHistoryModal && (
        <SignatureHistoryModal
          records={caseSignatures}
          onClose={() => setShowSignatureHistoryModal(false)}
        />
      )}

      {showChangeHistory && caseData && (
        <ChangeHistoryModal
          entries={changeEntries}
          exportContext={{ caseId: caseData.id, facilityId: caseData.order?.facilityId ?? null }}
          onClose={() => setShowChangeHistory(false)}
          onExport={async labels => {
            // Batch 550: through the export service (the API server builds it for this case; the demo builds it here).
            await runExport('report.change-history', `change-history-${caseData.id}`, { caseId: caseData.id }, async () => {
              const res = await exportChangeLog(caseData.id, changeEntries, { name: signingUser?.name ?? 'unknown' }, labels, { auditService, authorization: authorizationService }, caseData.order?.facilityId ?? null);
              if (res.ok) downloadCsv(`change-history-${caseData.id}`, res.csv);
            }, caseData.order?.facilityId ? { facilityId: caseData.order.facilityId } : {});
          }}
        />
      )}

      {showBlockEditor && caseData && (
        <BlockStainEditorModal
          blocks={allBlocks}
          decants={allDecants}
          casePriority={(caseData as any)?.order?.priority ?? 'Routine'}
          fullAccession={caseData.accession?.fullAccession ?? caseData.id}
          onUpdateBlock={handleUpdateBlock}
          onUpdateDecant={handleUpdateDecant}
          onPrintDecantContainerLabel={handlePrintDecantContainerLabel}
          onSendStainOrder={handleSendStainOrder}
          onCancelBlock={handleCancelBlock}
          onDeleteBlock={canDeleteBlocks ? handleDeleteBlock : undefined}
          blockDeleteTier={blockDeleteTier}
          onFlagBlock={canFlagBlocks ? handleFlagBlock : undefined}
          onCreateSpareSlide={handleCreateSpareSlide}
          onOrderRestain={handleOrderRestain}
          currentUserId={signingUser?.id ?? 'unknown'}
          currentUserName={signingUser?.name ?? unknownUserName}
          onClose={() => { setShowBlockEditor(false); setFocusedDecantId(null); }}
          initialFocusBlockId={focusedDecantId ? undefined : focusedBlockEntry?.block.id}
          initialFocusDecantId={focusedDecantId ?? undefined}
        />
      )}

      {fixativeGateSpecimens && caseData && (
        <FixativeTimeGateModal
          specimens={fixativeGateSpecimens}
          onCancel={() => { setFixativeGateSpecimens(null); setPendingFinalizeArgs([]); }}
          onContinue={handleFixativeGateContinue}
        />
      )}

      {autopsyMismatch && caseData && (
        <ClinicalMismatchModal
          caseId={caseData.id}
          accession={caseData.accession?.fullAccession}
          caseType={caseData.specimens?.[0]?.description || caseData.id}
          subspecialtyId={caseData.subspecialtyId}
          clinicalIndication={caseData.order?.clinicalIndication}
          assessment={autopsyMismatch}
          discipline="autopsy"
          onCancel={() => { setAutopsyMismatch(null); setGateOverrideReason(null); }}
          onContinue={() => { setAutopsyMismatch(null); mismatchAlert.recorded(); setConfirmingAutopsyTier('FAD'); }}
        />
      )}

      {amendmentMismatch && caseData && (
        <ClinicalMismatchModal
          caseId={caseData.id}
          accession={caseData.accession?.fullAccession}
          caseType={caseData.specimens?.[0]?.description || caseData.id}
          subspecialtyId={caseData.subspecialtyId}
          clinicalIndication={caseData.order?.clinicalIndication}
          assessment={amendmentMismatch}
          discipline={caseData.autopsy ? 'autopsy' : 'surgical'}
          onCancel={cancelAddendumMismatch}
          onContinue={resumeAddendumAfterMismatch}
        />
      )}

      {clinicalMismatch && caseData && (
        <ClinicalMismatchModal
          caseId={caseData.id}
          accession={caseData.accession?.fullAccession}
          caseType={caseData.specimens?.[0]?.description || caseData.id}
          subspecialtyId={caseData.subspecialtyId}
          clinicalIndication={caseData.order?.clinicalIndication}
          assessment={clinicalMismatch}
          discipline="surgical"
          onCancel={cancelGate}
          onContinue={() => { setClinicalMismatch(null); mismatchAlert.recorded(); resumeAfterGate(); }}
        />
      )}

      {peerReviewGate && caseData && signingUser && (
        <PeerReviewGateModal
          caseId={caseData.id}
          accession={caseData.accession?.fullAccession}
          status={peerReviewGate}
          reviewers={peerReview.reviewers}
          currentUserId={signingUser.id}
          onCancel={cancelGate}
          onRequested={() => { cancelGate(); void peerReview.reload(); showToast(tGrossingNav('peerReview.gate.requestedToast'), 'info'); }}
          onContinue={() => { setPeerReviewGate(null); void peerReview.reload(); resumeAfterGate(); }}
        />
      )}

      {stainQcGateBlocking && caseData && (
        <StainQcGateModal
          blocking={stainQcGateBlocking}
          signingUserId={signingUser?.id ?? 'unknown'}
          signingUserName={signingUser?.name ?? unknownUserName}
          onCancel={() => { setStainQcGateBlocking(null); setPendingFinalizeArgs([]); setPendingActionIsSignOut(false); }}
          onContinue={handleStainQcGateContinue}
        />
      )}

      {inkingGateBlocking && caseData && (
        <InkingGateModal
          result={inkingGateBlocking}
          signingUserId={signingUser?.id ?? 'unknown'}
          signingUserName={signingUser?.name ?? unknownUserName}
          signingUserRole={signingUser?.role ?? 'unknown'}
          onCancel={cancelGate}
          onOverrideRecorded={handleInkingGateOverrideRecorded}
        />
      )}

      {showAutopsyAuthCompletion && caseData?.autopsy && (
        <div className="ps-overlay" onClick={() => setShowAutopsyAuthCompletion(false)}>
          <div onClick={e => e.stopPropagation()}>
            <AutopsyAuthorizationCompletionForm
              caseDetails={caseData.autopsy}
              onSubmit={handleAutopsyAuthCompletionSubmit}
            />
          </div>
        </div>
      )}

      {showAutopsyBodyRelease && caseData?.autopsy && getMainBodySpecimen(caseData.specimens) && (() => {
        const bodySpecimen = getMainBodySpecimen(caseData.specimens)!;
        return (
          <div className="ps-overlay" onClick={() => setShowAutopsyBodyRelease(false)}>
            <div onClick={e => e.stopPropagation()}>
              <AutopsyBodyReleaseForm
                caseId={caseData.id}
                specimenId={bodySpecimen.id}
                autopsyDetails={caseData.autopsy}
                onReleased={() => {
                  setShowAutopsyBodyRelease(false);
                  showToast(tGrossingNav('synopticReportPage.toast.bodyReleased'));
                  // Real, same established refresh pattern as the
                  // MATERIAL_SCAN_UPDATED_EVENT listener above \u2014
                  // releaseAutopsyBody.ts persists directly via its
                  // own caseRouter.updateCase() call, so local
                  // caseData needs a real re-fetch to pick up the new
                  // locationHistory entry, not a second, separate
                  // patch that could drift from what was actually
                  // persisted.
                  caseRouter.getCase(caseData.id).then(refreshed => {
                    if (refreshed) setCaseData(refreshed);
                  });
                }}
              />
            </div>
          </div>
        );
      })()}

      {preAnalyticDateGateSpecimens && caseData && (
        <PreAnalyticDateGateModal
          specimens={preAnalyticDateGateSpecimens}
          config={resolvePreAnalyticDateGateConfig(getOrganisationByHospitalId(caseData.originHospitalId)?.country)}
          onCancel={() => { setPreAnalyticDateGateSpecimens(null); setPendingFinalizeArgs([]); }}
          onContinue={handlePreAnalyticDateGateContinue}
        />
      )}

      {isSimilarCasesOpen && caseData && (
        <PatientHistoryModal
          patientName={`${caseData.patient.lastName}, ${caseData.patient.firstName}`}
          mrn={caseData.patient.mrn ?? ''}
          dateOfBirth={caseData.patient.dateOfBirth ?? ''}
          patientId={caseData.patient.id}
          currentCaseId={caseData.id}
          onClose={() => setIsSimilarCasesOpen(false)}
        />
      )}

      {showCodesModal && caseData && (
        <AddCodeModal
          existingCodes={buildCodeManagerExistingCodes((caseData as any).coding, (caseData.specimens ?? []) as any[]) as any[]}
          allSpecimens={(caseData.specimens ?? []).map((sp, i) => ({
            index: i, id: i + 1, specimenId: sp.id,
            name: `${sp.label}: ${sp.description ?? ''}`,
            specimenDictionaryEntryId: sp.specimenDictionaryEntryId,
            // Real, per useEffectiveSpecimenComplexity's own doc
            // comment - already incorporates sp.complexity when
            // explicitly set (getEffectiveComplexity checks that
            // first, internally), so this alone is the real,
            // effective value - no separate ?? sp.complexity needed.
            complexity: effectiveSpecimenComplexity[sp.id],
          }))}
          specimenDictionary={specimenDictionary}
          facilityId={caseData.order?.facilityId}
          isOrchestrationMode={isOrchestrationMode}
          caseText={{
            gross:       caseData.diagnostic?.grossDescription ?? '',
            microscopic: caseData.diagnostic?.microscopicDescription ?? '',
            ancillary:   caseData.diagnostic?.ancillaryStudies ?? '',
          }}
          synopticAnswers={
            (activeReportInstanceId
              ? caseData.synopticReports?.find(r => r.instanceId === activeReportInstanceId)?.answers
              : caseData.synopticReports?.[0]?.answers
            ) ?? caseData.synopticAnswers ?? {}
          }
          templateName={
            (activeReportInstanceId
              ? caseData.synopticReports?.find(r => r.instanceId === activeReportInstanceId)?.templateName
              : caseData.synopticReports?.[0]?.templateName
            ) ?? ''
          }
          narrativeText={
            (caseData.synopticReports?.find(r => r.instanceId === activeReportInstanceId) as any)?.narrativeContent ?? undefined
          }
          onAddToSpecimens={handleAddCodesToSpecimens}
          caseCoding={caseData?.coding}
          onClose={() => { setShowCodesModal(false); setCodesModalTargetSpecimenIndex(null); }}
          originHospitalId={caseData?.originHospitalId}
          activeSpecimenIndex={codesModalTargetSpecimenIndex ?? undefined}
          initialSystem={codesModalTargetSpecimenIndex !== null ? 'CPT' : undefined}
          triggerQueries={triggerCodeQueryList}
        />
      )}

      {showFlagManager && flagCaseData && (
        <FlagManagerModal
          key={`flag-modal-${flagCaseData.id}`}
          caseData={{
            ...flagCaseData,
            accession: (flagCaseData.accession as any)?.fullAccession ?? (flagCaseData.accession as any)?.accessionNumber ?? flagCaseData.accession ?? '',
            flags: (flagCaseData as any).flags ?? [],
          } as any}
          flagDefinitions={flagDefinitions}
          onApplyFlags={async (...args: Parameters<typeof onApplyFlags>) => { await onApplyFlags(...args); }}
          onRemoveFlag={async (...args: Parameters<typeof onRemoveFlag>) => { await onRemoveFlag(...args); }}
          onDirtyChange={handleFlagsDirtyChange}
          onClose={() => {
            // FlagManagerModal now edits a local draft internally and
            // only calls the real onApplyFlags/onRemoveFlag from its own
            // Save button -- by the time onClose fires, flagCaseData
            // (kept in sync by those calls) is always accurate, whether
            // Save ran or Cancel closed with nothing changed. Safe to
            // sync unconditionally.
            if (flagCaseData && caseData) {
              setCaseData(prev => prev ? {
                ...prev,
                caseFlags: (flagCaseData as any).flags ?? [],
                specimens: prev.specimens?.map(sp => {
                  const updated = flagCaseData.specimens?.find((s: any) => s.id === sp.id);
                  return updated ? { ...sp, specimenFlags: (updated as any).flags ?? [] } : sp;
                }),
              } : prev);
            }
            setShowFlagManager(false);
          }}
        />
      )}

      {showTeamModal && caseData && (
        <CaseTeamModal
          caseData={caseData}
          onClose={() => setShowTeamModal(false)}
          onUpdated={(updated, version) => { knownVersionRef.current = adoptSavedVersion(knownVersionRef.current, version); setCaseData(updated); }}
          onDirtyChange={handleTeamDirtyChange}
          onDelegate={() => { setShowTeamModal(false); setDelegateReturnTo('team'); setShowDelegateModal(true); }}
        />
      )}

      {showDelegateModal && (
        <DelegateModal
          isOpen={showDelegateModal}
          onClose={() => {
            setShowDelegateModal(false);
            if (delegateReturnTo === 'team') { setShowTeamModal(true); setDelegateReturnTo(null); }
          }}
          registry={actionRegistryService}
          caseId={caseId}
          currentUserId={signingUser?.id}
          presetTypeId={delegatePreset?.typeId}
          presetNonce={delegatePreset?.nonce}
          onDelegated={() => {
            setShowDelegateModal(false);
            showToast(tGrossingNav('synopticReportPage.toast.caseDelegated'));
            // Batch 381: delegating changes the case, so the page's next save
            // must know its new version (it was refused as someone else's change).
            // PS-71 (Batch 458): take the delegation's team change, and its version
            // only if nobody else saved in between (adoptSavedVersion).
            if (caseData?.id) void caseRouter.getCase(caseData.id).then(c => {
              if (!c) return;
              knownVersionRef.current = adoptSavedVersion(knownVersionRef.current, c.version);
              setCaseData(prev => (prev ? { ...prev, participants: c.participants, eligibleFinalizerIds: (c as any).eligibleFinalizerIds, order: c.order } as typeof prev : prev));
            });
            if (delegateReturnTo === 'team') { setShowTeamModal(true); setDelegateReturnTo(null); }
          }}
          synopticInstances={(caseData?.synopticReports ?? []).map(r => ({
            instanceId: r.instanceId,
            specimenDescription: caseData?.specimens?.find(s => s.id === r.specimenId)?.description ?? r.specimenId,
            templateName: r.templateName,
          }))}
        />
      )}

      {showFlagForMdtModal && caseData?.id && signingUser && (
        <FlagForMdtModal
          caseId={caseData.id}
          caseAccession={caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? ''}
          byUserId={signingUser.id}
          byUserName={signingUser.name}
          onClose={() => setShowFlagForMdtModal(false)}
          onFlagged={board => showToast(tGrossingNav('synopticReportPage.toast.flaggedForMdt', { board: tGrossingNav(`tumorBoard.boards.${board}`) }))}
        />
      )}

      {/* Tab-switch unsaved draft confirmation — orchestration mode only */}
      {pendingTabSwitch && (
        <div className="ps-tabswitch-overlay">
          <div className="ps-tabswitch-modal">
            <div className="ps-tabswitch-title">
              {tGrossingNav('synopticReportPage.tabSwitch.title')}
            </div>
            <div className="ps-tabswitch-body">
              {tGrossingNav('synopticReportPage.tabSwitch.body')}
            </div>
            <div className="ps-tabswitch-footer">
              <button
                onClick={() => setPendingTabSwitch(null)}
                className="ps-tabswitch-btn ps-tabswitch-btn--cancel"
              >{tGrossingNav('common.cancel')}</button>
              <button
                onClick={handleDiscardAndSwitchTab}
                className="ps-tabswitch-btn ps-tabswitch-btn--discard"
              >{tGrossingNav('synopticReportPage.tabSwitch.discard')}</button>
              <button
                onClick={handleSaveAndSwitchTab}
                className="ps-tabswitch-btn ps-tabswitch-btn--save"
              >{tGrossingNav('synopticReportPage.tabSwitch.save')}</button>
            </div>
          </div>
        </div>
      )}

      {hasExistingDraft && existingDraftSavedAt && draftDiff.length > 0 && (
        <DraftRecoveryModal
          savedAt={existingDraftSavedAt}
          onRestore={handleRestoreDraft}
          onDiscard={discardDraft}
          changes={draftDiff}
        />
      )}

      {showAttachImages && caseData && (
        <AttachReportImagesModal
          caseId={caseData.id}
          accession={caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? caseData.id}
          facilityId={caseData.order?.facilityId ?? null}
          onClose={() => setShowAttachImages(false)}
        />
      )}

      {showReprintModal && caseData && (
        <ManageReprintsModal
          caseData={caseData}
          onClose={() => setShowReprintModal(false)}
          onReprintRequisition={() => printRequisitionLabel(caseData)}
          onReprintContainer={specimenLabel => {
            const sp = (caseData.specimens ?? []).find((s: any) => s.label === specimenLabel);
            if (sp) { printContainerLabel(caseData, sp).catch(console.error); }
          }}
          onReprintCassette={(specimenLabel, blockLabel) => printCassetteForBlock?.(specimenLabel, blockLabel)}
          onReprintSlide={printSlideForStain}
          batchPrintBlocked={batchPrintBlocked ?? false}
        />
      )}

      <UnsavedWarningModal
        show={!!pendingNavigation || !!pendingPath}
        dirtySections={Array.from(dirtySections)}
        onCancel={() => {
          setPendingNavigation(null);
          cancelContextNavigate();
        }}
        onSaveAndLeave={handleSaveAndLeave}
        onConfirm={() => {
          clearDirty();
          if (pendingPath) confirmContextNavigate();
          const dest = pendingNavigation;
          setPendingNavigation(null);
          if (dest === 'next') navigateToCase('next');
          else if (dest === 'prev') navigateToCase('prev');
          else if (dest === '__back__') {
            if (backPath === '/search') markReturnToSearch();
            navigate(backPath);
          }
          else if (dest) navigate(dest);
        }}
      />
    </div>
    </SpellCheckProvider>
  );
};

export default SynopticReportPage;
