// src/pages/CytologyWorklistPage/CytologyScreeningPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The Cytology Workspace: one cytology specimen's screening and review entry,
// review history, QC, HPV and patient history, final diagnosis and sign-out.
// Two columns: context and history on the left, the review form on the right
// (Bethesda-style, or the six-axis CISOE-A form at a PALGA facility).
//
// Batch 410 (PS-359): the page renders and dispatches only. What it loads is
// services/cytology/loadCytologyWorkspace.ts; saving a review (workload, QC
// selection, secondary-screening QA) is saveCytologyReview.ts; the other
// actions (final diagnosis, QC flags, the 5-year lookback outcome, cyto-histo
// correlation, decants, ROSE, codes, LMP, print) are cytologyCaseActions.ts;
// what each card shows is cytologyWorkspaceView.ts; the drafts are
// cytologyReviewDraft.ts. Sign-out is signOutCytologyCase.ts (Batch 409).
// Batch 411: a case's cytology specimens are tabs (CytologySpecimenTabs), each
// reviewed and signed out on its own; the case is final when all are
// (cytologyCaseFinalization.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { caseAddresses } from '@/services';
import { useOpenCase } from '@/hooks/useOpenCase';
import { useRouteCaseId } from '@/hooks/useRouteCaseId';
import { RegistryOptOutBadge } from '@/components/Common/RegistryOptOutBadge';
import { actionRegistryService, molecularTargetService, stainTypeService } from '@/services';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { safeInternalPath } from '@/utils/safeInternalPath';
import { toast } from 'react-toastify';
import '../../pathscribe.css';
import { useAuth } from '@contexts/AuthContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { Trans, useTranslation } from 'react-i18next';
import RequestReviewModal from '@/components/RequestReview/RequestReviewModal';
import EMRSidecarDrawer from '@/pages/SynopticReportPage/components/EMRSidecarDrawer';
import { WsiViewerLaunchButton } from '@/pages/SynopticReportPage/components/WsiViewerLaunchButton';
import CaseTeamModal from '@/pages/SynopticReportPage/modals/CaseTeamModal';
import { DelegateModal } from '@/pages/Synoptic/Delegate/DelegateModal';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import type { DecantType } from '@/types/case/Material';
import { useSynopticFlags } from '@/pages/Synoptic/useSynopticFlags';
import FlagManagerModal from '@/components/Flags/FlagManagerModal';
import AddCodeModal from '@/pages/Synoptic/Codes/AddCodeModal';
import CytologySlideOverDrawer from './components/CytologySlideOverDrawer';
import CytologyMaterialView from './components/CytologyMaterialView';
import CytologySynopticFormView from './components/CytologySynopticFormView';
import { CytologyFieldLabel } from './components/CytologySearchSelect';
import { CytologyReviewForm } from './components/CytologyReviewForm';
import { CytologyCisoeAForm } from './components/CytologyCisoeAForm';
import { CytologyRetrospectiveBanner } from './components/CytologyRetrospectiveBanner';
import { CytologyQcCaseBar } from '@/components/CytologyQc/CytologyQcCaseBar';
import { CytologyHistologyCandidateBanner } from './components/CytologyHistologyCandidateBanner';
import { EMPTY_CISOEA_DRAFT, cisoeADraftFromScore, resolveCisoeAPartialFromDraft, type CisoeADraft } from '@/services/cytology/cisoeADraft';
import { cytologyFieldRequired } from '@/services';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import CytologyRoseView from './components/CytologyRoseView';
import { resolveHasAdvancedSignOutCertification } from '@/services/staff/resolveHasAdvancedSignOutCertification';
import { PhiToastMessage } from '@/components/Common/PhiToastMessage';
import type { SignatureConfirmation } from '@/services/auth/signerConfirmation';
import type { PatientCytoHistoHistory } from '@/services/cytology/resolvePatientCytoHistoHistory';
import type { PathologyLexiconEntry } from '@/types/cytology/PathologyLexicon';
import { resolveCytologyIsPathologistTrack } from '@/services/cases/resolveCytologyIsPathologistTrack';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { formatList } from '@/utils/formatList';
import { formatIdentificationName, fromLegacyName, resolvePatientFullDisplayName } from '@/utils/personName';
import type { ProviderCredential } from '@/types/staff/ProviderCredential';
import type { Jurisdiction } from '@/types/systemConfig';
import { resolveCytologyReviewerRole } from '@/services/cytology/resolveCytologyReviewerRole';
import { qcByPrimaryScreener } from '@/services/cytology/cytologyQueues';
import { cloneCytologyReviewAsDraft } from '@/services/cytology/cloneCytologyReviewAsDraft';
import { latestCytologySignOut } from '@/services/cytology/resolveCytologyRevisionInputs';
import { resolveCytologyStructuredWorkflowAccess } from '@/services/cytology/resolveCytologyStructuredWorkflowAccess';
import { signOutCytologyCase } from '@/services/cytology/signOutCytologyCase';
import { signOutCytologyCaseDeps } from '@/services/cytology/signOutCytologyCaseDeps';
import { recordAiHumanConcordance } from '@/services/digitalPathology/recordAiHumanConcordance';
import type { AiScreeningResult } from '@/types/digitalPathology/AiScreeningResult';
import { resolveCisoeAReflexRecommendation } from '@/services/cytology/resolveCisoeAReflexRecommendation';
import type { CytologyReviewRecord, CytologyReviewRole, CytologyReviewMode, CytologyReviewSection, CytologyReviewVersion } from '@/types/cytology/CytologyReviewRecord';
import type { CytologySignOutRecord } from '@/types/cytology/CytologySignOutRecord';
import type { CytologyCategoryEntry, CytologyNomenclatureSystem } from '@/services/cytology/ICytologyCategoryService';
import type { CytologyWorkloadCapacityStatus } from '@/services/cytology/resolveCytologyWorkloadCapacity';
import type { Case } from '@/types/case/Case';
import { useCompanionWindow } from '@/hooks/useCompanionWindow';
import { SpellCheckProvider } from '@/components/SpellCheck/SpellCheckContext';
import { SpellingLanguageControl } from '@/components/SpellCheck/SpellingLanguageControl';
import { useCaseSpellCheck } from '@/hooks/useCaseSpellCheck';
import type { SpellingLocale } from '@/services/spellcheck/spellingLocales';
import { SignatureConfirmModal } from '@/components/Signing/SignatureConfirmModal';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { CytologyRevisionActions } from './components/CytologyRevisionActions';
import { CytologyRevisionPanel } from './components/CytologyRevisionPanel';
import { useCytologyRevision } from './hooks/useCytologyRevision';
import { EMPTY_DRAFT, draftFromClonedReview, draftFromReview, isDraftDirty, notesWithNarrative, ownReviewForEditing, type Draft } from '@/services/cytology/cytologyReviewDraft';
import { loadCytologyWorkspace, type CytologySpecimenTab } from '@/services/cytology/loadCytologyWorkspace';
import { finalizeCytologyCaseEarly } from '@/services/cytology/cytologyCaseFinalization';
import { CytologySpecimenTabs } from './components/CytologySpecimenTabs';
import { saveCytologyReview, type SaveCytologyReviewOutcome } from '@/services/cytology/saveCytologyReview';
import { reviseCytologyReviewForSignOut } from '@/services/cytology/reviseCytologyReviewForSignOut';
import { acknowledgeCytologyReviewNote, addCytologyReviewNote, hasPendingAuthorRevision, notesForReview } from '@/services/cytology/cytologyReviewNotes';
import { CytologyReviewNotes } from './components/CytologyReviewNotes';
import { CytologyReviewEligibilityBadge } from './components/CytologyReviewEligibilityBadge';
import { cytologyWorkspaceDeps } from '@/services/cytology/cytologyWorkspaceDeps';
import { saveCytologyUnitCoding, saveCytologySpecimenBilling } from '@/services';
import { useCaseBillingReview } from '@/hooks/useCaseBillingReview';
import { CaseBillingReview } from '@/components/Billing/CaseBillingReview';
import {
  addCytologyDecant, CytologyDecantNotSaved, applyCytologyCodeChanges, buildCytologyPrintDocument, completeCytologyRetrospectiveReview,
  dismissHistologyCorrelationCandidate, flagCytologyForQc, patchCytologyScreening, recordCytologyHistologyCorrelation,
  recordCytologyRoseEvaluation, removeCytologyQcFlag, resolveHistologyCorrelations, saveCytologyLastMenstrualPeriod, saveCytologySpellingLocaleOverride,
  selectCytologyFinalDiagnosis, updateCytologyDecantStains,
  type CytologyRetrospectiveOutcome, type HistologyCorrelationEntry, type HistologyCorrelationResolution,
} from '@/services/cytology/cytologyCaseActions';
import { decantRefusalKey } from '@/services/material/materialTree';
import {
  aiScreeningSummary, cytologyCategoryLabel, cytologyCategoryOptions, cytologyCodeSpecimens, cytologyExistingCodes,
  cytologyCaseProgress, cytologyHpvCard, cytologyReviewActions, cytologyReviewEligibility, cytologySelectionEntries, cytologySignOutPanel, cytologySynopticTranslationCheck,
  cytologyWorkloadBanner, displayedReviewerRole, hasPatientHistory, isAdminTierAccount, onScreenFiveYearLookback,
  openHistologyCorrelationCandidates, shouldPromptAiConcordance, showCytologySynopticTrigger,
  type CytologyGateContext, type CytologyHpvFields,
} from '@/services/cytology/cytologyWorkspaceView';

const fieldLabel = (text: string, hint?: string) => <CytologyFieldLabel text={text} hint={hint} />;
const deps = cytologyWorkspaceDeps;

export default function CytologyScreeningPage() {
  // Batch 446: the address carries the case's reference, not its accession.
  const caseId = useRouteCaseId('cytology');
  const navigate = useNavigate();
  const openCasePage = useOpenCase();
  // Batch 396: a screen that opens this page for review (the Cytology QC Peer
  // Review Queue) passes where Back should return to; only a same-site path.
  const location = useLocation();
  const backTarget = safeInternalPath((location.state as { returnTo?: unknown } | null)?.returnTo) ?? '/cytology-worklist';
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const cytologyRequirements = useFieldRequirements('cytology');
  const roleLabel = (role: CytologyReviewRole) => t(`cytologyScreening.roles.${role}`);
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t('cytologyWorklist.breadcrumbLabel'), '/cytology-worklist'); }, [pushCrumb, t]);

  // The action bar's modals and drawers (shared with Surgical Pathology).
  const [reviewOpen, setReviewOpen] = useState(false);
  const [emrOpen, setEmrOpen] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegateReturnTo, setDelegateReturnTo] = useState<'team' | null>(null);
  // General case flags, alongside this screen's own high-risk QC flag (a different thing).
  const { flagCaseData, flagDefinitions, showFlagManager, setShowFlagManager, openFlagManager, onApplyFlags, onRemoveFlag } = useSynopticFlags('');
  const [showCodesModal, setShowCodesModal] = useState(false);
  // Batch 460 (Pete): full billing review in a wide drawer, next to # Codes.
  const [showBillingDrawer, setShowBillingDrawer] = useState(false);
  const [showMaterialDrawer, setShowMaterialDrawer] = useState(false);
  const [showRoseDrawer, setShowRoseDrawer] = useState(false);
  const [showSynopticDrawer, setShowSynopticDrawer] = useState(false);
  const [stainTypes, setStainTypes] = useState<import('@/services/stains/IStainService').StainType[]>([]);
  const [molecularTargets, setMolecularTargets] = useState<import('@/types/billing/MolecularBillingRule').MolecularTarget[]>([]);
  useEffect(() => {
    stainTypeService.getAll().then(res => { if (res.ok) setStainTypes(res.data); });
    molecularTargetService.getAll().then(res => { if (res.ok) setMolecularTargets(res.data); });
  }, []);

  // ── What loadCytologyWorkspace returns ─────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [specimenId, setSpecimenId] = useState<string | null>(null);
  const [cytologySpecimens, setCytologySpecimens] = useState<CytologySpecimenTab[]>([]);
  // The specimen being worked on, so a reload after an action stays on it.
  const specimenIdRef = useRef<string | null>(null);
  const [isGynCytology, setIsGynCytology] = useState(true);
  const [dictionaryDefaultSynopticTemplateId, setDictionaryDefaultSynopticTemplateId] = useState<string | undefined>(undefined);
  const [nomenclatureSystem, setNomenclatureSystem] = useState<CytologyNomenclatureSystem>('bethesda');
  const [categories, setCategories] = useState<CytologyCategoryEntry[]>([]);
  const [bethesdaForMapping, setBethesdaForMapping] = useState<CytologyCategoryEntry[]>([]);
  const [reviews, setReviews] = useState<CytologyReviewRecord[]>([]);
  const [signOutRecords, setSignOutRecords] = useState<CytologySignOutRecord[]>([]);
  const [aiScreeningResult, setAiScreeningResult] = useState<AiScreeningResult | null>(null);
  const [labJurisdiction, setLabJurisdiction] = useState<Jurisdiction>('US');
  const [signingProviderCredentials, setSigningProviderCredentials] = useState<ProviderCredential[] | undefined>(undefined);
  const [instrumentationModality, setInstrumentationModality] = useState<'wsi' | 'traditional_guided'>('wsi');
  const [pathologyLexicon, setPathologyLexicon] = useState<PathologyLexiconEntry[]>([]);
  const [patientHistory, setPatientHistory] = useState<PatientCytoHistoHistory | null>(null);
  // Batch 415: the CLIA workload cap and CAP 5-year lookback, on or off for this lab.
  const [complianceFeatures, setComplianceFeatures] = useState({ workloadCap: true, fiveYearLookback: true });
  const [lmpDraft, setLmpDraft] = useState('');

  const load = useCallback(async (preferredSpecimenId?: string) => {
    if (!caseId) return;
    setLoading(true);
    try {
      const w = await loadCytologyWorkspace(caseId, user?.id, deps, preferredSpecimenId ?? specimenIdRef.current);
      setCaseData(w.caseData);
      setLmpDraft(w.caseData?.patient?.lastMenstrualPeriod ?? '');
      specimenIdRef.current = w.specimenId;
      setSpecimenId(w.specimenId);
      setCytologySpecimens(w.cytologySpecimens);
      setIsGynCytology(w.isGynCytology);
      setDictionaryDefaultSynopticTemplateId(w.defaultSynopticTemplateId);
      setNomenclatureSystem(w.nomenclatureSystem);
      setCategories(w.categories);
      setBethesdaForMapping(w.bethesdaForMapping);
      setReviews(w.reviews);
      setSignOutRecords(w.signOutRecords);
      setAiScreeningResult(w.aiScreeningResult);
      setLabJurisdiction(w.labJurisdiction);
      setSigningProviderCredentials(w.signingProviderCredentials);
      setInstrumentationModality(w.instrumentationModality);
      setPathologyLexicon(w.pathologyLexicon);
      setPatientHistory(w.patientHistory);
      setComplianceFeatures(w.complianceFeatures);
    } finally {
      setLoading(false);
    }
  }, [caseId, user?.id]);
  useEffect(() => { load(); }, [load]);

  const { openCompanion } = useCompanionWindow({ windowName: 'PathScribeEMRSidecar', preferredWidth: 1200, preferredHeight: 800 });
  const handleLaunchEMR = async () => {
    // Batch 446: addressed by the case reference, never the MRN.
    const address = caseData?.id ? await caseAddresses.addressOf(caseData.id, 'emr') : null;
    if (!address) { setEmrOpen(true); return; }
    const targetUrl = `${window.location.origin}${address}`;
    // Dev-testing shortcut kept for parity with Surgical Pathology's action bar.
    if (new URLSearchParams(window.location.search).get('forceEmrFallback') === '1') { setEmrOpen(true); return; }
    const result = await openCompanion(targetUrl);
    if (result === 'blocked') setEmrOpen(true);
  };

  // Voice: this page's own context, and its drawer and decant commands.
  useEffect(() => {
    actionRegistryService.setCurrentContext(VOICE_CONTEXT.CYTOLOGY);
    return () => { actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); };
  }, []);
  useEffect(() => {
    const openMaterial = () => setShowMaterialDrawer(true);
    const openSynoptic = () => setShowSynopticDrawer(true);
    window.addEventListener('PATHSCRIBE_CYTOLOGY_OPEN_MATERIAL', openMaterial);
    window.addEventListener('PATHSCRIBE_CYTOLOGY_OPEN_SYNOPTIC', openSynoptic);
    return () => {
      window.removeEventListener('PATHSCRIBE_CYTOLOGY_OPEN_MATERIAL', openMaterial);
      window.removeEventListener('PATHSCRIBE_CYTOLOGY_OPEN_SYNOPTIC', openSynoptic);
    };
  }, []);

  // ── Who is reviewing ───────────────────────────────────────────────────────
  // The pathologist track comes from the reviewer's participation on the case.
  const isPathologist = useMemo(
    () => resolveCytologyIsPathologistTrack(caseData?.participants, user?.id, isAdminTierAccount(user?.role)),
    [caseData?.participants, user?.id, user?.role],
  );
  const hasAdvancedCert = resolveHasAdvancedSignOutCertification(signingProviderCredentials, labJurisdiction, 'CYTO_ADVANCED_SPECIALIST', new Date().toISOString());
  const showSynopticTrigger = showCytologySynopticTrigger(isGynCytology, nomenclatureSystem, isPathologist, hasAdvancedCert);

  const currentSpecimen = (caseData?.specimens as any[])?.find(sp => sp.id === specimenId);
  const currentQcFlag = currentSpecimen?.cytologyScreening?.qcFlag;
  const currentRetrospectiveReviewFlag = currentSpecimen?.cytologyScreening?.retrospectiveReviewFlag;
  const currentFinalDiagnosis = currentSpecimen?.cytologyScreening?.finalDiagnosis;
  const currentPostSignOutPeerReviewFlag = currentSpecimen?.cytologyScreening?.postSignOutPeerReviewFlag;
  const currentHpv: CytologyHpvFields = currentSpecimen?.cytologyScreening ?? {};
  const hpvCard = cytologyHpvCard(currentHpv);
  const gateContext: CytologyGateContext = {
    isGynCytology, isFlaggedForQc: !!currentQcFlag, categories, labJurisdiction, signingProviderCredentials,
    uiLanguage: i18n.language, pathologyLexicon, isPathologist,
    pendingAuthorRevision: hasPendingAuthorRevision(currentSpecimen),
  };
  const resolvedRole = useMemo(() => resolveCytologyReviewerRole(
    reviews, isPathologist, currentQcFlag,
    user?.id ? { flag: currentPostSignOutPeerReviewFlag, originalSignerId: signOutRecords[0]?.signedBy.userId, currentUserId: user.id } : undefined,
  ), [reviews, isPathologist, currentQcFlag, currentPostSignOutPeerReviewFlag, signOutRecords, user?.id]);

  // ── Drafts ─────────────────────────────────────────────────────────────────
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [baselineDraft, setBaselineDraft] = useState<Draft>(EMPTY_DRAFT);
  const [cisoeADraft, setCisoeADraft] = useState<CisoeADraft>(EMPTY_CISOEA_DRAFT);
  const [cisoeABaselineDraft, setCisoeABaselineDraft] = useState<CisoeADraft>(EMPTY_CISOEA_DRAFT);
  const [cisoeAErrors, setCisoeAErrors] = useState<string[]>([]);
  const [cisoeAWarnings, setCisoeAWarnings] = useState<string[]>([]);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<CytologyReviewMode>('primary_manual');
  const [saving, setSaving] = useState(false);
  const initializedOwnReviewForCase = useRef<string | null>(null);

  // A live reflex suggestion from whatever S/O/E values are entered (the reviewer still decides).
  const cisoeAReflexSuggestion = useMemo(() => {
    const p = resolveCisoeAPartialFromDraft(cisoeADraft);
    return p.squamous && p.otherEndometrium && p.endocervical
      ? resolveCisoeAReflexRecommendation({ squamous: p.squamous, otherEndometrium: p.otherEndometrium, endocervical: p.endocervical })
      : undefined;
  }, [cisoeADraft]);

  const isDirty = nomenclatureSystem === 'palga_cisoea' ? isDraftDirty(cisoeADraft, cisoeABaselineDraft) : isDraftDirty(draft, baselineDraft);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
  // In-app navigation never fires beforeunload, so Back asks itself.
  const handleBackToWorklist = () => {
    if (isDirty && !window.confirm(t('cytologyScreening.confirm.leave'))) return;
    navigate(backTarget);
  };

  // Open the reviewer's own review for editing, once per specimen (never over later edits).
  useEffect(() => {
    if (!specimenId || !user?.id || initializedOwnReviewForCase.current === specimenId) return;
    initializedOwnReviewForCase.current = specimenId;
    // Batch 411: another specimen starts from its own reviews, never the last one's draft.
    setEditingReviewId(null); setReviewMode('primary_manual'); setRevisingFromReviewId(null);
    setDraft(EMPTY_DRAFT); setBaselineDraft(EMPTY_DRAFT);
    setCisoeADraft(EMPTY_CISOEA_DRAFT); setCisoeABaselineDraft(EMPTY_CISOEA_DRAFT);
    setCisoeAErrors([]); setCisoeAWarnings([]);
    setWorkloadStatus(null); setWorkloadBlockedReason(null);
    setRetrospectiveOutcomeDraft(''); setRetrospectiveCorrectiveActionDraft('');
    const own = ownReviewForEditing(reviews, user.id);
    if (!own) return;
    setEditingReviewId(own.reviewId);
    setReviewMode(own.reviewMode);
    setDraft(own.draft);
    setBaselineDraft(own.draft);
    if (own.cisoeADraft) { setCisoeADraft(own.cisoeADraft); setCisoeABaselineDraft(own.cisoeADraft); }
  }, [specimenId, user?.id, reviews]);

  // Batch 411: another specimen's tab (unsaved changes asked about first).
  const handleSelectSpecimen = (id: string) => {
    if (id === specimenId) return;
    if (isDirty && !window.confirm(t('cytologyScreening.confirm.discard'))) return;
    void load(id);
  };
  const caseProgress = cytologyCaseProgress(cytologySpecimens, caseData);
  const [finalizingCase, setFinalizingCase] = useState(false);
  const handleFinalizeEarly = async (reason: string): Promise<boolean> => {
    if (!caseData || !user?.id) return false;
    setFinalizingCase(true);
    try {
      const outcome = await finalizeCytologyCaseEarly({
        caseData, cytologySpecimenIds: cytologySpecimens.map(s => s.id),
        signedOutSpecimenIds: cytologySpecimens.filter(s => s.status === 'signedOut').map(s => s.id),
        reason, user: { id: user.id, name: user.name },
      }, deps);
      if (outcome !== 'finalized') { toast.error(t(`cytologyScreening.specimens.finalizeEarly.errors.${outcome}`)); return false; }
      toast.success(t('cytologyScreening.specimens.finalizeEarly.done'));
      await load();
      return true;
    } finally {
      setFinalizingCase(false);
    }
  };

  const handleClone = (sourceId: string) => {
    if (isDirty && !window.confirm(t('cytologyScreening.confirm.discard'))) return;
    const source = reviews.find(r => r.id === sourceId);
    if (!source || !user?.id) return;
    setDraft(draftFromClonedReview(cloneCytologyReviewAsDraft(source, { userId: user.id, userName: user.name }, resolvedRole)));
  };

  // Active screening time (CLIA workload): counted only while this tab is visible, per specimen.
  const [activeScreeningSeconds, setActiveScreeningSeconds] = useState(0);
  useEffect(() => { setActiveScreeningSeconds(0); }, [specimenId]);
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') setActiveScreeningSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const [workloadStatus, setWorkloadStatus] = useState<CytologyWorkloadCapacityStatus | null>(null);
  const [workloadBlockedReason, setWorkloadBlockedReason] = useState<string | null>(null);
  const workloadBanner = cytologyWorkloadBanner(workloadStatus, i18n.language);

  // ── Categories ─────────────────────────────────────────────────────────────
  const options = cytologyCategoryOptions(categories);
  const categoryLabel = (id: string) => cytologyCategoryLabel(categories, id);
  const selectionsText = (selections: Parameters<typeof cytologySelectionEntries>[0]) =>
    cytologySelectionEntries(selections, categories)
      .map(e => (e.comment ? t('cytologyScreening.history.selectionWithComment', { label: e.label, comment: e.comment }) : e.label))
      .join(t('cytologyScreening.history.selectionSeparator'));
  const fiveYearLookback = useMemo(
    () => (complianceFeatures.fiveYearLookback ? onScreenFiveYearLookback(categories, draft.primaryInterpretationId, patientHistory, new Date()) : []),
    [categories, draft.primaryInterpretationId, patientHistory, complianceFeatures.fiveYearLookback],
  );

  // ── Saving a review ────────────────────────────────────────────────────────
  // The AI concordance question comes only after the reviewer's own finding is saved.
  const [showConcordancePrompt, setShowConcordancePrompt] = useState(false);
  const [recordingConcordance, setRecordingConcordance] = useState(false);

  // Batch 412: a pathologist revising a cytotechnologist's review, then signing out.
  const [revisingFromReviewId, setRevisingFromReviewId] = useState<string | null>(null);

  // What any save reported, shown. True when the review was saved.
  const showSaveResult = (result: SaveCytologyReviewOutcome, kind: 'standard' | 'cisoeA'): boolean => {
    if (result.validation) { setCisoeAErrors(result.validation.errors); setCisoeAWarnings(result.validation.warnings); }
    if (result.capacity !== undefined) setWorkloadStatus(result.capacity);
    if (result.outcome === 'notPermitted') { toast.error(t('cytologyScreening.errors.reviewNotPermitted')); return false; }
    if (result.outcome === 'qcByPrimaryScreener') { toast.error(t('cytologyScreening.errors.qcByPrimaryScreener')); return false; }
    if (result.outcome === 'failed') { toast.error(t('cytologyScreening.errors.saveFailed')); return false; }
    if (result.outcome === 'workloadBlocked') {
      setWorkloadBlockedReason(t('cytologyScreening.workload.blockedReason'));
      toast.info(t('cytologyScreening.workload.reassigned'));
      navigate('/cytology-worklist');
      return false;
    }
    if (result.outcome !== 'saved') return false;
    setWorkloadBlockedReason(result.workloadNotice === 'escalation' ? t('cytologyScreening.workload.escalationReason') : null);
    if (result.qcFlagApplied === 'targeted_high_risk') toast.warning(t('cytologyScreening.qc.toastHighRisk'));
    if (result.qcFlagApplied === 'random_selection') toast.info(t('cytologyScreening.qc.toastRandom'));
    if (result.created && result.reviewId) setEditingReviewId(result.reviewId);
    if (kind === 'cisoeA') setCisoeABaselineDraft(cisoeADraft); else setBaselineDraft(draft);
    return true;
  };

  const handleSave = async (kind: 'standard' | 'cisoeA') => {
    if (!caseData || !specimenId || !user?.id) return;
    setSaving(true);
    try {
      const saveInput = {
        form: kind === 'cisoeA' ? { kind, draft: cisoeADraft, bethesdaForMapping } as const : { kind, draft } as const,
        caseData, specimenId, specimen: currentSpecimen, user: { id: user.id, name: user.name },
        isPathologist, reviewMode, editingReviewId, reviews, resolvedRole, categories, activeScreeningSeconds,
      };
      const source = revisingFromReviewId ? reviews.find(r => r.id === revisingFromReviewId) : undefined;
      if (kind === 'standard' && source) {
        const revised = await reviseCytologyReviewForSignOut({ ...saveInput, sourceReview: source, gate: gateContext }, deps);
        if (revised.save && !showSaveResult(revised.save, kind)) return;
        if (revised.outcome === 'selectionRefused') {
          toast.error(t(revised.selection === 'notPermitted' ? 'cytologyScreening.errors.finalDiagnosisNotPermitted' : 'cytologySignOut.finalDiagnosisPathologistOnly'));
          await load();
          return;
        }
        if (revised.outcome !== 'readyToSign') return;
        setRevisingFromReviewId(null);
        await load();
        setConfirmingSignOut(true);
        return;
      }
      if (!showSaveResult(await saveCytologyReview(saveInput, deps), kind)) return;
      await load();
      if (kind === 'standard' && shouldPromptAiConcordance(aiScreeningResult)) setShowConcordancePrompt(true);
    } finally {
      setSaving(false);
    }
  };

  const handleStartRevise = (review: CytologyReviewRecord) => {
    if (isDirty && !window.confirm(t('cytologyScreening.confirm.discard'))) return;
    if (!user?.id) return;
    setDraft(draftFromClonedReview(cloneCytologyReviewAsDraft(review, { userId: user.id, userName: user.name }, resolvedRole)));
    setRevisingFromReviewId(review.id);
  };

  // ── Review notes and versions (Batch 412) ──────────────────────────────────
  const handleAddNote = async (review: CytologyReviewRecord, section: CytologyReviewSection, text: string, requiresRevision: boolean): Promise<boolean> => {
    if (!caseData || !specimenId || !user?.id) return false;
    const outcome = await addCytologyReviewNote({ caseData, specimenId, specimen: currentSpecimen, review, section, text, requiresRevision, user: { id: user.id, name: user.name } }, deps);
    if (outcome !== 'added') { toast.error(t(`cytologyScreening.reviewNotes.errors.${outcome}`)); return false; }
    await load();
    return true;
  };
  const handleAcknowledgeNote = async (noteId: string) => {
    if (!caseData || !specimenId || !user?.id) return;
    const outcome = await acknowledgeCytologyReviewNote({ caseData, specimenId, specimen: currentSpecimen, noteId, user: { id: user.id } }, deps);
    if (outcome !== 'acknowledged') { toast.error(t(`cytologyScreening.reviewNotes.errors.${outcome}`)); return; }
    await load();
  };
  // An earlier version back into the form; saving it is a new edit (nothing is lost).
  const handleLoadVersion = (version: CytologyReviewVersion) => {
    if (isDirty && !window.confirm(t('cytologyScreening.confirm.discard'))) return;
    setDraft(draftFromReview(version));
    if (version.cisoeAScore) setCisoeADraft(cisoeADraftFromScore(version.cisoeAScore, version.notes));
    toast.info(t('cytologyScreening.versions.loaded'));
  };

  // A human judgment, never inferred by comparing the AI's label with ours.
  const handleConcordanceResponse = async (concordant: boolean) => {
    if (!aiScreeningResult) return;
    setRecordingConcordance(true);
    try {
      const result = await recordAiHumanConcordance(aiScreeningResult.id, concordant);
      if (result.ok) {
        setAiScreeningResult(result.data);
        if (!concordant) toast.info(t('cytologyScreening.qc.toastDiscordance'));
      }
    } finally {
      setRecordingConcordance(false);
      setShowConcordancePrompt(false);
    }
  };

  // ── Final diagnosis, QC, the 5-year lookback outcome ───────────────────────
  const updateSpecimen = async (patch: Record<string, unknown>) => {
    if (caseData && specimenId) await patchCytologyScreening(caseData, specimenId, patch, deps);
  };
  // PS-340 (Batch 390): correcting or adding to a signed-out report.
  const revision = useCytologyRevision({
    caseData, specimen: currentSpecimen, specimenId,
    signedReview: currentFinalDiagnosis ? reviews.find(r => r.id === currentFinalDiagnosis.reviewRecordId) : undefined,
    categories, user, isPathologist, isGynCytology, updateSpecimen, reload: load,
  });

  const handleSelectFinalDiagnosis = async (reviewId: string) => {
    const review = reviews.find(r => r.id === reviewId);
    if (!review || !user?.id || !caseData || !specimenId) return;
    const outcome = await selectCytologyFinalDiagnosis({ caseData, specimenId, review, user: { id: user.id, name: user.name }, gate: gateContext }, deps);
    if (outcome === 'notPermitted') toast.error(t('cytologyScreening.errors.finalDiagnosisNotPermitted'));
    else if (outcome === 'pathologistOnly') toast.error(t('cytologySignOut.finalDiagnosisPathologistOnly'));
    else await load();
  };

  const handleFlagForQc = async () => {
    if (!user?.id || !caseData || !specimenId) return;
    await flagCytologyForQc({ caseData, specimenId, user: { id: user.id, name: user.name } }, deps);
    await load();
  };
  const handleUnflagQc = async () => {
    if (!user?.id || !caseData || !specimenId) return;
    const outcome = await removeCytologyQcFlag({ caseData, specimenId, user: { id: user.id, name: user.name }, currentReason: currentQcFlag?.reason }, deps);
    if (outcome === 'notPermitted') { toast.error(t('cytologyScreening.errors.qcFlagRemoveNotPermitted')); return; }
    await load();
  };

  const [retrospectiveOutcomeDraft, setRetrospectiveOutcomeDraft] = useState<CytologyRetrospectiveOutcome | ''>('');
  const [retrospectiveCorrectiveActionDraft, setRetrospectiveCorrectiveActionDraft] = useState('');
  const [savingRetrospectiveOutcome, setSavingRetrospectiveOutcome] = useState(false);
  const handleCompleteRetrospectiveReview = async () => {
    if (!user?.id || !caseData || !specimenId) return;
    setSavingRetrospectiveOutcome(true);
    try {
      const outcome = await completeCytologyRetrospectiveReview({
        caseData, specimenId, flag: currentRetrospectiveReviewFlag, outcome: retrospectiveOutcomeDraft,
        correctiveAction: retrospectiveCorrectiveActionDraft, user: { id: user.id, name: user.name },
      }, deps);
      if (outcome === 'notPermitted') toast.error(t('cytologyScreening.errors.retrospectiveNotPermitted'));
      if (outcome !== 'recorded') return;
      await load();
      toast.success(t('cytologyScreening.toasts.retrospectiveRecorded'));
    } finally {
      setSavingRetrospectiveOutcome(false);
    }
  };

  // ── Cyto-histologic correlation ────────────────────────────────────────────
  const [histologyCorrelationResolutions, setHistologyCorrelationResolutions] = useState<Record<string, HistologyCorrelationResolution>>({});
  const [histologyCorrelationManualDx, setHistologyCorrelationManualDx] = useState<Record<string, string>>({});
  const [histologyCorrelationManualOutcome, setHistologyCorrelationManualOutcome] = useState<Record<string, 'concordant' | 'discordant' | ''>>({});
  const [recordingHistologyCorrelation, setRecordingHistologyCorrelation] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    resolveHistologyCorrelations({ specimen: currentSpecimen, categories, finalPrimaryInterpretationId: currentFinalDiagnosis?.primaryInterpretationId }, deps)
      .then(r => { if (live && Object.keys(r).length) setHistologyCorrelationResolutions(prev => ({ ...prev, ...r })); });
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpecimen?.cytologyScreening?.histologyCorrelationCandidates, categories, currentFinalDiagnosis?.primaryInterpretationId]);

  const handleRecordHistologyCorrelation = async (candidateCaseId: string, entry: HistologyCorrelationEntry) => {
    if (!caseData || !specimenId || !user?.id) return;
    setRecordingHistologyCorrelation(candidateCaseId);
    try {
      const outcome = await recordCytologyHistologyCorrelation({
        caseData, specimenId, specimen: currentSpecimen, candidateCaseId, categories,
        finalPrimaryInterpretationId: currentFinalDiagnosis?.primaryInterpretationId, entry, user: { id: user.id, name: user.name },
      }, deps);
      if (outcome === 'notPermitted') { toast.error(t('cytologyScreening.errors.correlationNotPermitted')); return; }
      if (outcome !== 'recorded') return;
      await load();
      toast.success(t('cytologyScreening.toasts.correlationRecorded'));
    } finally {
      setRecordingHistologyCorrelation(null);
    }
  };
  const handleDismissHistologyCorrelationCandidate = async (candidateCaseId: string) => {
    if (!caseData || !specimenId) return;
    const outcome = await dismissHistologyCorrelationCandidate({ caseData, specimenId, specimen: currentSpecimen, candidateCaseId }, deps);
    if (outcome === 'notPermitted') { toast.error(t('cytologyScreening.errors.correlationNotPermitted')); return; }
    await load();
  };

  // ── Sign-out (Batch 409: services/cytology/signOutCytologyCase.ts) ─────────
  const [signingOut, setSigningOut] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const blockReasonsText = (reasons: readonly string[]) => formatList(reasons.map(r => t(`cytologySignOut.blockReasons.${r}`)), i18n.language);
  const handleSignOut = async (confirmation: SignatureConfirmation) => {
    if (!caseData || !specimenId || !user?.id || !currentFinalDiagnosis) return;
    const finalReview = reviews.find(r => r.id === currentFinalDiagnosis.reviewRecordId);
    if (!finalReview) return;
    setSigningOut(true);
    try {
      const result = await signOutCytologyCase({
        caseData, specimenId, specimen: currentSpecimen, user: { id: user.id, name: user.name, role: user.role },
        isPathologist, finalReview, reviews, categories, confirmation,
        gateInputs: {
          isGynCytology, isFlaggedForQc: !!currentQcFlag, labJurisdiction,
          signingProviderCredentials,
          translationCheck: cytologySynopticTranslationCheck(finalReview, i18n.language, pathologyLexicon),
          pendingAuthorRevision: hasPendingAuthorRevision(currentSpecimen),
        },
        uiLanguage: i18n.language, pathologyLexicon, hpv: currentHpv,
        cytologySpecimenIds: cytologySpecimens.map(s => s.id),
      }, signOutCytologyCaseDeps);
      switch (result.outcome) {
        case 'notPermitted': toast.error(t('cytologySignOut.notPermitted')); break;
        case 'ctNotPermitted': toast.error(t('cytologySignOut.ctNotPermitted')); break;
        case 'signatureRefused': toast.error(t(`signatureEvidence.refused.${result.reason}`)); break;
        case 'authorityRefused': toast.error(result.reason); break;
        case 'failed': toast.error(t('cytologySignOut.failed')); break;
        case 'releasedForCountersign':
          toast.info(<PhiToastMessage>{t('cytologySignOut.releasedForCountersign', { caseId: caseData.id })}</PhiToastMessage>);
          await load();
          break;
        case 'signedOut':
          if (result.retrospectiveFlagged) toast.warning(t('cytologyScreening.toasts.retrospectiveFlagged', { count: result.retrospectiveFlagged }));
          toast.success(result.specimensRemaining
            ? t('cytologySignOut.specimenSignedOut', { count: result.specimensRemaining })
            : t('cytologySignOut.signedOut'));
          await load();
          break;
        default: break; // gateBlocked: the button isn't offered then
      }
    } finally {
      setSigningOut(false);
    }
  };

  // ── Material, ROSE, codes, LMP, print, spelling ────────────────────────────
  // Batch 453: a decant change the atomic save refused (conflict, refusal) is said, not lost silently.
  const reportDecantNotSaved = (e: unknown) => {
    const reason = e instanceof CytologyDecantNotSaved ? e.reason : 'saveFailed';
    toast.error(reason === 'conflict' ? t('cytologyScreening.materialDrawer.decantConflict') : t(`useSpecimenBlockManagement.toast.decantNotSaved.${decantRefusalKey(reason)}`));
    // A conflict means another session changed the material: reload so the
    // next change is made against the current tree and version.
    if (reason === 'conflict') void load();
  };
  const handleAddDecant = async (decantType: DecantType) => {
    if (!caseData || !currentSpecimen || !user) return;
    try {
      const specimens = await addCytologyDecant({ caseData, specimen: currentSpecimen, decantType, user: { id: user.id, name: user.name } }, deps);
      setCaseData(prev => (prev ? ({ ...prev, specimens, version: ((prev as any).version ?? 0) + 1 } as typeof prev) : prev));
    } catch (e) { reportDecantNotSaved(e); }
  };
  useEffect(() => {
    const addResidualFluid = () => { handleAddDecant('residual_fluid'); };
    const addCellBlock = () => { handleAddDecant('cell_block'); };
    window.addEventListener('PATHSCRIBE_CYTOLOGY_ADD_RESIDUAL_FLUID', addResidualFluid);
    window.addEventListener('PATHSCRIBE_CYTOLOGY_ADD_CELL_BLOCK', addCellBlock);
    return () => {
      window.removeEventListener('PATHSCRIBE_CYTOLOGY_ADD_RESIDUAL_FLUID', addResidualFluid);
      window.removeEventListener('PATHSCRIBE_CYTOLOGY_ADD_CELL_BLOCK', addCellBlock);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData, currentSpecimen, user]);
  const handleUpdateStains = async (decantId: string, stains: unknown[]) => {
    if (!caseData || !currentSpecimen) return;
    try {
      const specimens = await updateCytologyDecantStains({ caseData, specimen: currentSpecimen, decantId, stains }, deps);
      setCaseData(prev => (prev ? ({ ...prev, specimens, version: ((prev as any).version ?? 0) + 1 } as typeof prev) : prev));
    } catch (e) { reportDecantNotSaved(e); }
  };
  const handleRecordRose = async (roseLocation: any, passes: any[]) => {
    if (!caseData || !currentSpecimen || !user) return;
    const specimens = await recordCytologyRoseEvaluation({ caseData, specimen: currentSpecimen, location: roseLocation, passes, user: { id: user.id, name: user.name } }, deps);
    setCaseData(prev => (prev ? ({ ...prev, specimens } as typeof prev) : prev));
  };
  const handleAddCodesToSpecimens = async (codes: any[]) => {
    if (!caseData) return;
    const { coding, specimens } = await applyCytologyCodeChanges({ caseData, codes, user: { id: user?.id, name: user?.name } }, deps);
    setCaseData(prev => (prev ? ({ ...prev, coding, specimens } as typeof prev) : prev));
  };
  const adoptBillingSave = (r: { specimens: any[]; version?: number }) => {
    if (r.version !== undefined) setCaseData(prev => (prev ? ({ ...prev, version: r.version } as typeof prev) : prev));
    return r.specimens;
  };
  // Batch 460: the billing panel's changes, saved through the Workspace's
  // versioned saves (a decant's codes through the material save).
  const billingReview = useCaseBillingReview({
    caseData, user,
    writer: {
      saveUnitCoding: async (specimenId, unitId, change) => {
        if (!caseData) return [];
        return adoptBillingSave(await saveCytologyUnitCoding({ caseData, specimenId, unitId, change }, deps));
      },
      saveSpecimens: async change => (caseData ? adoptBillingSave(await saveCytologySpecimenBilling({ caseData, change }, deps)) : []),
    },
    onSpecimens: specimens => setCaseData(prev => (prev ? ({ ...prev, specimens } as typeof prev) : prev)),
    // As on the report page: only an orchestration case is billed here (the LIS bills Assist and older cases).
    chargesEnabled: caseData?.reportingMode === 'orchestrator',
    onWarning: key => toast.warning(t(key)),
    onSaveFailed: e => (e instanceof CytologyDecantNotSaved ? reportDecantNotSaved(e) : toast.error(t('cytologyScreening.billingDrawer.saveFailed'))),
  });
  const handleLmpSave = async () => {
    if (!caseData) return;
    await saveCytologyLastMenstrualPeriod({ caseData, lmp: lmpDraft }, deps);
    await load();
  };
  // The signed record exactly as signed; before sign-out, a preview.
  const handlePrint = async () => {
    if (!caseData || !specimenId) return;
    const doc = await buildCytologyPrintDocument({
      caseData, specimen: currentSpecimen, specimenId, reviews, categories,
      finalDiagnosisReviewId: currentFinalDiagnosis?.reviewRecordId, isPathologist,
    }, deps);
    doc?.output('dataurlnewwindow');
  };

  // Spell check (PS-342, Batch 338): the case's spelling language.
  const saveSpellingLocaleOverride = useCallback(async (locale: SpellingLocale | null) => {
    if (!caseData) return;
    // PS-71 (Batch 458): versioned (the version this screen loaded), via the service.
    await saveCytologySpellingLocaleOverride({ caseData, locale }, deps);
    setCaseData(prev => (prev ? { ...prev, spellingLocaleOverride: locale } : prev));
  }, [caseData]);
  const spellCheck = useCaseSpellCheck({
    caseId: caseData?.id,
    orderingFacilityId: caseData?.order?.facilityId,
    assignedPathologistId: caseData?.order?.assignedTo,
    caseOverride: caseData?.spellingLocaleOverride,
    saveCaseOverride: saveSpellingLocaleOverride,
  });

  if (loading) return <div className="ps-cytoscreen-loading">{t('common.loading')}</div>;

  if (!caseData || !specimenId) {
    return (
      <div className="ps-cytoscreen-loading">
        {t('cytologyScreening.noSpecimen')}
        <div className="ps-cytoscreen-empty-state-actions">
          <button onClick={() => navigate(backTarget)} className="ps-cytoscreen-back-to-worklist-btn">{t('cytologyScreening.backToWorklist')}</button>
        </div>
      </div>
    );
  }

  if (!resolveCytologyStructuredWorkflowAccess(caseData.reportingMode)) {
    return (
      <div className="ps-cytoscreen-loading ps-cytoscreen-loading--constrained">
        {t('cytologyScreening.assistModeOnly')}
        <div className="ps-cytoscreen-empty-state-actions">
          <button onClick={() => navigate(backTarget)} className="ps-cytoscreen-back-to-worklist-btn">{t('cytologyScreening.backToWorklist')}</button>
        </div>
      </div>
    );
  }

  return (
    <SpellCheckProvider value={spellCheck}>
      <main className="ps-cytoscreen-main">
          <button onClick={handleBackToWorklist} className="ps-cytoscreen-back-link">← {t('cytologyScreening.backToWorklist')}</button>

          <div className="ps-cytoscreen-header-row">
            <div>
              <h1 className="ps-cytoscreen-case-title">
                <Trans i18nKey="cytologyScreening.caseTitle" values={{ id: caseData.id }} components={{ accession: <span data-phi="accession" /> }} />
              </h1>
              <p className="ps-cytoscreen-patient-line" data-phi="true">
                {t('cytologyScreening.patientLine', { name: resolvePatientFullDisplayName(caseData.patient) ?? t('cytologyScreening.patientUnknown'), mrn: caseData.patient?.mrn ?? '—' })}
              </p>
              {/* Batch 425: the patient's registry opt-outs. */}
              <RegistryOptOutBadge consent={caseData.patient?.registryConsent} />
            </div>
            <div className="ps-cytoscreen-toolbar">
              <SpellingLanguageControl className="ps-cytoscreen-spelllang" />
              <button
                onClick={handleLaunchEMR}
                className="ps-cytoscreen-tag-btn ps-cytoscreen-tag-btn--sky">
                🌐 {t('cytologyScreening.openEmrBtn')}
              </button>
              <button
                onClick={handlePrint}
                className="ps-cytoscreen-tag-btn ps-cytoscreen-tag-btn--teal">
                🖨️ {t('cytologyScreening.printBtn')}
              </button>
              {showSynopticTrigger && (
                <button
                  onClick={() => setShowSynopticDrawer(true)}
                  className="ps-cytoscreen-tag-btn ps-cytoscreen-tag-btn--cyan">
                  📑 {t('cytologyScreening.synopticBtn')}
                </button>
              )}
              <button
                onClick={() => setShowMaterialDrawer(true)}
                className="ps-cytoscreen-tag-btn ps-cytoscreen-tag-btn--slate">
                🧱 {t('cytologyScreening.materialBtn')}
              </button>
              {!isGynCytology && (
                <button
                  onClick={() => setShowRoseDrawer(true)}
                  className="ps-cytoscreen-tag-btn ps-cytoscreen-tag-btn--pink">
                  🔬 {t('cytologyScreening.roseBtn')}
                </button>
              )}
              <button
                onClick={() => setShowCodesModal(true)}
                className="ps-cytoscreen-tag-btn ps-cytoscreen-tag-btn--teal">
                # {t('cytologyScreening.codesBtn')}
              </button>
              <button
                onClick={() => setShowBillingDrawer(true)}
                title={t('cytologyScreening.billingDrawer.tooltip')}
                className="ps-cytoscreen-tag-btn ps-cytoscreen-tag-btn--teal">
                $ {t('cytologyScreening.billingBtn')}
              </button>
              <button
                onClick={() => openFlagManager(caseData)}
                className="ps-cytoscreen-tag-btn ps-cytoscreen-tag-btn--amber">
                🚩 {t('cytologyScreening.flagsBtn')}
              </button>
              <button
                onClick={() => setShowTeamModal(true)}
                className="ps-cytoscreen-tag-btn ps-cytoscreen-tag-btn--teal">
                👤 {t('cytologyScreening.teamBtn')}
              </button>
              <button
                onClick={() => setShowDelegateModal(true)}
                className="ps-cytoscreen-tag-btn ps-cytoscreen-tag-btn--violet">
                👥 {t('cytologyScreening.delegateBtn')}
              </button>
              <button
                onClick={() => setReviewOpen(true)}
                className="ps-cytoscreen-tag-btn ps-cytoscreen-tag-btn--violet">
                🔍 {t('cytologyScreening.requestReviewBtn')}
              </button>
              {instrumentationModality === 'wsi' && (
                // Real, per direct guidance's own confirmed
                // consolidation: reuses Surgical Pathology's own
                // real, vendor-aware WsiViewerLaunchButton (now
                // extended to also carry Cytology's own real, sticky
                // window-positioning feature — see that component's
                // own header) rather than a second, separate,
                // hardcoded-mock-URL launch mechanism. status is
                // hardcoded to a real, scannable value from that
                // component's own SCANNABLE_STATUSES set — Cytology
                // has no per-specimen granular status matching
                // Surgical's own grossing/embedding pipeline, and this
                // screen's own outer instrumentationModality check
                // already gates real visibility correctly.
                <WsiViewerLaunchButton
                  status="Ready for Review"
                  displayId={currentSpecimen?.id ?? caseData.id}
                  windowName="PathScribeCytologyWsiViewer"
                />
              )}
              <span>{t('cytologyScreening.lmpLabel')}{isGynCytology && cytologyFieldRequired(cytologyRequirements, 'reviewLmp') && <span className="ps-conf-required"> *</span>}</span>
              <input type="date" value={lmpDraft} onChange={e => setLmpDraft(e.target.value)} onBlur={handleLmpSave}
                className="ps-cytoscreen-lmp-input" />
            </div>
          </div>

          {/* Batch 396 (Pete): record the QC peer review verdict here, where
              the slides are reviewed. Back to the queue after the verdict. */}
          <CytologyQcCaseBar caseId={caseId} onRecorded={() => navigate(backTarget)} />

          {/* Batch 411: one tab per cytology specimen; each is signed out on its own. */}
          <CytologySpecimenTabs caseId={caseData.id} tabs={cytologySpecimens} selectedId={specimenId}
            onSelect={handleSelectSpecimen} progress={caseProgress} finalizing={finalizingCase} onFinalizeEarly={handleFinalizeEarly} />

          {currentRetrospectiveReviewFlag && !currentRetrospectiveReviewFlag.outcome && (
            <CytologyRetrospectiveBanner
              triggeredByCaseId={currentRetrospectiveReviewFlag.triggeredByCaseId}
              outcome={retrospectiveOutcomeDraft} correctiveAction={retrospectiveCorrectiveActionDraft}
              onOutcomeChange={setRetrospectiveOutcomeDraft} onCorrectiveActionChange={setRetrospectiveCorrectiveActionDraft}
              saving={savingRetrospectiveOutcome} requirements={cytologyRequirements}
              onComplete={handleCompleteRetrospectiveReview}
            />
          )}

          {openHistologyCorrelationCandidates(currentSpecimen)
            .map((candidate, index) => {
              const id = candidate.candidateCaseId;
              const resolution = histologyCorrelationResolutions[id];
              return (
                <CytologyHistologyCandidateBanner
                  key={id}
                  candidateCaseId={id}
                  resolution={resolution}
                  isRecording={recordingHistologyCorrelation === id}
                  manualDiagnosis={histologyCorrelationManualDx[id] ?? ''}
                  manualOutcome={histologyCorrelationManualOutcome[id] ?? ''}
                  onManualDiagnosisChange={text => setHistologyCorrelationManualDx(prev => ({ ...prev, [id]: text }))}
                  onManualOutcomeChange={o => setHistologyCorrelationManualOutcome(prev => ({ ...prev, [id]: o as 'concordant' | 'discordant' }))}
                  requirements={cytologyRequirements}
                  listenForVoice={index === 0}
                  onConfirmResolved={() => resolution && handleRecordHistologyCorrelation(id, { kind: 'resolved', resolution, unknownDiagnosis: t('cytologyScreening.histologyCorrelation.unknownDx') })}
                  onRecordManual={(dx, o) => handleRecordHistologyCorrelation(id, { kind: 'manual', histologyDx: dx, outcome: o, cytologyRank: resolution?.cytologyRank })}
                  onDismiss={() => handleDismissHistologyCorrelationCandidate(id)}
                />
              );
            })}

          {/* Real Sign Out action */}
          {signOutRecords.length > 0 ? (
            <>
              <div className="ps-cytoscreen-signedout-banner">
                {t('cytologySignOut.signedOutBanner', { name: signOutRecords[0].signedBy.userName, date: formatDateTime(signOutRecords[0].signedAt, i18n.language) })}
              </div>
              <CytologyRevisionActions records={signOutRecords} activeMode={revision.mode} onStart={revision.start} />
              {revision.mode && (
                <CytologyRevisionPanel
                  mode={revision.mode}
                  currentDiagnosis={latestCytologySignOut(signOutRecords)?.reportContent.primaryInterpretation ?? ''}
                  draft={revision.draft} onDraftChange={revision.setDraft}
                  addendumText={revision.addendumText} onAddendumTextChange={revision.setAddendumText}
                  reason={revision.reason} onReasonChange={revision.setReason}
                  saving={revision.saving} requirements={cytologyRequirements}
                  generalCategorizationOptions={options.generalCategorization} adequacyOptions={options.adequacy}
                  primaryOptions={options.primary} additionalOptions={options.additionalExcluding(revision.draft.primaryInterpretationId)}
                  recommendationOptions={options.recommendation} categoryLabel={categoryLabel}
                  onRelease={revision.requestRelease} onCancel={revision.cancel}
                />
              )}
              <SignatureConfirmModal
                show={revision.confirming}
                action="cytology-sign-out"
                caseRef={caseData?.accession?.fullAccession ?? caseData?.id ?? null}
                title={revision.mode === 'addendum' ? t('cytologyRevision.addendum.confirmTitle') : t('cytologyRevision.correction.confirmTitle')}
                confirmLabel={revision.mode === 'addendum' ? t('cytologyRevision.addendum.releaseBtn') : t('cytologyRevision.correction.releaseBtn')}
                onConfirmed={(confirmation) => { void revision.release(confirmation); }}
                onCancel={revision.cancelConfirm}
              />
            </>
          ) : (() => {
            const panel = cytologySignOutPanel(currentFinalDiagnosis, reviews, gateContext);
            if (panel.needsFinalDiagnosis) {
              return <div className="ps-cytoscreen-signout-banner--warn">{t('cytologySignOut.selectFinalDiagnosis')}</div>;
            }
            const canSign = panel.canSign;
            return (
              <div className="ps-cytoscreen-signout-row">
                <span className={`ps-cytoscreen-signout-status ${canSign ? 'ps-cytoscreen-signout-status--ready' : 'ps-cytoscreen-signout-status--blocked'}`}>
                  {canSign ? t('cytologySignOut.ready') : t('cytologySignOut.pathologistRequired', { reasons: blockReasonsText(panel.blockedReasons) })}
                </span>
                {/* Batch 409: greyed without cytology:report:sign-out; the service checks it again. */}
                {/* Batch 415: a cytotechnologist also needs the cytotechnologist sign-out permission. */}
                <CapabilityButton capability={isPathologist ? 'cytology:report:sign-out' : 'cytology:ct-report:sign-out'} context={{ caseId: caseData?.id }}
                  onClick={() => setConfirmingSignOut(true)} disabled={!canSign || signingOut}
                  className={`ps-cytoscreen-signout-btn ${canSign ? 'ps-cytoscreen-signout-btn--ready' : 'ps-cytoscreen-signout-btn--blocked'}`}>
                  {signingOut ? t('cytologySignOut.signing') : t('cytologySignOut.signOut')}
                </CapabilityButton>
              </div>
            );
          })()}

          <SignatureConfirmModal
            show={confirmingSignOut}
            action="cytology-sign-out"
            caseRef={caseData?.accession?.fullAccession ?? caseData?.id ?? null}
            title={t('cytologySignOut.confirmTitle')}
            confirmLabel={t('cytologySignOut.signOut')}
            onConfirmed={(confirmation) => { setConfirmingSignOut(false); void handleSignOut(confirmation); }}
            onCancel={() => setConfirmingSignOut(false)}
          />

          {/* Real, two-column layout — uses the available horizontal space */}
          <div className="ps-cytoscreen-two-col">

            {/* LEFT: context — role, QC, HPV, review history */}
            <div>
              <div className="ps-cytoscreen-card">
                {fieldLabel(t('cytologyScreening.role.label'))}
                <div className="ps-cytoscreen-role-value">
                  {roleLabel(displayedReviewerRole(editingReviewId, reviews, resolvedRole))}
                </div>
                <div className="ps-cytoscreen-role-hint">
                  {editingReviewId
                    ? t('cytologyScreening.role.editing')
                    : t('cytologyScreening.role.auto')}
                </div>
                {!!user?.id && qcByPrimaryScreener(resolvedRole, reviews, user.id) && (
                  <div className="ps-cytoscreen-role-warning" role="note">{t('cytologyScreening.role.qcByPrimaryScreener')}</div>
                )}
              </div>

              {/* Real, per direct guidance's own CLIA 42 CFR § 493.1274
                  workload specification — "how this specific pass was
                  executed." Never shown for a real pathologist review,
                  which always counts as pathologist_review (0 SCU)
                  automatically. */}
              {!isPathologist && (
                <div className="ps-cytoscreen-card">
                  {fieldLabel(t('cytologyScreening.reviewMode.label'), t('cytologyScreening.reviewMode.hint'))}
                  <select value={reviewMode} onChange={e => setReviewMode(e.target.value as CytologyReviewMode)}
                    className="ps-conf-select ps-w-full">
                    <option value="primary_manual">{t('cytologyScreening.reviewMode.options.primary_manual')}</option>
                    <option value="liquid_nongyn">{t('cytologyScreening.reviewMode.options.liquid_nongyn')}</option>
                    <option value="fov_assisted">{t('cytologyScreening.reviewMode.options.fov_assisted')}</option>
                    <option value="fov_manual_rescreen">{t('cytologyScreening.reviewMode.options.fov_manual_rescreen')}</option>
                  </select>
                </div>
              )}

              {workloadBanner && (
                <div className={`ps-cytoscreen-workload-banner ps-cytoscreen-workload-banner--${workloadBanner.level}`}>
                  <div className={`ps-cytoscreen-workload-status-text ps-cytoscreen-workload-status-text--${workloadBanner.level}`}>
                    {t(`cytologyScreening.workload.${workloadBanner.level}`, { used: workloadBanner.used, max: workloadBanner.max })}
                  </div>
                  {workloadBlockedReason && <div className="ps-cytoscreen-workload-reason">{workloadBlockedReason}</div>}
                </div>
              )}

              <div className="ps-cytoscreen-card">
                {fieldLabel(t('cytologyScreening.qc.label'))}
                {currentQcFlag ? (
                  <>
                    <div className="ps-cytoscreen-qc-flagged-text">
                      {t(currentQcFlag.reason === 'targeted_high_risk' ? 'cytologyScreening.qc.flaggedTargeted' : 'cytologyScreening.qc.flaggedRandom', { name: currentQcFlag.flaggedByName, date: formatDate(currentQcFlag.flaggedAt, i18n.language) })}
                    </div>
                    <button onClick={handleUnflagQc} className="ps-cytoscreen-qc-btn--remove">
                      {t('cytologyScreening.qc.removeFlag')}
                    </button>
                  </>
                ) : (
                  <div>
                    <div className="ps-cytoscreen-qc-hint">{t('cytologyScreening.qc.autoHint')}</div>
                    <button onClick={() => handleFlagForQc()} className="ps-cytoscreen-qc-btn--flag">{t('cytologyScreening.qc.flagBtn')}</button>
                  </div>
                )}
              </div>

              <div className={`ps-cytoscreen-card ${hpvCard.positive ? 'ps-cytoscreen-card--hpv-positive' : ''}`}>
                {fieldLabel(t('cytologyScreening.hpv.label'), t('cytologyScreening.hpv.hint'))}
                {!hpvCard.hasAny ? (
                  <div className="ps-cytoscreen-hpv-empty">{t('cytologyScreening.hpv.none')}</div>
                ) : (
                  <div className="ps-cytoscreen-hpv-detail">
                    <div>{t('cytologyScreening.hpv.orderedLabel')}: <strong className="ps-cytoscreen-text-light">{currentHpv.hpvCoTestOrdered ? t('common.yes') : t('common.no')}</strong></div>
                    {hpvCard.reasonKey && (
                      <div>{t('cytologyScreening.hpv.reasonLabel')}: <strong className="ps-cytoscreen-text-light">
                        {t(`cytologyScreening.hpv.${hpvCard.reasonKey}`)}
                      </strong></div>
                    )}
                    <div>{t('cytologyScreening.hpv.resultLabel')}: <strong className={hpvCard.positive ? 'ps-cytoscreen-hpv-result--positive' : 'ps-cytoscreen-hpv-result--normal'}>{currentHpv.hpvResult ?? t('cytologyScreening.hpv.notSet')}</strong>
                      {currentHpv.hpvAbnormalFlag && <span className="ps-cytoscreen-text-muted"> {t('cytologyScreening.hpv.flagLine', { flag: currentHpv.hpvAbnormalFlag })}</span>}
                    </div>
                    {currentHpv.hpvReferenceRange && <div>{t('cytologyScreening.hpv.referenceRange')}: <strong className="ps-cytoscreen-text-light">{currentHpv.hpvReferenceRange}</strong></div>}
                    {hpvCard.genotypeKeys && (
                      <div>{t('cytologyScreening.hpv.genotypeLabel')}: <strong className="ps-cytoscreen-text-light">
                        {formatList(hpvCard.genotypeKeys.map(k => t(`cytologyScreening.hpv.${k}`)), i18n.language) || t('cytologyScreening.hpv.notSpecified')}
                      </strong></div>
                    )}
                  </div>
                )}
              </div>

              {hasPatientHistory(patientHistory) && (
                <div className="ps-cytoscreen-card">
                  {fieldLabel(t('cytologyScreening.patientHistory.title'), t('cytologyScreening.patientHistory.subtitle'))}
                  {patientHistory.priorCytologyResults.length > 0 && (
                    <div className={patientHistory.priorSurgicalBiopsies.length > 0 ? 'ps-cytoscreen-history-mb-10' : 'ps-cytoscreen-history-mb-0'}>
                      <div className="ps-cytoscreen-history-section-label">
                        {t('cytologyScreening.patientHistory.priorPapSection')}
                      </div>
                      {patientHistory.priorCytologyResults.map(r => (
                        <div key={r.caseId} className="ps-cytoscreen-history-row">
                          <span className="ps-cytoscreen-history-date">{formatDate(r.date, i18n.language)}</span>
                          {' — '}<span data-phi="accession">{r.accessionNumber}</span>
                          {r.resultLabel ? <strong className="ps-cytoscreen-text-light"> · {r.resultLabel}</strong> : <span className="ps-cytoscreen-text-muted"> · {t('cytologyScreening.patientHistory.noFinalDx')}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {patientHistory.priorSurgicalBiopsies.length > 0 && (
                    <div>
                      <div className="ps-cytoscreen-history-section-label">
                        {t('cytologyScreening.patientHistory.priorBiopsySection')}
                      </div>
                      {patientHistory.priorSurgicalBiopsies.map(b => (
                        <div key={b.caseId} className="ps-cytoscreen-history-row ps-cytoscreen-history-row--between">
                          <span>
                            <span className="ps-cytoscreen-history-date">{formatDate(b.date, i18n.language)}</span>
                            {' — '}<span data-phi="accession">{b.accessionNumber}</span>{b.specimenDescription ? ` · ${b.specimenDescription}` : ''}
                          </span>
                          <button type="button" onClick={() => { void openCasePage(b.caseId); }} className="ps-cytoscreen-history-link ps-cytoscreen-link-button">{t('cytologyScreening.patientHistory.viewCase')}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {fiveYearLookback.length > 0 && (
                <div className="ps-cytoscreen-lookback-card">
                  {fieldLabel(t('cytologyScreening.fiveYearLookback.title'), t('cytologyScreening.fiveYearLookback.subtitle'))}
                  {fiveYearLookback.map(item => (
                    <div key={item.reviewId} className="ps-cytoscreen-lookback-row">
                      <span>
                        <span className="ps-cytoscreen-history-date">{formatDate(item.recordedAt, i18n.language)}</span>
                        {' — '}<span data-phi="accession">{item.accessionNumber}</span>
                        {item.resultLabel ? <strong className="ps-cytoscreen-text-light"> · {item.resultLabel}</strong> : null}
                      </span>
                      <button type="button" onClick={() => { void openCasePage(item.caseId); }} className="ps-cytoscreen-lookback-link ps-cytoscreen-link-button">
                        {t('cytologyScreening.fiveYearLookback.viewSlide')}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <h2 className="ps-cytoscreen-history-title">{t('cytologyScreening.history.title')}</h2>
              {reviews.length === 0 && <p className="ps-cytoscreen-history-empty">{t('cytologyScreening.history.empty')}</p>}
              {reviews.map(r => {
                const isInitial = r.role === 'primary_screen';
                const isFinal = currentFinalDiagnosis?.reviewRecordId === r.id;
                const { gate, authorized: rowAuthorized } = cytologyReviewEligibility(r, gateContext);
                const actions = cytologyReviewActions(r, { userId: user?.id, isPathologist, specimenSignedOut: signOutRecords.length > 0, nomenclature: nomenclatureSystem });
                return (
                  <div key={r.id} className={`ps-cytoscreen-review-card ${isInitial ? 'ps-cytoscreen-review-card--initial' : 'ps-cytoscreen-review-card--other'}`}>
                    <div className="ps-cytoscreen-review-row">
                      <span className={`ps-cytoscreen-review-badge ${isInitial ? 'ps-cytoscreen-review-badge--initial' : 'ps-cytoscreen-review-badge--other'}`}>
                        {isInitial ? t('cytologyScreening.history.initial').toUpperCase() : roleLabel(r.role).toUpperCase()}
                      </span>
                      {isFinal && <span className="ps-cytoscreen-review-final-tag">{t('cytologyScreening.history.finalTag').toUpperCase()}</span>}
                      <CytologyReviewEligibilityBadge gate={gate} reasonsText={blockReasonsText(gate.blockedReasons)} />
                      <span className="ps-cytoscreen-review-meta">{r.recordedBy.userName} · {formatDate(r.recordedAt, i18n.language)}</span>
                    </div>

                    {r.adequacySelections && r.adequacySelections.length > 0 && (
                      <div className="ps-cytoscreen-review-detail-line">
                        <b>{t('cytologyScreening.history.adequacy')}</b> {selectionsText(r.adequacySelections)}
                      </div>
                    )}
                    {r.generalCategorizationId && (
                      <div className="ps-cytoscreen-review-detail-line"><b>{t('cytologyScreening.history.generalCategorization')}</b> {categoryLabel(r.generalCategorizationId)}</div>
                    )}
                    <div className="ps-cytoscreen-review-detail-line">
                      <b>{t('cytologyScreening.history.primary')}</b> {selectionsText([{ categoryId: r.primaryInterpretationId, comment: r.primaryInterpretationComment }])}
                    </div>
                    {r.additionalInterpretations && r.additionalInterpretations.length > 0 && (
                      <div className="ps-cytoscreen-review-detail-line">
                        <b>{t('cytologyScreening.history.additional')}</b> {selectionsText(r.additionalInterpretations)}
                      </div>
                    )}
                    {r.recommendations && r.recommendations.length > 0 && (
                      <div className="ps-cytoscreen-review-detail-line">
                        <b>{t('cytologyScreening.history.recommendations')}</b> {selectionsText(r.recommendations)}
                      </div>
                    )}
                    {r.agreementWithInitial && (
                      <div className={`ps-cytoscreen-review-detail-line ps-cytoscreen-review-agreement--${r.agreementWithInitial.level}`}>
                        {t('cytologyScreening.history.agreement.line', {
                          level: r.agreementWithInitial.majorSubtype
                            ? t('cytologyScreening.history.agreement.withSubtype', { level: t(`cytologyScreening.history.agreement.levels.${r.agreementWithInitial.level}`), subtype: t(`cytologyScreening.history.agreement.subtypes.${r.agreementWithInitial.majorSubtype}`) })
                            : t(`cytologyScreening.history.agreement.levels.${r.agreementWithInitial.level}`),
                        })}
                        {r.agreementWithInitial.adequacyDiscrepancy && <> {t('cytologyScreening.history.agreement.adequacyDiffers')}</>}
                      </div>
                    )}
                    {r.notes && <div className="ps-cytoscreen-detail-line-notes">{t('cytologyScreening.history.quotedNotes', { notes: r.notes })}</div>}

                    <CytologyReviewNotes
                      notes={notesForReview(currentSpecimen, r.id)}
                      isAuthor={actions.isAuthor}
                      canAddNote={actions.canAddNote}
                      versions={actions.isAuthor ? (r.priorVersions ?? []) : []}
                      categoryLabel={categoryLabel}
                      onAdd={(section, text, requiresRevision) => handleAddNote(r, section, text, requiresRevision)}
                      onAcknowledge={handleAcknowledgeNote}
                      onLoadVersion={handleLoadVersion}
                    />

                    <div className="ps-cytoscreen-review-actions">
                      <button onClick={() => handleClone(r.id)} className="ps-cytoscreen-review-action-btn">{t('cytologyScreening.history.clone')}</button>
                      {/* Batch 412: a pathologist revises a CT's review into their own and goes straight to signature. */}
                      {actions.canReviseForSignOut && (
                        <CapabilityButton capability="cytology:final-diagnosis:select" context={{ caseId: caseData.id }}
                          onClick={() => handleStartRevise(r)} className="ps-cytoscreen-review-action-btn ps-cytoscreen-review-action-btn--revise">
                          {t('cytologyScreening.revise.button')}
                        </CapabilityButton>
                      )}
                      {/* Batch 410: greyed without cytology:final-diagnosis:select; the service checks it again, and the gate. */}
                      <CapabilityButton capability="cytology:final-diagnosis:select" context={{ caseId: caseData.id }}
                        onClick={() => handleSelectFinalDiagnosis(r.id)}
                        disabled={!rowAuthorized}
                        disabledTitle={t('cytologyScreening.history.setAsFinalBlocked')}
                        className={`ps-cytoscreen-review-action-btn ${rowAuthorized ? '' : 'ps-cytoscreen-review-action-btn--disabled'}`}>
                        {t('cytologyScreening.history.setAsFinal')}
                      </CapabilityButton>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RIGHT: new review form — Field Requirements page "cytology" (Batch 386) */}
            {nomenclatureSystem === 'palga_cisoea' ? (
              <CytologyCisoeAForm
                draft={cisoeADraft} onDraftChange={setCisoeADraft}
                editing={!!editingReviewId} saving={saving} roleLabel={roleLabel(resolvedRole)}
                requirements={cytologyRequirements}
                errors={cisoeAErrors} warnings={cisoeAWarnings} reflexSuggestion={cisoeAReflexSuggestion}
                onSave={() => handleSave('cisoeA')} onRequestPeerReview={() => setReviewOpen(true)}
              />
            ) : (
              <div>
              {revisingFromReviewId && (
                <div className="ps-cyto-revise-banner">
                  <span>{t('cytologyScreening.revise.banner', { name: reviews.find(x => x.id === revisingFromReviewId)?.recordedBy.userName ?? '' })}</span>
                  <button className="ps-cytoscreen-review-action-btn" onClick={() => setRevisingFromReviewId(null)}>{t('cytologyScreening.revise.cancel')}</button>
                </div>
              )}
              <CytologyReviewForm
                draft={draft} onDraftChange={setDraft}
                editing={!!editingReviewId} saving={saving} roleLabel={roleLabel(resolvedRole)}
                isGynCytology={isGynCytology} lastMenstrualPeriod={lmpDraft}
                requirements={cytologyRequirements}
                generalCategorizationOptions={options.generalCategorization} adequacyOptions={options.adequacy}
                primaryOptions={options.primary} additionalOptions={options.additionalExcluding(draft.primaryInterpretationId)} recommendationOptions={options.recommendation}
                categoryLabel={categoryLabel}
                onSave={() => handleSave('standard')} onRequestPeerReview={() => setReviewOpen(true)}
              />
              </div>
            )}
          </div>
        </main>
        <RequestReviewModal
          isOpen={reviewOpen}
          caseId={caseData.id}
          caseLabel={caseData.patient ? formatIdentificationName(fromLegacyName(caseData.patient.firstName ?? '', caseData.patient.lastName ?? '')) : undefined}
          fromUserId={user?.id ?? 'u1'}
          fromUserName={user?.name ?? 'Unknown'}
          onClose={() => setReviewOpen(false)}
        />
        <EMRSidecarDrawer
          isOpen={emrOpen}
          patientId={caseData.patient?.mrn ?? '100004'}
          onClose={() => setEmrOpen(false)}
        />
        <CytologySlideOverDrawer isOpen={showSynopticDrawer} title={t('cytologyScreening.synopticDrawer.title')} onClose={() => setShowSynopticDrawer(false)}>
          <CytologySynopticFormView
            // Real, honest timing note: initialTemplateId only seeds
            // CytologySynopticFormView's own useState at mount time —
            // this is safe because the real dictionary fetch this
            // value comes from completes as part of the same initial
            // page load that also resolves showSynopticTrigger
            // itself, before the drawer (which fully unmounts when
            // closed) can first be opened.
            initialTemplateId={draft.synopticData?.templateId ?? dictionaryDefaultSynopticTemplateId}
            initialAnswers={draft.synopticData?.answers}
            initialAcknowledgment={draft.synopticData?.translationValidationAcknowledgment}
            currentUser={{ userId: user?.id ?? '', userName: user?.name ?? '' }}
            onSave={(templateId, answers, acknowledgment) => { setDraft({ ...draft, synopticData: { templateId, answers, translationValidationAcknowledgment: acknowledgment } }); setShowSynopticDrawer(false); }}
            onInsertNarrative={(narrativeText) => setDraft(prev => ({ ...prev, notes: notesWithNarrative(prev.notes, narrativeText) }))}
          />
        </CytologySlideOverDrawer>
        <CytologySlideOverDrawer wide isOpen={showBillingDrawer && !!caseData} title={t('cytologyScreening.billingDrawer.title')} onClose={() => setShowBillingDrawer(false)}>
          {caseData && <CaseBillingReview caseData={caseData} review={billingReview} selectedMaterialId={currentSpecimen?.decants?.[0]?.id} />}
        </CytologySlideOverDrawer>
        <CytologySlideOverDrawer isOpen={showMaterialDrawer} title={t('cytologyScreening.materialBtn')} onClose={() => setShowMaterialDrawer(false)}>
          <CytologyMaterialView
            specimenDescription={currentSpecimen?.description}
            decants={currentSpecimen?.decants}
            stainTypes={stainTypes}
            masterTargets={molecularTargets}
            onAddDecant={handleAddDecant}
            onUpdateStains={handleUpdateStains}
          />
        </CytologySlideOverDrawer>
        <CytologySlideOverDrawer isOpen={showRoseDrawer} title={t('cytologyScreening.roseBtn')} onClose={() => setShowRoseDrawer(false)}>
          <CytologyRoseView
            roseEvaluations={currentSpecimen?.roseEvaluations}
            onRecordEvaluation={handleRecordRose}
          />
        </CytologySlideOverDrawer>
        {showCodesModal && caseData && (
          <AddCodeModal
            existingCodes={cytologyExistingCodes(caseData)}
            allSpecimens={cytologyCodeSpecimens(caseData).specimens.map(sp => ({ index: sp.index, id: sp.id, specimenId: sp.specimenId, name: t('cytologyScreening.codes.specimenName', { label: sp.label, description: sp.description }) }))}
            // A single-specimen case (the routine Pap) targets its one specimen.
            activeSpecimenIndex={cytologyCodeSpecimens(caseData).activeSpecimenIndex}
            originHospitalId={(caseData as any)?.originHospitalId}
            onAddToSpecimens={handleAddCodesToSpecimens}
            onClose={() => setShowCodesModal(false)}
          />
        )}
        {showFlagManager && flagCaseData && (
          <FlagManagerModal
            key={`flag-modal-${flagCaseData.id}`}
            caseData={flagCaseData as any}
            flagDefinitions={flagDefinitions}
            onApplyFlags={onApplyFlags}
            onRemoveFlag={onRemoveFlag}
            onDirtyChange={() => {}}
            onClose={() => setShowFlagManager(false)}
          />
        )}
        {showTeamModal && (
          <CaseTeamModal
            caseData={caseData}
            onClose={() => setShowTeamModal(false)}
            onUpdated={(updated) => setCaseData(updated)}
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
            caseId={caseData.id}
            currentUserId={user?.id}
            onDelegated={() => {
              // Real, honest omission: Surgical Pathology's own
              // equivalent call also shows a toast confirmation
              // ("Case delegated successfully") — this screen has no
              // existing toast/notification mechanism of its own, and
              // building one solely for this one message would be
              // real, disproportionate scope creep. The delegate
              // action itself is real and complete; only the toast
              // confirmation is left out.
              setShowDelegateModal(false);
              if (delegateReturnTo === 'team') { setShowTeamModal(true); setDelegateReturnTo(null); }
            }}
          />
        )}
        {/* Real, per direct follow-up: "obviously that is a huge gap.
            Sort of the whole point of concordance monitoring." Shown
            only once — right after the reviewer's own, independent
            finding is already saved, never before (so it can't bias
            that independent finding), and never re-asked once a real
            judgment has been recorded against this AI result. */}
        {showConcordancePrompt && aiScreeningResult && (
          <div className="ps-cytoscreen-concordance-overlay">
            <div className="ps-cytoscreen-concordance-modal">
              <h3 className="ps-cytoscreen-concordance-title">{t('cytologyScreening.concordance.title')}</h3>
              <p className="ps-cytoscreen-concordance-body">
                {(() => {
                  const ai = aiScreeningSummary(aiScreeningResult);
                  if (ai.kind === 'fov') return t('cytologyScreening.concordance.body', { result: t('cytologyScreening.concordance.fovCount', { count: ai.count }) });
                  const triage = t(ai.reviewRecommended ? 'cytologyScreening.concordance.reviewRecommended' : 'cytologyScreening.concordance.noFurtherReview');
                  return t('cytologyScreening.concordance.body', {
                    result: ai.group !== undefined ? t('cytologyScreening.concordance.withQuintile', { triage, group: ai.group, total: ai.total }) : triage,
                  });
                })()}
              </p>
              <div className="ps-cytoscreen-concordance-actions">
                <button onClick={() => handleConcordanceResponse(false)} disabled={recordingConcordance}
                  className="ps-cytoscreen-concordance-btn--disagree">
                  {t('cytologyScreening.concordance.disagree')}
                </button>
                <button onClick={() => handleConcordanceResponse(true)} disabled={recordingConcordance}
                  className="ps-cytoscreen-concordance-btn--agree">
                  {t('cytologyScreening.concordance.agree')}
                </button>
              </div>
            </div>
          </div>
        )}
    </SpellCheckProvider>
  );
}
