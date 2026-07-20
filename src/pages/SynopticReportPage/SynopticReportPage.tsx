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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import AddSynopticModal       from './components/AddSynopticModal';
import SpecimenEditModal      from './modals/SpecimenEditModal';
import AddOrdersModal, { type OrderTab } from './modals/AddOrdersModal';
import NavBar             from '@/components/NavBar/NavBar';
import HeaderBar          from './components/HeaderBar';
import Sidebar            from './components/Sidebar';
import MaterialTreePanel  from './components/MaterialTreePanel';
import LeftReportPanel    from './components/LeftReportPanel';
import { AmendmentStatusBanner } from './components/AmendmentStatusBanner';
import { AmendmentDraftBanner } from './components/AmendmentDraftBanner';
import RightSynopticPanel, { type RightSynopticPanelHandle, type AiSuggestion, type MissingRequiredField, type ReviewField } from './components/RightSynopticPanel';
import BottomActionBar    from './components/BottomActionBar';

import AmendmentModal        from './modals/AmendmentModal';
import type { VersionHistoryEntry, FieldOverride } from './modals/AmendmentModal';
import { CaseCommentModal }   from '../Synoptic/Comments/CaseCommentModal';
import PatientHistoryModal    from '../../components/PatientHistory/PatientHistoryModal';
import FlagManagerModal       from '../../components/Flags/FlagManagerModal';
import { AddCodeModal }       from '../Synoptic/Codes/AddCodeModal';
import { ReportCommentModal } from '../Synoptic/Comments/ReportCommentModal';
import CaseSignOutModal      from './modals/CaseSignOutModal';
import { DiscordanceReconciliationModal } from './modals/DiscordanceReconciliationModal';
import { CopilotReportViewModal } from './modals/CopilotReportViewModal';
import type { CopilotReportInstance } from './modals/CopilotReportViewModal';
import FinalizeSynopticModal from './modals/FinalizeSynopticModal';
import LogoutWarningModal    from './modals/LogoutWarningModal';
import UnsavedWarningModal   from './modals/UnsavedWarningModal';

import { useSynopticFinalize } from '../Synoptic/useSynopticFinalize';
import { useSynopticModals }   from '../Synoptic/useSynopticModals';
import { useSynopticToast }    from '../Synoptic/useSynopticToast';
import { useSynopticFlags }    from '../Synoptic/useSynopticFlags';
import { SaveToast }           from '../Synoptic/UI/SaveToast';

import { caseRouter } from '@/services/cases/CaseRouter';
import { priorityService } from '@/services';
import { intraoperativeService, discordanceService } from '@/services';
import { amendmentService, reportVersionService } from '@/services';
import { lisAmendmentNoticeService, messageService } from '@/services';
import type { NotificationMethod } from '@/types/reports/AmendmentRecord';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import { deficiencyTypeService, resolutionTypeService } from '@/services';
import type { SpecimenDeficiency, DeficiencyType, ResolutionType } from '@/services/deficiencies/IDeficiencyService';
import { DeficiencyHistoryModal } from './modals/DeficiencyHistoryModal';
import { BlockStainEditorModal } from './modals/BlockStainEditorModal';
import type { CaseComment } from '@/types/case/CaseComment';
import { specimenDeficiencyService } from '@/services';
import { useSpecimenDictionary } from '@/components/Config/System/useSpecimenDictionary';
import { FixativeTimeGateModal, type FixativeGateSpecimen, type FixativeResolution } from './modals/FixativeTimeGateModal';
import { flagService }    from '@/services';
import type { Flag }      from '@/services/flags/IFlagService';
import SynopticSidebar    from '../../components/Synoptic/SynopticSidebar';
import { useDirtyState } from '@/contexts/DirtyStateContext';
import { useLogout } from '@/hooks/useLogout';
import '@/pathscribe.css';

import type { Case, SynopticReportInstance, ProtocolChange } from '@/types/case/Case';
import type { CaseStatus } from '@/types/case/CaseStatus';
import { AiReviewModal }  from './modals/AiReviewModal';
import { DelegateModal }  from '../Synoptic/Delegate/DelegateModal';
import CaseTeamModal            from './modals/CaseTeamModal';
import { PreFinalisationModal, type SynopticForReview } from './modals/PreFinalisationModal';
import { getFieldLabel, type ReportingStandard } from '@/utils/synopticFieldLabels';
import { getTemplate } from '@/services/templates/templateService';
import { ProtocolChangeModal }     from './modals/ProtocolChangeModal';
// ProtocolChange moved to Case.ts — see comment there. (ProtocolChangeModal.tsx
// still re-exports it for backward compat, but importing it from its real
// home directly here, alongside Case/SynopticReportInstance below.)
import { mockActionRegistryService } from '@/services/actionRegistry/mockActionRegistryService';
import { useAuditLog } from '@/components/Audit/useAuditLog';

// ── Orchestrator ───────────────────────────────────────────────
import OrchestratorSectionEditor, { textToHtml } from './components/OrchestratorSectionEditor';
import type { OrchestratorSection } from './components/OrchestratorSectionEditor';
import ReportPreviewRenderer, { getInstitution, buildRenderScope } from '@/pages/ReportPreview/ReportPreviewRenderer';
import SequencerPanel from './components/SequencerPanel';
import { OrchestratorEngine } from '@/orchestrator/orchestratorEngine';
import type { OrchestratorCallbacks } from '@/orchestrator/orchestratorEngine';
import { buildContext, resolveAnswers } from '@/orchestrator/contextBuilder';
import type { StructuredContext } from '@/orchestrator/contextBuilder';
import { aiBehaviorService } from '@/services';

// ─── Shared overlay style (passed to all modals) ──────────────
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.6)',
  zIndex: 25000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

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
const REPORT_PDF_ENDPOINT =
  (import.meta as any).env?.VITE_REPORT_PDF_ENDPOINT ?? 'http://localhost:8080/';

// ── AI Synthesis Status — Gatekeeper Badge model (see Dr. Carter's review,
// applied in SynopticReportPage below). 'none' = no AI suggestions exist
// yet for this case; 'draft-ready' = no Tier 1 field is under threshold;
// 'review-required' = at least one Tier 1 field is under threshold and
// flaggedFieldId/flaggedFieldConfidence identify which one for "unpacking."
export interface AiSynthesisStatus {
  state: 'none' | 'draft-ready' | 'review-required';
  overallConfidence?:      number; // informational only — never drives `state`
  flaggedFieldId?:          string;
  flaggedFieldConfidence?:  number;
}

const SynopticReportPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const { user: signingUser } = useAuth();
  const { log }   = useAuditLog();
  const navigate   = useNavigate();
  const location   = useLocation();
  const handleLogout = useLogout();

  // ── Worklist state ─────────────────────────────────────────
  const routerWorklistIds: string[] = (location.state as any)?.worklistCaseIds ?? [];

  // Track whether this case was opened from Search or Worklist.
  // sessionStorage key is set by SearchPage / WorklistTable before navigation.
  const navSource: 'search' | 'worklist' = React.useMemo(() => {
    return sessionStorage.getItem('pathscribe:navFrom') === 'search' ? 'search' : 'worklist';
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const backPath = navSource === 'search' ? '/search' : '/worklist';

  // ── Case data ──────────────────────────────────────────────
  const [caseData, setCaseData]     = useState<Case | null>(null);

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
    mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.SYNOPTIC);
    return () => { mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); };
  }, []);

  const [isLoaded, setIsLoaded]     = useState(false);
  const [caseNotFound, setCaseNotFound] = useState(false);
  const [activeTab, setActiveTab]       = useState('tumor');
  const { isDirty: hasUnsavedData, setDirty: setHasUnsavedData, pendingPath, confirmNavigate: confirmContextNavigate, cancelNavigate: cancelContextNavigate } = useDirtyState();
  const [dirtySections, setDirtySections] = useState<Set<string>>(new Set());

  const markDirty = React.useCallback((section: string) => {
    setHasUnsavedData(true);
    setDirtySections(prev => new Set(prev).add(section));
  }, [setHasUnsavedData]);

  const clearDirty = React.useCallback(() => {
    setHasUnsavedData(false);
    setDirtySections(new Set());
  }, [setHasUnsavedData]);
  const [activeSpecimenId, setActiveSpecimenId] = useState<string>('');
  const [showCaseCommentModal, setShowCaseCommentModal] = useState(false);
  const [showSpecimenCommentModal, setShowSpecimenCommentModal] = useState(false);
  const [activeSpecimenCommentId, setActiveSpecimenCommentId] = useState<string>('');
  const caseComments: CaseComment[] = (caseData as any)?.order?.caseComments ?? [];
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

  // ── Fixation-time signout gate ──────────────────────────────────────────────
  const { dictionary: specimenDictionary } = useSpecimenDictionary();
  const [fixativeGateSpecimens, setFixativeGateSpecimens] = useState<FixativeGateSpecimen[] | null>(null);
  // Remembers what finalizeCase was originally called with, so once the
  // gate is resolved we can retry with the exact same arguments rather
  // than losing e.g. which synoptic instances were excluded.
  const [pendingFinalizeArgs, setPendingFinalizeArgs] = useState<string[]>([]);

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
  const handleChangePriority = useCallback((newPriority: string) => {
    if (!caseData?.id) return;
    const patch = { order: { ...caseData.order, priority: newPriority as any } };
    caseRouter.updateCase(caseData.id, patch as any).then(() => {
      setCaseData(prev => prev ? ({ ...prev, ...patch } as typeof prev) : prev);
      markDirty('Priority');
    }).catch(err => console.error('[Priority] Failed to persist:', err));
  }, [caseData]);

  // ── Deficiency history ──────────────────────────────────────────────────────
  // getByCaseId() already existed on ISpecimenDeficiencyService with zero
  // UI ever calling it — both this page and Accession only ever wrote
  // deficiency records, never read them back. Fetched once the case
  // loads; deliberately not re-fetched on every render since deficiency
  // history for an already-loaded case doesn't change from anything this
  // page itself does (both pages only write at accession/sign-out time).
  const [caseDeficiencies, setCaseDeficiencies] = useState<SpecimenDeficiency[]>([]);
  const [deficiencyTypes, setDeficiencyTypes] = useState<DeficiencyType[]>([]);
  const [resolutionTypes, setResolutionTypes] = useState<ResolutionType[]>([]);
  const [showDeficiencyModal, setShowDeficiencyModal] = useState(false);
  const [showBlockEditor, setShowBlockEditor] = useState(false);
  useEffect(() => {
    if (!caseData?.id) return;
    specimenDeficiencyService.getByCaseId(caseData.id).then(res => { if (res.ok) setCaseDeficiencies(res.data); });
  }, [caseData?.id]);
  useEffect(() => {
    deficiencyTypeService.getAll().then(res => { if (res.ok) setDeficiencyTypes(res.data); });
    resolutionTypeService.getAll().then(res => { if (res.ok) setResolutionTypes(res.data); });
  }, []);

  const [showAddSynopticModal,  setShowAddSynopticModal]  = useState(false);
  const [showSpecimenEdit,      setShowSpecimenEdit]      = useState(false);
  const [editingSpecimen,       setEditingSpecimen]        = useState<import('@/types/case/Specimen').Specimen | null>(null);
  const [showAddOrdersModal,    setShowAddOrdersModal]     = useState(false);
  const [addOrdersInitialTab,   setAddOrdersInitialTab]     = useState<OrderTab | undefined>(undefined);

  // ── Grossing: focused block navigation ──────────────────────────────────────
  // A voice command like "mark grossed" needs to know *which* block,
  // unambiguously — there was no such concept anywhere before this.
  // Flattened across every specimen so "next/previous block" moves
  // through the whole case in one sequence, not per-specimen.
  const allBlocks = useMemo(() => {
    const out: { specimenId: string; specimenLabel: string; block: any }[] = [];
    (caseData?.specimens ?? []).forEach((sp: any) => {
      (sp.blocks ?? []).forEach((block: any) => out.push({ specimenId: sp.id, specimenLabel: sp.label, block }));
    });
    return out;
  }, [caseData?.specimens]);
  const [focusedBlockIndex, setFocusedBlockIndex] = useState(0);
  useEffect(() => {
    if (focusedBlockIndex >= allBlocks.length) setFocusedBlockIndex(Math.max(0, allBlocks.length - 1));
  }, [allBlocks.length, focusedBlockIndex]);
  const focusedBlockEntry = allBlocks[focusedBlockIndex];

  const handleAdvanceFocusedBlockStatus = useCallback(() => {
    if (!caseData?.id || !focusedBlockEntry) return;
    const nextStatus: Record<string, string> = { Pending: 'Grossed', Grossed: 'Embedded' };
    const newStatus = nextStatus[focusedBlockEntry.block.status];
    if (!newStatus) return; // Embedded/Exhausted are terminal or exception states — not voice-advanceable
    const patchedSpecimens = (caseData.specimens ?? []).map((sp: any) =>
      sp.id !== focusedBlockEntry.specimenId ? sp : {
        ...sp,
        blocks: (sp.blocks ?? []).map((b: any) => b.id === focusedBlockEntry.block.id ? { ...b, status: newStatus } : b),
      }
    );
    caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens } as any).then(() => {
      setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);
      markDirty('Block status');
    }).catch(err => console.error('[Grossing] Failed to advance block status:', err));
  }, [caseData, focusedBlockEntry]);

  const handleConfirmTriage = useCallback(() => {
    if (!caseData?.id || !focusedBlockEntry) return;
    const patchedSpecimens = (caseData.specimens ?? []).map((sp: any) =>
      sp.id !== focusedBlockEntry.specimenId ? sp : {
        ...sp, triageConfirmedAt: new Date().toISOString(), triageConfirmedBy: signingUser?.id ?? 'unknown',
      }
    );
    caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens } as any).then(() => {
      setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);
      markDirty('Triage confirmation');
    }).catch(err => console.error('[Grossing] Failed to confirm triage:', err));
  }, [caseData, focusedBlockEntry, signingUser]);

  // ── Generic block update — the manual Block/Stain editor ────────────────────
  // Distinct from handleAdvanceFocusedBlockStatus above, which only ever
  // cycles the *focused* block one status forward for voice commands.
  // This applies any change (status, priority override, stains) to any
  // specific block by id, for the actual visual editor at the bench —
  // there was no way to hand-edit a block at all before this, only
  // auto-generation at accession time and one-step voice advancement.
  const handleUpdateBlock = useCallback((specimenId: string, blockId: string, changes: Partial<any>) => {
    if (!caseData?.id) return;
    const patchedSpecimens = (caseData.specimens ?? []).map((sp: any) =>
      sp.id !== specimenId ? sp : {
        ...sp,
        blocks: (sp.blocks ?? []).map((b: any) => b.id === blockId ? { ...b, ...changes } : b),
      }
    );
    return caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens } as any).then(() => {
      setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);
      markDirty('Block edit');
    });
  }, [caseData]);

  // ── Voice action execution — moved further down in this file, see the ──────
  // ── comment at its new location for why (allBlocks/handleAdvanceFocused- ──
  // ── BlockStatus/handleConfirmTriage were fine here, but this listener ──────
  // ── now also needs openFlagManager, showTeamModal, etc., which aren't ──────
  // ── declared until much later). ──────────────────────────────────────────

  const [activeReportInstanceId, setActiveReportInstanceId] = useState<string>('');
  const [activeReportType, setActiveReportType] = useState<'grossing' | 'synoptic'>('synoptic');
  const [isAlertExpanded, setIsAlertExpanded] = useState(false);
  const [isSimilarCasesOpen, setIsSimilarCasesOpen] = useState(false);
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [panelMode, setPanelMode] = useState<null | 'expanded'>(null);
  const [highlightText, setHighlightText] = useState<string | null>(null);
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
  const [delegateReturnTo,  setDelegateReturnTo]    = useState<'team' | null>(null);
  const [showTeamModal,     setShowTeamModal]       = useState(false);

  // computationalFlags / refreshCompFlags removed along with the
  // Computational tab — this function only ever fed the flag catalog
  // list and a preliminary case fetch, both now unnecessary; the real
  // case load happens right after, in the effect below.

  // ── Left panel tab + Orchestrator state ───────────────────
  const [leftTab, setLeftTab] = useState<'draft' | 'sequencer' | 'report' | 'material'>('report');
  const [showSequencer, setShowSequencer] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('ps_sidebar_collapsed') === 'true'
  );

  // Orchestration mode = PathScribe owns the report.
  // CoPilot mode = LIS owns the report; PathScribe feeds structured data back.
  // Orchestration mode = PathScribe owns the report (Outreach/O26- cases).
  // Determined by case ID prefix — matches CaseRouter's routing key.
  // LIS cases (S26-*, no reportingMode) must NOT default to orchestration mode.
  const isOrchestrationMode = !!(caseId?.startsWith('O26-'));

  // ── Three-column Orchestration layout state ─────────────────────────────────
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // ── User-configurable tab width — persisted across sessions ────────────────
  const [tabWidthChars, setTabWidthChars] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('pathscribe-tab-width');
      return saved ? parseInt(saved, 10) : 4;
    } catch { return 4; }
  });
  const handleTabWidthChange = useCallback((chars: number) => {
    setTabWidthChars(chars);
    try { localStorage.setItem('pathscribe-tab-width', String(chars)); } catch { /* ignore */ }
  }, []);

  // ── Print the formatted centre pane report ───────────────────────────────
  // handleOrchPrint itself is defined further down, after orchSections,
  // resolvedContext, resolvedTemplateName, resolvedBy, and showToast are
  // all declared — it depends on every one of them, so it can't live here
  // (its dependency array would reference consts not yet initialized in
  // this render pass).

  useEffect(() => {
    localStorage.setItem('ps_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // LIS cases must never show the draft tab — reset if somehow set
  useEffect(() => {
    if (!isOrchestrationMode && leftTab === 'draft') setLeftTab('report');
  }, [isOrchestrationMode, leftTab]);
  
  const [orchSections,    setOrchSections]    = useState<OrchestratorSection[]>([]);
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

  // Restore orchSections — checks localStorage AND the loaded caseData.
  // Runs whenever caseId OR caseData changes, so it can't be silently
  // overwritten by a later caseData load that doesn't carry orchSections.
  // localStorage (most recent local edits) takes priority over caseData
  // (server/mock-service state), since the pathologist's last edits are
  // the most current source of truth.
  useEffect(() => {
    if (!caseId) return;

    let restored: OrchestratorSection[] | null = null;

    // 1. Try localStorage first — most recent local draft
    try {
      const stored = localStorage.getItem(`ps_orch_sections_${caseId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          restored = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse orchSections from localStorage:', e);
    }

    // 2. Fall back to caseData.orchSections (from mock service / server)
    if (!restored) {
      const fromCase = (caseData as any)?.orchSections;
      if (Array.isArray(fromCase) && fromCase.length > 0) {
        restored = fromCase;
      }
    }

    if (restored) {
      setOrchSections(restored);
    }
  // Re-run when caseData arrives (it loads asynchronously after caseId is known)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, caseData?.id]);

  // Default activeSectionId to the first section once sections load
  useEffect(() => {
    if (!activeSectionId && orchSections.length > 0) {
      setActiveSectionId(orchSections[0].id);
    }
  }, [orchSections, activeSectionId]);


  // Sync orchSections → caseData.diagnostic so LeftReportPanel (Full Report)
  // always reflects the current draft without requiring a manual save.
  // Extracted to a stable callback so it can be invoked both reactively
  // (whenever orchSections itself changes — the original behavior) AND
  // explicitly whenever the user switches onto the Synoptic Reporting tab,
  // as a defensive re-sync at the moment LeftReportPanel actually becomes
  // visible — covers any edge case where the continuous effect hasn't
  // caught up yet (e.g. orchSections just restored from localStorage on a
  // fresh tab switch before that effect's first run lands).
  const syncOrchSectionsToDiagnostic = React.useCallback(() => {
    if (!isOrchestrationMode || orchSections.length === 0) return;
    const find = (id: string) => orchSections.find(s => s.id === id)?.text ?? '';
    // Map known section IDs to diagnostic fields; fall back to concatenated narrative
    const grossText  = find('gross_description') || find('gross');
    const microText  = find('microscopic') || find('microscopic_description');
    const ancText    = find('ancillary_studies') || find('ancillary');
    // Full narrative: all sections joined for LeftReportPanel's report body
    const fullNarrative = orchSections.map(s => `<h3>${s.label}</h3>${s.text}`).join('');
    setCaseData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        diagnostic: {
          ...prev.diagnostic,
          grossDescription:       grossText       || prev.diagnostic?.grossDescription       || '',
          microscopicDescription: microText       || prev.diagnostic?.microscopicDescription || '',
          ancillaryStudies:       ancText         || prev.diagnostic?.ancillaryStudies       || '',
          reportNarrative:        fullNarrative,
        },
      };
    });
  }, [orchSections, isOrchestrationMode]);

  useEffect(() => { syncOrchSectionsToDiagnostic(); }, [orchSections, isOrchestrationMode]); // eslint-disable-line

  // Explicit re-sync on tab switch — the moment leftTab becomes 'report',
  // force a fresh pull from orchSections rather than relying solely on the
  // change-triggered effect above.
  useEffect(() => {
    if (leftTab === 'report') syncOrchSectionsToDiagnostic();
  }, [leftTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const [isOrchestrating,      setIsOrchestrating]      = useState(false);
  const [resolvedTemplateId,   setResolvedTemplateId]   = useState<string>('tmpl-gold-standard');
  const [resolvedTemplateName, setResolvedTemplateName] = useState<string>('Gold Standard — General Surgical Pathology');
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
          curr === 'Gold Standard — General Surgical Pathology' ? ctx.narrativeTemplate.templateName : curr
        );
      })
      .catch(e => {
        if (!cancelled) console.warn('Auto-resolve of StructuredContext failed on load:', e);
      });
    return () => { cancelled = true; };
    // caseData.id (not the whole object) — caseData can get new object
    // identity on unrelated updates without this needing to re-resolve.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData?.id, isOrchestrationMode, overrideTemplateId]);

  // ── Centre pane header state — template picker, lifted here so it can be
  //    shared between both layout instances (primary + expanded) ───────────
  const [centreTemplates, setCentreTemplates] = useState<{ id: string; name: string; specialty?: string }[]>([]);
  const [showCentreTemplatePicker, setShowCentreTemplatePicker] = useState(false);
  useEffect(() => {
    import('@/services/reportTemplates/mockReportTemplateService').then(({ mockReportTemplateService }) => {
      (mockReportTemplateService as any).getAll?.().then((r: any) => {
        if (r?.ok) setCentreTemplates(r.data ?? []);
      }).catch(() => {});
    });
  }, []);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null);
  const abortRef  = React.useRef<AbortController | null>(null);

  // ── Dirty-state timing guards ──────────────────────────────────────────
  // Track when hasUnsavedData first becomes true relative to case load.
  // Changes that fire within 1200 ms of load are from component initialisation
  // (e.g. RightSynopticPanel seeding form values) — not real user edits.
  const caseLoadedAt = React.useRef<number>(Date.now());
  const dirtySetAt   = React.useRef<number | null>(null);
  const engineRef = React.useRef<OrchestratorEngine | null>(null);

  // AI suggestions lifted from RightSynopticPanel
  const [aiSuggestions,        setAiSuggestions]        = useState<Record<string, AiSuggestion>>({});
  const [computationalResults, setComputationalResults] = useState<Record<string, Record<string, string | number | boolean | null>>>({});

  // ── AI Synthesis Status — fed to HeaderBar's badge ───────────────────────
  // SHORT-TERM SAFE FALLBACK, per Dr. Carter's review: a true tiered
  // "floor" model (Tier 1 diagnosis/staging fields gating the badge,
  // Tier 2/3 not) is the right long-term design — but classifying tiers by
  // regex-matching field ID strings (the only metadata AiSuggestion
  // carries today) is a silent-failure risk: an unexpected ID like
  // `txt_tmr_typ_01` would slip past the patterns and a genuinely critical
  // field could fail to gate the badge. That's worse than the flat-average
  // bug this whole thing started as fixing.
  //
  // Until tier classification is sourced from the real CAP eCC template
  // schema (EditorField/EditorSection's actual "Must Have" / required
  // metadata — the same schema RightSynopticPanel renders from, not
  // available in this file), the badge uses a deliberately conservative
  // binary rule instead: ANY field below the confidence threshold trips
  // the warning, regardless of which field it is. Over-warning is the
  // correct failure mode here, not over-assuring.
  //
  // TODO (long-term fix): once tier metadata is wired in from the CAP
  // schema, replace this with real floor logic restricted to Tier 1
  // fields, matching the design discussed but not shipped here.
  //
  // TODO: threshold below mirrors AI Behavior > Confidence Threshold but is
  // a separate hardcoded constant — RightSynopticPanel fetches that config
  // value locally to itself. These should share one source (e.g.
  // SystemConfigContext) so the two can't drift apart.
  const REVIEW_THRESHOLD = 80;

  const aiSynthesisStatus = React.useMemo<AiSynthesisStatus>(() => {
    const entries = Object.entries(aiSuggestions)
      .filter((e): e is [string, AiSuggestion] => typeof e[1]?.confidence === 'number');
    if (entries.length === 0) return { state: 'none' };

    const overallConfidence = Math.round(
      entries.reduce((sum, [, s]) => sum + s.confidence, 0) / entries.length
    );

    // ROOT FIX — this previously flagged the lowest-confidence field
    // across ALL suggestions regardless of verification status, so a
    // field the pathologist had already confirmed or overridden (e.g.
    // via a Delta-table override during an amendment, which sets
    // verification: 'disputed') kept triggering "Review Pending"
    // forever based on its original, now-irrelevant AI confidence
    // score. Only fields still genuinely 'unverified' — i.e. actually
    // pending review — should be able to trip this.
    const unreviewed = entries.filter(([, s]) => s.verification === 'unverified');

    let flagged: [string, AiSuggestion] | null = null;
    for (const entry of unreviewed) {
      if (!flagged || entry[1].confidence < flagged[1].confidence) flagged = entry;
    }

    const state: AiSynthesisStatus['state'] =
      flagged && flagged[1].confidence < REVIEW_THRESHOLD ? 'review-required' : 'draft-ready';

    return {
      state,
      overallConfidence,
      flaggedFieldId: flagged?.[0],
      flaggedFieldConfidence: flagged?.[1].confidence,
    };
  }, [aiSuggestions]);

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
          sessionStorage.getItem('pathscribe:searchResultIds') ?? '[]'
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
      if (c.specimens?.length) setActiveSpecimenId(c.specimens[0].id);
      if (c.synopticReports?.length) setActiveReportInstanceId(c.synopticReports[0].instanceId);
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
  }, [caseId]);

  // Track when dirty state was first set relative to case load
  React.useEffect(() => {
    if (hasUnsavedData) {
      if (dirtySetAt.current === null) dirtySetAt.current = Date.now();
    } else {
      dirtySetAt.current = null;
    }
  }, [hasUnsavedData]);

  // Returns true only when dirty state originated from a real user edit
  // (not from component initialisation within the first 1200 ms of case load)
  const shouldWarnDirty = React.useCallback((): boolean => {
    if (!hasUnsavedData) return false;
    const likelyInit = dirtySetAt.current !== null &&
      (dirtySetAt.current - caseLoadedAt.current) < 1200;
    return !likelyInit;
  }, [hasUnsavedData]);

  // ── Hooks ──────────────────────────────────────────────────
  const {
    showFinalizeModal,  setShowFinalizeModal,
    finalizePassword,   setFinalizePassword,
    finalizeError,
    showSignOutModal,   setShowSignOutModal,
    signOutUser,        setSignOutUser,
    signOutPassword,    setSignOutPassword,
    signOutError,
    setCaseSigned,
    showAmendmentModal, setShowAmendmentModal,
    amendmentText,      setAmendmentText,
    amendmentMode,      setAmendmentMode,
  } = useSynopticFinalize();

  const {
    showLogoutModal,  setShowLogoutModal,
    isProfileOpen,    setIsProfileOpen,
  } = useSynopticModals();

  const { toastMsg, toastVisible, showToast } = useSynopticToast();

  // ── Print the formatted centre pane report ───────────────────────────────
  // Calls the render_report Cloud Function (Python/ReportLab) for a real
  // structured PDF, built from the same resolvedContext/orchSections the
  // on-screen preview renders — falls back to the old DOM-print path if
  // the function call fails for any reason. Relocated here (was near the
  // top of the component) because it depends on orchSections,
  // resolvedContext, resolvedTemplateName, resolvedBy, and showToast, none
  // of which exist yet earlier in this render pass.
  const [isPrinting, setIsPrinting] = useState(false);

  const handleOrchPrint = useCallback(async () => {
    if (!caseData) { window.print(); return; }
    setIsPrinting(true);
    const accession = caseData.accession?.fullAccession
      ?? caseData.accession?.accessionNumber ?? '';
    try {
      const patient = caseData.patient
        ? `${caseData.patient.lastName}, ${caseData.patient.firstName}` : '';
      // Amendment/addendum data added to the payload so a server-side
      // renderer CAN draw the banner — but the ReportLab service that
      // actually turns this payload into the PDF page is a separate
      // Python service outside this codebase. This field being present
      // here does not guarantee it's drawn; that requires a
      // corresponding update on the PDF generation side, which isn't
      // something verifiable from this React app.
      const amendmentRes = caseData.id ? await amendmentService.getByCaseId(caseData.id) : { ok: false as const };
      const releasedAmendments = amendmentRes.ok ? amendmentRes.data.filter(r => r.status === 'released') : [];

      const payload = {
        templateName: resolvedTemplateName,
        resolvedBy,
        institution: getInstitution(caseData.originHospitalId),
        caseHeader: {
          accession,
          patient,
          mrn: caseData.patient?.mrn ?? '',
          dob: caseData.patient?.dateOfBirth
            ? new Date(caseData.patient.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
            : '',
          referring: caseData.order?.clientName ?? '',
          clinician: caseData.order?.requestingProvider ?? '',
        },
        // Same data ReportPreviewRenderer already renders on screen — the
        // PDF and the live preview are built from one resolved context,
        // not two independently-derived views of the case.
        bodyAssembly:    resolvedContext?.narrativeTemplate.bodyAssembly ?? [],
        sections:        orchSections,
        renderScope:     buildRenderScope(caseData),
        synopticAnswers: resolvedContext?.synoptics?.flatMap(s => s.answers) ?? [],
        amendments:      releasedAmendments,
      };

      const resp = await fetch(REPORT_PDF_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        throw new Error(`Report PDF generation failed (${resp.status})`);
      }

      const blob = await resp.blob();
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
      }
      // Revoke once the new tab/download has had time to load the blob —
      // too soon and an opened tab can lose the document mid-render.
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e: any) {
      showToast(`PDF generation failed (${e?.message ?? 'unknown error'}) — printing from screen instead`);
      // Fall back to the old DOM-print path rather than leaving the
      // pathologist with no way to print if the Cloud Function is down.
      const pageEl = document.querySelector('.rp-page') as HTMLElement | null;
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
      win.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>${accession} — PathScribe Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt;
         line-height: 1.6; color: #1a1a1a; background: white; }
  @page { size: A4; margin: 18mm 20mm 22mm 20mm;
    @top-left   { content: "${accession}"; font-size: 8pt; color: #666; font-family: Arial, sans-serif; }
    @top-right  { content: "CONFIDENTIAL — CLINICAL RECORD"; font-size: 8pt; color: #666; font-family: Arial, sans-serif; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8pt; color: #666; font-family: Arial, sans-serif; }
  }
  .rp-section-badge { display: none; }
  .rp-section-heading { font-size: 11pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; border-left: 3px solid #333; padding: 6px 0 6px 10px;
    margin-bottom: 8pt; }
  .rp-section-body { font-size: 11pt; line-height: 1.7; padding-left: 13px; }
  .rp-section-body p { margin-bottom: 6pt; orphans: 3; widows: 3; }
  .rp-section { margin-bottom: 18pt; }
  .rp-footer-conf, .rp-footer { font-size: 8pt; }
</style></head><body>${pageEl.outerHTML}</body></html>`);
      win.document.close();
      win.onload = () => { win.focus(); win.print(); win.close(); };
    } finally {
      setIsPrinting(false);
    }
  }, [caseData, resolvedContext, orchSections, resolvedTemplateName, resolvedBy, showToast]);

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
      (mockActionRegistryService as any).registerAction?.({
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

  // ── Handle popup blocked (Citrix/VDI/browser policy) ───────────────────────
  useEffect(() => {
    if (!isOrchestrationMode) return;
    const handler = (e: Event) => {
      const url = (e as CustomEvent).detail?.url ?? '/report-preview';
      // Show a non-intrusive toast with actionable options
      showToast(
        '📋 Preview window was blocked. ' +
        'Allow popups for this site in your browser settings, ' +
        'or use the Synoptic Reporting tab to view the formatted report.'
      );
      console.info('[PathScribe] Preview window blocked by browser/Citrix policy.', { url });
    };
    window.addEventListener('PATHSCRIBE_PREVIEW_BLOCKED', handler);
    return () => window.removeEventListener('PATHSCRIBE_PREVIEW_BLOCKED', handler);
  }, [isOrchestrationMode, showToast]);

  // ── Wire ORCH keyboard/voice events to page-level handlers ────────────────
  useEffect(() => {
    if (!isOrchestrationMode) return;
    const saveDraft = async () => {
      if (caseData?.id) {
        try {
          await caseRouter.updateCase(caseData.id, { orchSections, updatedAt: new Date().toISOString() } as any);
          localStorage.setItem(`ps_orch_sections_${caseData.id}`, JSON.stringify(orchSections));
        } catch (e) { console.error(e); }
      }
      clearDirty();
      showToast('Draft saved');
    };
    const generateReport = () => {
      // Fire the same event that Generate Report button uses
      window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_START_GENERATE'));
    };
    window.addEventListener('PATHSCRIBE_ORCH_SAVE_DRAFT',    saveDraft    as EventListener);
    window.addEventListener('PATHSCRIBE_ORCH_GENERATE_REPORT', generateReport as EventListener);
    return () => {
      window.removeEventListener('PATHSCRIBE_ORCH_SAVE_DRAFT',    saveDraft    as EventListener);
      window.removeEventListener('PATHSCRIBE_ORCH_GENERATE_REPORT', generateReport as EventListener);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrchestrationMode, caseData?.id, orchSections]);

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
  // 4 more (DELEGATE_PEER_REVIEW/FORMAL_CONSULT/FULL_TRANSFER/CONFIRM)
  // are wired inside DelegateModal.tsx directly, since the delegation-
  // type and confirm state live there, not here.
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
    const unsubscribe = mockActionRegistryService.onAction((actionId: string) => {
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
          setShowDelegateModal(true);
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
  }, [
    allBlocks.length, handleAdvanceFocusedBlockStatus, handleConfirmTriage,
    openFlagManager, clearDirty,
  ]);


  // Tracks whether onApplyFlags/onRemoveFlag fired during this modal session
  // Watch caseFlags/specimenFlags — set dirty any time they change after initial load.
  // Works regardless of which modal or callback applied the change.
  const initialFlagsKey = React.useRef<string | null>(null);

  // When caseFlags or specimenFlags change after load → mark dirty
  React.useEffect(() => {
    if (!isLoaded || !caseData) return;
    const key = JSON.stringify([
      ((caseData as any).caseFlags ?? []).map((f: any) => f.id ?? f.lisCode),
      (caseData.specimens ?? []).map((sp: any) => ((sp as any).specimenFlags ?? []).map((f: any) => f.id ?? f.lisCode)),
    ]);
    if (initialFlagsKey.current === null) {
      initialFlagsKey.current = key;
      return;
    }
    if (key !== initialFlagsKey.current) {
      markDirty('Flags');
      initialFlagsKey.current = key;
    }
  }); // intentionally no dep array — runs after every render but only acts when key changes

  // Note: computational tab (results) is freely accessible regardless of unsaved state.
  // The unsaved state warning fires at finalize/navigate time instead.

  const guard = useCallback((path: string, state?: object) => {
    // Remap /worklist → /search when the user arrived from a search result
    const dest = (path === '/worklist' && navSource === 'search') ? '/search' : path;
    // Tell SearchPage to restore previous results when returning to it
    if (dest === '/search') sessionStorage.setItem('pathscribe:searchReturn', '1');
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
      safeSetLeftTab('draft');
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
      navigate(`/case/${worklistCases[newIndex]}/synoptic`, {
        state: { worklistCaseIds: worklistCases },
      });
    }
  }, [worklistCases, worklistIndex, navigate]);

  const [pendingReconciliation, setPendingReconciliation] = React.useState<{
    specimenId: string; caseType: string; frozenCategory: import('@/types/intraop/IntraoperativeEntry').FrozenCategory; frozenDx: string;
  } | null>(null);

  const sendMaterialOrderToLis = useCallback(async (order: {
    kind: 'block_recut' | 'stain';
    specimenId: string;
    label: string;
  }): Promise<{ ok: boolean }> => {
    await new Promise(resolve => setTimeout(resolve, 400)); // simulated round-trip
    return { ok: true };
  }, []);

  // CoPilot amendment/addendum transmission — same honest simulation as
  // sendMaterialOrderToLis above: no real HL7 MDM/ORU or FHIR
  // DiagnosticReport message actually leaves this app. What's real is
  // the seam and, for corrections specifically, a genuine trigger event.
  //
  // The "Disconnected Modification" risk a real LIS integration needs
  // to guard against: someone amends directly in the LIS without going
  // through PathScribe, leaving PathScribe's structured data stale.
  // PathScribe can't detect that — it happens entirely outside this
  // app. What it CAN do is the inverse: the moment PathScribe itself
  // sends a correction, fire a real, documented event a real LIS
  // integration layer would listen for to force-sync or show a warning
  // banner. That's what PATHSCRIBE_LIS_SYNC_REQUIRED is — a genuine
  // trigger with no real subscriber yet, not a fake success.
  // Builds the actual hardcoded text header baked into the outgoing
  // payload — per the spec, this has to survive even if the LIS has a
  // rigid layout engine, so it's part of the text itself, not just a
  // flag the LIS might render correctly.
  const buildEmbeddedHeader = (kind: 'corrected' | 'new_instance' | 'corrected_with_addition', timestamp: string, sequenceNumber?: number, title?: string): string => {
    const formatted = new Date(timestamp).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
    if (kind === 'new_instance') {
      const label = title ? `ADDENDUM ${sequenceNumber ?? 1}: ${title.toUpperCase()}` : `ADDITIONAL SYNOPTIC REPORT ADDED`;
      return `--- ${label} (Transmitted: ${formatted}) ---`;
    }
    if (kind === 'corrected_with_addition') {
      const label = title ? ` — ${title.toUpperCase()}` : '';
      return `[CORRECTED RESULT WITH ADDITIONAL INFORMATION${label} (Transmitted: ${formatted})]`;
    }
    return `[AMENDED REPORT — CORRECTED: ${formatted}]`;
  };

  const sendSynopticReportToLis = useCallback(async (payload: {
    kind: 'corrected' | 'new_instance' | 'corrected_with_addition';
    caseId: string;
    instanceId: string;
    reasonForChange?: string; // only meaningful for 'corrected'
    sequenceNumber?: number; // addendum numbering, for the header label
    addendumTitle?: string;
    /** The actual discrete text block being handed to the LIS — the
     *  embedded header gets prepended to this, not just attached as
     *  separate metadata. */
    payloadBody: string;
  }): Promise<{ ok: boolean }> => {
    const timestamp = new Date().toISOString();
    // HL7 OBR-25 / FHIR DiagnosticReport.status equivalent — this is
    // what tells the LIS to stamp its own "Amended/Supplemented" page
    // header. 'A' = Amended, 'P' = Append/Supplemental, matching the
    // spec's two transaction types exactly.
    // HL7 OBR-25 / FHIR DiagnosticReport.status equivalent — this is
    // what tells the LIS to stamp its own "Amended/Supplemented" page
    // header. 'A' = Amended, 'P' = Append/Supplemental. The hybrid case
    // gets 'A' too — per spec, the overall envelope must be flagged as
    // a correction so the EMR scans the whole file for modified
    // fields, even though the payload also carries new content.
    const transactionStatusFlag: 'A' | 'P' = payload.kind === 'new_instance' ? 'P' : 'A';
    const embeddedHeader = buildEmbeddedHeader(payload.kind, timestamp, payload.sequenceNumber, payload.addendumTitle);
    const fullPayloadText = `${embeddedHeader}\n\n${payload.payloadBody}`;

    await new Promise(resolve => setTimeout(resolve, 400)); // simulated round-trip
    if (payload.kind === 'corrected' || payload.kind === 'corrected_with_addition') {
      window.dispatchEvent(new CustomEvent('PATHSCRIBE_LIS_SYNC_REQUIRED', { detail: { ...payload, transactionStatusFlag, embeddedHeader, fullPayloadText, timestamp } }));
    }
    return { ok: true };
  }, []);

  // Real PDF snapshot, generated through the exact same
  // REPORT_PDF_ENDPOINT / ReportLab pipeline handleOrchPrint already
  // uses for live printing — deliberately not a second, separately-
  // built renderer that could drift from what the report actually
  // looks like. Returns base64 for storage rather than opening a tab;
  // callers persist it via reportVersionService. Failure doesn't throw
  // — a version record should still be created even if the PDF
  // couldn't be generated, so the audit trail itself is never silently
  // lost, just missing its rendered artifact for that one version.
  const [showCopilotReportView, setShowCopilotReportView] = React.useState(false);
  const [pendingLisNotice, setPendingLisNotice] = React.useState<{ id: string; lisAmendmentSummary: string; receivedAt: string } | null>(null);

  useEffect(() => {
    if (!caseData?.id) { setPendingLisNotice(null); return; }
    lisAmendmentNoticeService.getByCaseId(caseData.id).then(res => {
      if (!res.ok) return;
      const pending = res.data.find(n => n.status === 'pending_review');
      setPendingLisNotice(pending ? { id: pending.id, lisAmendmentSummary: pending.lisAmendmentSummary, receivedAt: pending.receivedAt } : null);
    });
  }, [caseData?.id]);

  // Exit Gate A — clerical clearance. Only reachable when there's no
  // open amendment/addendum draft for this case (Exit Gate B rule: an
  // active draft keeps the case in triage regardless of this button).
  const handleMarkReviewedNoChanges = useCallback(async () => {
    if (!pendingLisNotice) return;
    await lisAmendmentNoticeService.updateStatus(pendingLisNotice.id, 'acknowledged');
    setPendingLisNotice(null);
    showToast('Marked reviewed — confirmed no PathScribe synoptic changes necessary.');
  }, [pendingLisNotice, showToast]);

  const [copilotReportInstances, setCopilotReportInstances] = React.useState<CopilotReportInstance[]>([]);

  // What "print" actually means for CoPilot, per direct clarification:
  // the completed synoptic data as it's sent to the LIS — not a
  // narrative document, since CoPilot doesn't produce one. Reuses the
  // exact same resolveAnswers logic already fixed for the (still
  // server-dependent, still not confirmed working) PDF payload — this
  // is the real, verifiable alternative that doesn't depend on
  // REPORT_PDF_ENDPOINT rendering sections it was never given.
  // Simulated inbound "Disconnected Modification" event — honest
  // simulation, same as every other LIS-boundary stub tonight: no real
  // LIS exists to receive this from. What's real is the response: a
  // tracked notice record and a genuine urgent message to the
  // finalizing pathologist specifically, via the real message service.
  //
  // Deliberately does NOT touch synopticReports, does NOT unlock
  // anything, and does NOT invoke AI in any way. Per explicit
  // direction: AI never updates the record on its own — only if the
  // pathologist has already created an amendment and asks for
  // re-evaluation themselves. This handler's entire effect is the
  // notice + the message; everything else is a manual decision made
  // later, by the pathologist, through the existing amendment flow.
  const simulateLisAmendmentReceived = useCallback(async () => {
    if (!caseData?.id) return;
    const finalizedByName = caseData.diagnostic?.finalizedBy ?? signingUser?.name ?? 'Unknown Pathologist';
    const accession = caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? '';

    await lisAmendmentNoticeService.create({
      caseId: caseData.id,
      notifiedPathologistId: signingUser?.id ?? 'unknown',
      notifiedPathologistName: finalizedByName,
      lisAmendmentSummary: 'LIS reports this case was corrected directly in the LIS text editor, outside PathScribe.',
    });

    await messageService.send({
      senderId: 'system-lis-integration',
      senderName: 'LIS Integration',
      recipientId: signingUser?.id ?? 'unknown',
      recipientName: finalizedByName,
      subject: `Case ${accession} corrected in LIS — review required`,
      body: `This case was amended directly in the LIS, outside PathScribe. Review the correction and decide whether the synoptic data you originally reported also needs amending. PathScribe will not change anything automatically — if the synoptic report needs correcting, start that amendment yourself from this case.`,
      caseNumber: accession,
      timestamp: new Date(),
      isUrgent: true,
    });

    showToast('Simulated LIS amendment notice sent — check Messages for the urgent notification.');
  }, [caseData, signingUser, showToast]);

  const openCopilotReportView = useCallback(async () => {
    if (!caseData) return;
    const templateModule = await import('@/services/templates/templateService');
    const instances = caseData.synopticReports ?? [];
    const [versionsRes, amendmentsRes] = await Promise.all([
      reportVersionService.getByCaseId(caseData.id),
      amendmentService.getByCaseId(caseData.id),
    ]);
    const allVersions = versionsRes.ok ? versionsRes.data : [];
    const allAmendments = amendmentsRes.ok ? amendmentsRes.data : [];

    const resolved = await Promise.all(instances.map(async (inst: any) => {
      const detail = await templateModule.getTemplate(inst.templateId);
      const specimen = (caseData.specimens ?? []).find((s: any) => s.id === inst.specimenId);

      // Real version picker, per feedback — was always printing live
      // current data with no way to select an earlier reported version.
      const instanceVersions = allVersions
        .filter(v => v.instanceId === inst.instanceId && v.synopticAnswersSnapshot)
        .sort((a, b) => a.versionNumber - b.versionNumber);
      const total = instanceVersions.length;
      const versions = total > 1 ? instanceVersions.map((v, i) => {
        // Per feedback — print output must include the amendment
        // narrative and "Originally Reported As" diff, not just the
        // bare field values. Linked via amendmentRecordId, already
        // stored on ReportVersionRecord since the earlier root-cause fix.
        const record = v.amendmentRecordId ? allAmendments.find(a => a.id === v.amendmentRecordId) : undefined;
        const prevSnapshot = i > 0 ? instanceVersions[i - 1].synopticAnswersSnapshot ?? {} : undefined;
        const changedFromPrevious = prevSnapshot && detail
          ? Object.keys({ ...prevSnapshot, ...v.synopticAnswersSnapshot })
              .filter(k => JSON.stringify((prevSnapshot as any)[k]) !== JSON.stringify((v.synopticAnswersSnapshot as any)[k]))
              .map(k => ({
                fieldLabel: getFieldLabel(k, 'generic'),
                previousValue: (prevSnapshot as any)[k],
                currentValue: (v.synopticAnswersSnapshot as any)[k],
              }))
          : undefined;
        return {
          versionNumber: v.versionNumber,
          label: i === 0 ? 'Original' : i === total - 1 ? `${i === 1 ? '1st' : `${i}th`} Amended (Most Recent)` : `${i === 1 ? '1st' : `${i}th`} Amended`,
          releasedAt: v.createdAt,
          createdByName: v.createdBy?.userName ?? 'Unknown',
          answers: detail ? resolveAnswers((v.synopticAnswersSnapshot ?? {}) as Record<string, string | string[]>, detail.template) : [],
          explanationOfChange: record?.explanationOfChange,
          notification: record?.notification,
          changedFromPrevious,
        };
      }) : undefined;

      const templateSections = ((detail?.template as any)?.sections ?? []) as any[];

      return {
        instanceId: inst.instanceId,
        specimenId: inst.specimenId,
        specimenLabel: specimen?.label ?? inst.specimenId,
        specimenDesc: specimen?.description,
        templateName: inst.templateName ?? detail?.name ?? inst.templateId,
        answers: detail ? resolveAnswers(inst.answers ?? {}, detail.template) : [],
        sections: templateSections.map(s => ({ title: s.title as string, fieldKeys: (s.fields ?? []).map((f: any) => f.id as string) })),
        versions,
      };
    }));
    setCopilotReportInstances(resolved);
    setShowCopilotReportView(true);
  }, [caseData]);

  const generateReportPdfSnapshot = useCallback(async (): Promise<{ pdfBase64?: string; generationError?: string }> => {
    if (!caseData) return { generationError: 'No case data available.' };
    try {
      const accession = caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? '';
      const patient = caseData.patient ? `${caseData.patient.lastName}, ${caseData.patient.firstName}` : '';

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
          return resolveAnswers(inst.answers ?? {}, detail.template);
        }));
        copilotSynopticAnswers = resolved.flat();
      }

      const payload = {
        templateName: resolvedTemplateName,
        resolvedBy,
        institution: getInstitution(caseData.originHospitalId),
        caseHeader: {
          accession, patient,
          mrn: caseData.patient?.mrn ?? '',
          dob: caseData.patient?.dateOfBirth
            ? new Date(caseData.patient.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
            : '',
          referring: caseData.order?.clientName ?? '',
          clinician: caseData.order?.requestingProvider ?? '',
        },
        bodyAssembly:    resolvedContext?.narrativeTemplate.bodyAssembly ?? [],
        sections:        orchSections,
        renderScope:     buildRenderScope(caseData),
        synopticAnswers: isOrchestrationMode ? (resolvedContext?.synoptics?.flatMap(s => s.answers) ?? []) : copilotSynopticAnswers,
      };
      const resp = await fetch(REPORT_PDF_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!resp.ok) return { generationError: `Report PDF generation failed (${resp.status})` };
      const blob = await resp.blob();
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
  }, [caseData, resolvedTemplateName, resolvedBy, resolvedContext, orchSections, isOrchestrationMode]);

  const finalizeSignOut = useCallback(async () => {
    // Stage 2 of the CoPilot amendment pipeline — this is the real
    // re-sign-out. Real, serious ordering bug caught and fixed here:
    // release() was firing before sendSynopticReportToLis() resolved,
    // meaning a synoptic instance could be marked 'released' — and
    // vanish from the triage tile — even if the transmission itself
    // failed. The LIS never getting the update while the case
    // disappears from the pathologist's active view is exactly the
    // dangerous gray area being guarded against. Fixed: send first,
    // only release/clear on confirmed success. A failed instance stays
    // exactly where it was — pendingAmendmentId intact, status
    // untouched — so it remains visible in the triage tile rather than
    // silently vanishing while the LIS never received anything.
    if (caseData?.id) {
      const pendingInstances = (caseData.synopticReports ?? []).filter((r: any) => r.pendingAmendmentId);
      const successfulInstanceIds = new Set<string>();
      const failedInstances: string[] = [];

      for (const instance of pendingInstances) {
        const anyInstance = instance as any;
        // Orchestration owns its own finalization directly — there's
        // no external LIS transmission to wait on the way CoPilot has.
        // It commits immediately; CoPilot still gates on a real,
        // confirmed send before releasing.
        if (caseData.reportingMode !== 'copilot') {
          await amendmentService.release(anyInstance.pendingAmendmentId, {
            body: `Synoptic instance ${anyInstance.instanceId} corrected and re-signed out.`,
          });
          successfulInstanceIds.add(anyInstance.instanceId);
          continue;
        }
        const sendResult = await sendSynopticReportToLis({
          kind: 'corrected', caseId: caseData.id, instanceId: anyInstance.instanceId,
          payloadBody: `Synoptic instance ${anyInstance.instanceId} corrected and re-signed out.`,
        });
        if (!sendResult.ok) {
          failedInstances.push(anyInstance.instanceId);
          continue; // do NOT release — this instance stays in draft/triage exactly as it was
        }
        await amendmentService.release(anyInstance.pendingAmendmentId, {
          body: `Synoptic instance ${anyInstance.instanceId} corrected and re-signed out.`,
        });
        successfulInstanceIds.add(anyInstance.instanceId);

        {
          const { pdfBase64, generationError } = await generateReportPdfSnapshot();
          if (generationError) showToast(`Version saved, but PDF snapshot failed to generate: ${generationError}`);
          await reportVersionService.create({
            caseId: caseData.id,
            mode: 'copilot',
            trigger: 'amendment',
            createdBy: { userId: signingUser?.id ?? 'unknown', userName: signingUser?.name ?? 'Unknown User' },
            pdfBase64, generationError,
            synopticAnswersSnapshot: anyInstance.answers,
            instanceId: anyInstance.instanceId,
            amendmentRecordId: anyInstance.pendingAmendmentId,
          });
        }
      }

      if (failedInstances.length > 0) {
        showToast(`Warning: ${failedInstances.length} corrected synoptic instance(s) could not be transmitted — they remain in your triage queue, not finalized.`);
      }

      if (successfulInstanceIds.size > 0) {
        const clearedReports = (caseData.synopticReports ?? []).map((r: any) =>
          successfulInstanceIds.has(r.instanceId) ? { ...r, status: 'finalized', pendingAmendmentId: undefined } : r
        );
        setCaseData({ ...caseData, synopticReports: clearedReports } as any);
        caseRouter.updateCase(caseData.id, { synopticReports: clearedReports } as any).catch(console.error);
      }

      // Real, saved version of the report as it looks at THIS sign-out
      // — Version 1 the first time, a new version every re-sign-out
      // after that. Not a diff, not metadata — the actual exact PDF,
      // generated through the same real ReportLab pipeline as live
      // printing, so what gets saved genuinely matches what was signed.
      if (isOrchestrationMode) {
        const existingVersions = await reportVersionService.getByCaseId(caseData.id);
        const versionCount = existingVersions.ok ? existingVersions.data.length : 0;
        const { pdfBase64, generationError } = await generateReportPdfSnapshot();
        if (generationError) {
          showToast(`Version saved, but PDF snapshot failed to generate: ${generationError}`);
        }
        await reportVersionService.create({
          caseId: caseData.id,
          mode: 'orchestration',
          trigger: versionCount === 0 ? 'initial_signout' : 'amendment',
          createdBy: { userId: signingUser?.id ?? 'unknown', userName: signingUser?.name ?? 'Unknown User' },
          pdfBase64, generationError,
        });
      }
    }

    setCaseSigned(true);
    setShowSignOutModal(false);
    setPendingReconciliation(null);
    showToast('Case signed out successfully');
  }, [caseData, sendSynopticReportToLis, generateReportPdfSnapshot, isOrchestrationMode, signingUser, setCaseSigned, setShowSignOutModal, showToast, setCaseData]);

  const handleSignOutConfirm = useCallback(async () => {
    // Real Frozen-to-Permanent Reconciliation check — only fires when
    // this case actually has a merged intraop specimen with a real
    // frozen category (not 'deferred' — no real call was made at
    // frozen, so there's nothing to reconcile). Everything else signs
    // out exactly as it always did.
    if (caseData?.id) {
      const res = await intraoperativeService.getAll();
      if (res.ok) {
        const mergedSession = res.data.find(e => e.status === 'merged' && e.mergedIntoCaseId === caseData.id);
        const specimenNeedingReconciliation = mergedSession?.specimens.find(s => s.frozenCategory && s.frozenCategory !== 'deferred');
        if (mergedSession && specimenNeedingReconciliation) {
          setPendingReconciliation({
            specimenId: specimenNeedingReconciliation.id,
            caseType: specimenNeedingReconciliation.specimenLabel,
            frozenCategory: specimenNeedingReconciliation.frozenCategory!,
            frozenDx: specimenNeedingReconciliation.frozenSectionDiagnosis ?? '',
          });
          return; // hold sign-out until the reconciliation modal resolves
        }
      }
    }
    finalizeSignOut();
  }, [caseData, finalizeSignOut]);

  // ── Build SynopticForReview[] for PreFinalisationModal ─────────────────
  const buildSynopticsForReview = useCallback(async (): Promise<SynopticForReview[]> => {
    if (!caseData?.synopticReports?.length) return [];
    const reports = caseData.synopticReports.filter(r => (r as any).status !== 'deferred');

    // Real section structure, per feedback — was previously a flat
    // field list with no grouping at all. getTemplate() gives the same
    // sections/fields structure that drives the main editor's tabs
    // (Specimen/Tumor/Margins/...), fetched in parallel per instance.
    const sectionsByInstance = await Promise.all(reports.map(async report => {
      try {
        const detail = await getTemplate((report as any).templateId);
        const sections = ((detail.template as any)?.sections ?? []) as any[];
        return sections.map(s => ({ title: s.title as string, fieldKeys: (s.fields ?? []).map((f: any) => f.id as string) }));
      } catch (e) {
        console.error(`[PreFinalisation] Could not load template sections for ${(report as any).templateId}:`, e);
        return [] as { title: string; fieldKeys: string[] }[];
      }
    }));

    return reports.map((report, i) => {
        const specimen  = caseData.specimens?.find(s => s.id === report.specimenId) as any;
        const answers   = (report as any).answers ?? {};
        const fieldKeys = Object.keys(answers);
        const answeredCount = fieldKeys.filter(k => {
          const v = answers[k];
          return v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0);
        }).length;
        const std: ReportingStandard =
          report.templateName?.includes('RCPath') ? 'RCPath' :
          report.templateName?.includes('RCPA')  ? 'RCPA'  :
          report.templateName?.includes('WHO')   ? 'WHO'   :
          report.templateName?.includes('CAP')   ? 'CAP'   : 'generic';
        const fieldLabels: Record<string, string> = {};
        fieldKeys.forEach(k => { fieldLabels[k] = getFieldLabel(k, std); });
        return {
          instanceId:    report.instanceId,
          templateName:  report.templateName,
          specimenId:    report.specimenId,
          specimenLabel: specimen?.label ?? '?',
          specimenDesc:  specimen?.description ?? 'Specimen',
          answers, fieldLabels, fieldOrder: fieldKeys,
          sections: sectionsByInstance[i],
          answeredCount, totalCount: fieldKeys.length,
          requiredFields: (report as any).requiredFields ?? [],
          status: (report as any).status,
        };
      });
  }, [caseData]);

  const synopticPanelRef = React.useRef<RightSynopticPanelHandle>(null);
  const [missingFields,          setMissingFields]          = React.useState<MissingRequiredField[]>([]);
  const [showMissingWarning,     setShowMissingWarning]     = React.useState(false);
  const [reviewFields,           setReviewFields]           = React.useState<ReviewField[]>([]);
  const [showAiReview,           setShowAiReview]           = React.useState(false);
  const [finalizeAndNextPending, setFinalizeAndNextPending] = React.useState(false);

  // ── Pre-finalisation + protocol review state ───────────────────────
  const [showPreFinalise,   setShowPreFinalise]   = React.useState(false);
  const [preFinalSynoptics, setPreFinalSynoptics] = React.useState<SynopticForReview[]>([]);
  const [showProtoReview,   setShowProtoReview]   = React.useState(false);
  const [protoChanges,      setProtoChanges]      = React.useState<ProtocolChange[]>([]);
  // Stage 1: tracks whether a Stage 1 evaluation call is currently in
  // flight. Combined with showProtoReview (above) to gate Finalize/
  // Finalize & Next/Sign Out in BottomActionBar — see handleGrossComplete.
  const [isEvaluatingSynopticFit, setIsEvaluatingSynopticFit] = React.useState(false);
  // Per-instance snapshot of answers at the moment each GrossingReportInstance
  // was last finalized — set in handleGrossComplete, read by the drift-
  // detection useEffect right after it. Ref, not state: pure bookkeeping,
  // shouldn't trigger renders on its own.
  const grossingSnapshotRef = React.useRef<Map<string, string>>(new Map());

  const handleProtocolChangesDetected = useCallback((changes: ProtocolChange[]) => {
    if (!changes.length) return;
    setProtoChanges(changes);
    setShowProtoReview(true);
  }, []);

  // ── Real finalization logic — shared by both finalize entry points ────────
  // Previously: handlePreFinalConfirm only console.log'd and closed the
  // modal — no status change, no persistence, no audit event. The OTHER
  // finalize path (handleFinalizeConfirm, reached via the AI Review →
  // FinalizeModal route when uncertain fields exist) had real logic
  // (signal capture, deferred-amendment handling) but ALSO never actually
  // set status: 'finalized' or persisted anything via caseRouter.updateCase.
  // Both paths must finalize identically — this is the one real
  // implementation both call.
  const finalizeCase = useCallback(async (
    excludedInstanceIds: string[] = []
  ): Promise<boolean> => {
    if (!caseData) return false;

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
    const blockingSpecimens: FixativeGateSpecimen[] = (caseData.specimens ?? [])
      .filter((sp: any) => {
        const entry = sp.specimenDictionaryEntryId
          ? specimenDictionary.find(e => e.id === sp.specimenDictionaryEntryId)
          : undefined;
        return entry?.requireFixativeTimeBeforeSignout && !sp.processing?.processedAt;
      })
      .map((sp: any) => ({ specimenId: sp.id, label: sp.label, description: sp.description }));

    if (blockingSpecimens.length > 0) {
      setFixativeGateSpecimens(blockingSpecimens);
      setPendingFinalizeArgs(excludedInstanceIds);
      return false; // abort — do not finalize until the gate is resolved
    }

    const finalizedAt = new Date().toISOString();

    try {
      // CaseRouter.updateCase is deliberately Promise<void> — it writes to
      // the owning service and logs an independent audit event per source
      // system, by design (see CaseRouter's class doc comment). It never
      // returns the updated record. Since we already have everything we
      // just sent, merge it locally rather than waiting on a return value
      // that was never going to arrive.
      const patch = {
        status: 'finalized' as CaseStatus,
        finalizedAt,
        finalizedBy: signingUser?.id ?? null,
        // Excluded synoptic instances (from the Pre-Finalisation Review's
        // drag-to-exclude interaction) are marked deferred rather than
        // dropped, so they remain visible/amendable later.
        synopticReports: (caseData.synopticReports ?? []).map((r: any) =>
          excludedInstanceIds.includes(r.instanceId)
            ? { ...r, status: 'deferred' }
            : r
        ),
      };

      await caseRouter.updateCase(caseData.id, patch as any);

      const updated = { ...caseData, ...patch } as typeof caseData;
      setCaseData(updated);

      log('case_finalized', {
        caseId: caseData.id,
        accession: caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber,
        finalizedBy: signingUser?.id ?? 'unknown',
        excludedCount: excludedInstanceIds.length,
      });

      showToast('Report finalized');
      return true;
    } catch (err) {
      console.error('[Finalise] Failed to persist finalization:', err);
      showToast('Finalization failed — please try again');
      return false;
    }
  }, [caseData, signingUser, log, showToast, specimenDictionary]);

  // ── Shared amendment/addendum release — race-safe ──────────────────────────
  // Extracted because this exact logic previously lived ONLY inside
  // handleFinalizeConfirm (the legacy AI-review-fallback password modal),
  // which meant the PRIMARY finalize path (handlePreFinalConfirm, via
  // PreFinalisationModal — the one that actually shows the full report)
  // never released amendments/addenda at all. Uses functional setCaseData
  // updates specifically so this can safely run concurrently with
  // finalizeCase()'s own setCaseData call without either one clobbering
  // the other based on a stale closure — the previous version of this
  // logic used `{ ...caseData, ... }` from a captured closure, which raced
  // against finalizeCase()'s own fire-and-forget async update and would
  // silently lose whichever one resolved first.
  const releasePendingAmendmentOrAddendum = useCallback(async (): Promise<string | undefined> => {
    if (!caseData?.id || !activeReportInstanceId) return undefined;
    const activeInstance = (caseData.synopticReports ?? []).find((r: any) => r.instanceId === activeReportInstanceId) as any;
    let releasedAmendmentId: string | undefined;

    if (activeInstance?.pendingAddendumId) {
      const hasConcurrentAmendment = (caseData.synopticReports ?? []).some(
        (r: any) => r.instanceId !== activeReportInstanceId && r.pendingAmendmentId
      );
      await amendmentService.release(activeInstance.pendingAddendumId, {
        addendumTitle: activeInstance.templateName,
        body: `Addendum synoptic instance ${activeInstance.instanceId} finalized.`,
      });
      setCaseData(prev => prev ? {
        ...prev,
        synopticReports: (prev.synopticReports ?? []).map((r: any) =>
          r.instanceId === activeReportInstanceId ? { ...r, pendingAddendumId: undefined } : r
        ),
      } as any : prev);
      caseRouter.updateCase(caseData.id, {
        synopticReports: (caseData.synopticReports ?? []).map((r: any) =>
          r.instanceId === activeReportInstanceId ? { ...r, pendingAddendumId: undefined } : r
        ),
      } as any).catch(console.error);
      sendSynopticReportToLis({
        kind: hasConcurrentAmendment ? 'corrected_with_addition' : 'new_instance',
        caseId: caseData.id, instanceId: activeInstance.instanceId,
        sequenceNumber: (caseData.synopticReports ?? []).length,
        addendumTitle: activeInstance.templateName,
        payloadBody: `Addendum synoptic instance ${activeInstance.instanceId} finalized.`,
      });
    }

    if (activeInstance?.pendingAmendmentId) {
      releasedAmendmentId = activeInstance.pendingAmendmentId;
      await amendmentService.release(activeInstance.pendingAmendmentId, {
        body: `Synoptic instance ${activeInstance.instanceId} corrected and re-signed out.`,
      });
      setCaseData(prev => prev ? {
        ...prev,
        status: 'finalized' as CaseStatus,
        synopticReports: (prev.synopticReports ?? []).map((r: any) =>
          r.instanceId === activeReportInstanceId
            ? { ...r, status: 'finalized', pendingAmendmentId: undefined, previouslyFinalizedForAmendment: undefined }
            : r
        ),
      } as any : prev);
      caseRouter.updateCase(caseData.id, {
        status: 'finalized' as CaseStatus,
        synopticReports: (caseData.synopticReports ?? []).map((r: any) =>
          r.instanceId === activeReportInstanceId
            ? { ...r, status: 'finalized', pendingAmendmentId: undefined, previouslyFinalizedForAmendment: undefined }
            : r
        ),
      } as any).catch(console.error);
      sendSynopticReportToLis({
        kind: 'corrected', caseId: caseData.id, instanceId: activeInstance.instanceId,
        payloadBody: `Synoptic instance ${activeInstance.instanceId} corrected and re-signed out.`,
      });
    }

    // CoPilot's real completion moment — version record, tagged correctly
    // based on what actually happened above rather than always assuming
    // first-time finalize.
    if (caseData?.reportingMode === 'copilot' && activeInstance) {
      const { pdfBase64, generationError } = await generateReportPdfSnapshot();
      if (generationError) showToast(`Version saved, but PDF snapshot failed to generate: ${generationError}`);
      await reportVersionService.create({
        caseId: caseData.id,
        mode: 'copilot',
        trigger: releasedAmendmentId ? 'amendment' : 'initial_signout',
        createdBy: { userId: signingUser?.id ?? 'unknown', userName: signingUser?.name ?? 'Unknown User' },
        pdfBase64, generationError,
        synopticAnswersSnapshot: activeInstance.answers,
        instanceId: activeInstance.instanceId,
        amendmentRecordId: releasedAmendmentId,
      });
    }

    return releasedAmendmentId;
  }, [caseData, activeReportInstanceId, signingUser, generateReportPdfSnapshot, showToast, setCaseData]);

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
  // Real replacement for Add Orders' old "Blocks/Recut" tab — appends
  // an actual HistologyBlock to specimen.blocks (what the Material tree
  // reads from), not the old cassette_key/total_cassettes free-text
  // fields on the grossing report, which the tree never read and would
  // have made a new block invisible in the tree that triggered adding it.
  // ── LIS order requests — Blocks/Recuts and Stains ───────────────────────
  // Real, well-defined HL7 entities (ORM^O01-style order messages) — this
  // is the one seam both should go through, so the real formatter/receiver
  // work planned for the next couple weeks has a single, obvious place to
  // land rather than being scattered across every caller. Applies
  // identically in both modes: PathScribe doesn't run the physical bench
  // in either Orchestration or CoPilot — the order always has to leave
  // the app to actually happen. Today this is a simulated round-trip
  // (a delay + success), not a real outbound HL7 message — nothing here
  // should be read as more real than that until the actual formatter
  // exists.
  //
  // Real implementation would likely:
  //   1. Build an ORM^O01 (or site-specific order message) from `order`
  //   2. Send via whatever transport the site's LIS integration uses
  //      (MLLP/TCP, a message broker, a REST gateway — site-dependent)
  //   3. This function's Promise should resolve once the LIS
  //      acknowledges receipt (an ACK segment), not before
  //   4. A *separate* inbound listener (not this function) would handle
  //      receiving the eventual ORU^R01 result message and update the
  //      matching StainOrder's status — that's a different code path,
  //      not something this send function does itself
  const handleAddBlock = useCallback(async (specimenId: string) => {
    if (!caseData) return;
    const specimens = caseData.specimens ?? [];
    const sp = specimens.find((s: any) => s.id === specimenId);
    if (!sp) return;

    const existingBlocks = (sp as any).blocks ?? [];
    const nextNumber = existingBlocks.length + 1;
    const newBlock = {
      id: `blk-${specimenId}-${Date.now().toString(36)}`,
      label: String(nextNumber),
      status: 'Grossed',
      stains: [],
    };

    showToast('Sending block/recut request to LIS…');
    const result = await sendMaterialOrderToLis({ kind: 'block_recut', specimenId, label: newBlock.label });
    if (!result.ok) {
      showToast('LIS did not acknowledge the request — nothing was recorded. Try again.');
      return;
    }

    const updatedSpecimens = specimens.map((s: any) =>
      s.id === specimenId ? { ...s, blocks: [...existingBlocks, newBlock] } : s
    );
    const updated = { ...caseData, specimens: updatedSpecimens, updatedAt: new Date().toISOString() } as any;
    setCaseData(updated);
    caseRouter.updateCase(caseData.id, { specimens: updatedSpecimens }).catch(console.error);
    markDirty('Blocks');
    showToast(`Block ${sp.label}${nextNumber} requested — sent to LIS`);
  }, [caseData, sendMaterialOrderToLis]);

  // StainMultiSelect (inside BlockStainEditorModal) was committing new
  // stain orders straight to local state, bypassing this seam entirely —
  // the same gap handleAddBlock had before it was wired. This is the fix
  // for that: the picker now awaits this before adding anything locally.
  const handleSendStainOrder = useCallback(async (specimenId: string, blockId: string, stainName: string): Promise<{ ok: boolean }> => {
    const result = await sendMaterialOrderToLis({ kind: 'stain', specimenId, label: stainName });
    if (!result.ok) {
      showToast(`LIS did not acknowledge the ${stainName} order — nothing was recorded. Try again.`);
    }
    return result;
  }, [sendMaterialOrderToLis]);

  const handleGrossComplete = useCallback(async () => {
    if (!caseData) return;

    const draftGrossing = (caseData.grossingReports ?? []).filter(g => g.status === 'draft');
    if (draftGrossing.length === 0) return;

    // Every specimen needs something entered — no partial submissions.
    // A specimen with a draft grossing report but zero answers (never
    // opened, or opened and left blank) blocks the whole case from
    // completing Gross, same as any other required-field gate in this
    // app. This is deliberately strict: there's no override, because
    // grossing is direct physical observation a human has to actually
    // record, not something that can be reasonably skipped or inferred.
    const specimensWithoutAnswers = (caseData.specimens ?? []).filter(sp => {
      const spGrossing = (caseData.grossingReports ?? []).filter(g => g.specimenId === sp.id);
      if (spGrossing.length === 0) return true; // no grossing report at all for this specimen
      return !spGrossing.some(g =>
        Object.values(g.answers ?? {}).some(v => v !== '' && !(Array.isArray(v) && !v.length))
      );
    });
    if (specimensWithoutAnswers.length > 0) {
      const labels = specimensWithoutAnswers.map(sp => sp.label).join(', ');
      showToast(
        specimensWithoutAnswers.length === 1
          ? `Specimen ${labels} has no grossing entered yet — complete every specimen before finishing Gross`
          : `Specimens ${labels} have no grossing entered yet — complete every specimen before finishing Gross`
      );
      return;
    }

    const isUpdate = draftGrossing.some(g => g.previouslyFinalized);

    let reason = '';
    if (isUpdate) {
      // Matches the Grossing SOP's own audited-correction precedent for
      // post-handoff cassette edits ("must be flagged, logged with a
      // timestamp, and require a user-entered reason for modification").
      // MVP reason capture via prompt() — a dedicated modal (matching
      // RequestReviewModal/PoolClaimModal's pattern) is the real long-term
      // UI here, not a browser prompt.
      const entered = window.prompt('Reason for updating Gross (required for audit trail):');
      if (!entered || !entered.trim()) {
        showToast('Update cancelled — a reason is required');
        return;
      }
      reason = entered.trim();
    }

    const nowIso = new Date().toISOString();

    try {
      const grossingReports = (caseData.grossingReports ?? []).map(g =>
        g.status === 'draft'
          ? { ...g, status: 'finalized' as const, previouslyFinalized: true, updatedAt: nowIso }
          : g
      );

      // Snapshot finalized instances' answers now, so the useEffect below
      // can detect a future edit by diffing against this. Stored in a ref,
      // not state — purely internal bookkeeping, shouldn't trigger renders.
      grossingReports
        .filter(g => g.status === 'finalized')
        .forEach(g => grossingSnapshotRef.current.set(g.instanceId, JSON.stringify(g.answers)));

      const templateModule = await import('@/services/templates/templateService');
      const evalWarnings: string[] = [];

      const grossingAnswersBySpecimen = new Map<string, Array<{ fieldId: string; fieldLabel: string; displayValue: string }>>();
      await Promise.all(grossingReports.map(async g => {
        try {
          const detail = await templateModule.getTemplate(g.templateId);
          const fieldsById = new Map<string, { label?: string }>(
            detail.template.sections.flatMap((s: any) => s.fields).map((f: any): [string, { label?: string }] => [f.id, f])
          );
          const resolved = Object.entries(g.answers).map(([fieldId, value]) => {
            const field = fieldsById.get(fieldId);
            const label = field?.label ?? fieldId;
            const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
            return { fieldId, fieldLabel: label, displayValue };
          });
          grossingAnswersBySpecimen.set(g.specimenId, resolved);
        } catch (e) {
          evalWarnings.push(`Could not resolve Grossing template '${g.templateId}' for specimen '${g.specimenId}' — its answers won't appear in Stage 1 evaluation context`);
        }
      }));

      // RESOLVED (was previously flagged as an unconfirmed assumption):
      // listTemplates() returns the raw PROTOCOL_REGISTRY entries from
      // protocolShared.tsx with no field-stripping, so isDiagnostic flows
      // through untouched — confirmed by reading templateService.ts directly.
      // Filtering on isDiagnostic (default true) rather than category !==
      // 'GROSSING' matches the architecture's own stated principle (see
      // workflow summary §3): the real axis is diagnostic/registry-bound
      // vs. not, not Custom-vs-CAP or category-string equality. Today this
      // is behaviorally identical (only the three Grossing templates have
      // isDiagnostic: false), but it correctly excludes any FUTURE
      // non-diagnostic template that isn't categorized 'GROSSING' too.
      const allTemplates = await templateModule.listTemplates('published');
      const availableTemplates = (allTemplates as any[])
        .filter(t => t.isDiagnostic !== false)
        .map(t => ({ id: t.id, name: t.name, category: t.category }));

      const specimens = (caseData.specimens ?? []).map(sp => ({
        specimenId: sp.id,
        specimenLabel: sp.label,
        specimenDesc: sp.description,
        // Populated with whatever's currently assigned, regardless of
        // whether this is a first finalize (empty) or a re-finalize
        // (already has entries) — same input shape either way, which is
        // exactly what lets evaluateSynopticAssignment decide add vs.
        // replace vs. remove vs. nothing, without this handler needing to
        // know which case it's in.
        currentSynoptics: (caseData.synopticReports ?? [])
          .filter(r => r.specimenId === sp.id)
          .map(r => ({ instanceId: r.instanceId, templateId: r.templateId, templateName: r.templateName })),
        grossingAnswers: grossingAnswersBySpecimen.get(sp.id),
      }));

      const evaluationInput = {
        caseText: {
          gross:       caseData.diagnostic?.grossDescription ?? '',
          microscopic: caseData.diagnostic?.microscopicDescription ?? '',
          ancillary:   caseData.diagnostic?.ancillaryStudies ?? '',
        },
        specimens,
        availableTemplates,
      };

      // Persist first — Gross Complete/Update Gross should succeed even if
      // Stage 1 evaluation below fails or is slow.
      const patch: Record<string, unknown> = { grossingReports };

      // Same work-based gate as before (not a status-string check): only
      // advance/revert caseData.status if no real diagnostic work has
      // begun yet. On a first finalize this naturally sets 'gross-complete'.
      // On a re-finalize where a pathologist has already started real
      // work, status is left alone entirely — the correction stands on
      // its own in the audit trail without disrupting that work.
      const hasRealDiagnosticWorkBegun =
        (caseData.synopticReports ?? []).some(r => Object.keys(r.answers ?? {}).length > 0) ||
        !!(caseData.diagnostic?.microscopicDescription?.trim());
      if (!hasRealDiagnosticWorkBegun) {
        patch.status = 'gross-complete' as CaseStatus;
      }

      await caseRouter.updateCase(caseData.id, patch as any);
      setCaseData({ ...caseData, ...patch } as typeof caseData);

      log(isUpdate ? 'gross_updated' : 'gross_complete', {
        caseId: caseData.id,
        accession: caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber,
        specimenCount: specimens.length,
        ...(isUpdate ? { reason } : {}),
      });

      // Gross-Driven AI toggle (Config → AI Behavior) — previously
      // persisted correctly but read by nothing, confirmed by searching
      // the whole codebase for grossEnabled outside the settings screen
      // itself before this change. Wired here: skip the evaluation
      // entirely when disabled, rather than run it and discard the
      // result, so a disabled toggle also means no wasted AI call.
      const aiBehaviorRes = await aiBehaviorService.get();
      const grossAiEnabled = !aiBehaviorRes.ok || aiBehaviorRes.data.grossEnabled !== false;

      if (!grossAiEnabled) {
        showToast(isUpdate ? 'Gross updated' : 'Grossing complete');
      } else {
        showToast(isUpdate ? 'Gross updated — re-evaluating synoptic assignment…' : 'Grossing complete — evaluating synoptic assignment…');

        // Lock Finalize/Finalize & Next/Sign Out while evaluation runs and
        // while any resulting review modal is open — see isEvaluatingSynopticFit.
        setIsEvaluatingSynopticFit(true);
        try {
          const { evaluateSynopticAssignment } = await import('@/services/cases/mockCaseService');
          const result = await evaluateSynopticAssignment(evaluationInput);
          const allWarnings = [...evalWarnings, ...result.warnings];
          if (allWarnings.length) {
            console.warn('[PathScribe] Stage 1 evaluation warnings:', allWarnings);
          }

          if (result.changes.length > 0) {
            handleProtocolChangesDetected(result.changes);
            // Lock stays on — showProtoReview is now true, and the combined
            // gate in BottomActionBar (isEvaluatingSynopticFit ||
            // showProtoReview) keeps Finalize disabled until the pathologist
            // resolves the modal (commit or cancel), not just until this
            // call returns.
          } else {
            showToast('No synoptic assignment changes proposed');
          }
        } finally {
          setIsEvaluatingSynopticFit(false);
        }
      }
    } catch (err) {
      console.error('[Gross Complete] Failed:', err);
      showToast((isUpdate ? 'Update Gross' : 'Gross Complete') + ' failed — please try again');
    }
  }, [caseData, log, showToast, handleProtocolChangesDetected]);

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
    drifted.forEach(g => grossingSnapshotRef.current.delete(g.instanceId));

    caseRouter.updateCase(caseData.id, { grossingReports } as any).catch(console.error);
    setCaseData(prev => prev ? ({ ...prev, grossingReports } as typeof prev) : prev);
  }, [caseData?.grossingReports]);

  const handleProtoCommit = useCallback(async (acceptedIds: string[]) => {
    setShowProtoReview(false);
    // FIELD NAMES CONFIRMED against ProtocolChangeModal.tsx's real ProtocolChange
    // type (June 2026). Previous version matched on `instanceId`, which never
    // existed on this type — every match silently failed and "Apply" was a
    // no-op that still logged success. Fixed to match on currentInstanceId
    // (falling back to specimenId + currentTemplateId for older callers that
    // don't set it), and to handle all three real actions: replace, add, remove.
    //
    // AI suggestions for a newly-assigned template: the previous version of
    // this function left answers/aiSuggestions empty with a comment claiming
    // "AI suggestions populate it on the next evaluation/render pass" — traced
    // that claim directly and it was false. RightSynopticPanel's load effect
    // only ever *reads* an instance's existing aiSuggestions; nothing anywhere
    // regenerates them for an instance that arrives via this commit path
    // specifically (as opposed to the manual TemplatePicker.onSelect flow,
    // which does call generateAiSuggestionsForReport). So a template accepted
    // here would have silently rendered as a genuinely blank form. Generating
    // suggestions inline below, gated by the same Microscopic-Driven AI
    // toggle as every other suggestion-generation call.
    if (acceptedIds.length > 0 && caseData) {
      const accepted = protoChanges.filter(c => acceptedIds.includes(c.id));
      const nowIso = new Date().toISOString();

      const matchesExisting = (change: ProtocolChange, r: SynopticReportInstance) =>
        change.currentInstanceId
          ? r.instanceId === change.currentInstanceId
          : r.specimenId === change.specimenId && r.templateId === change.currentTemplateId;

      const behaviorRes = await aiBehaviorService.get();
      const microAiEnabled = !behaviorRes.ok || behaviorRes.data.microscopicEnabled !== false;

      const generateSuggestionsFor = async (templateId: string): Promise<Record<string, string | string[]>> => {
        if (!microAiEnabled || !templateId) return {};
        try {
          const templateModule = await import('@/services/templates/templateService');
          const { generateAiSuggestionsForReport } = await import('@/services/cases/mockCaseService');
          const detail = await templateModule.getTemplate(templateId);
          const allFields = detail.template.sections.flatMap((s: any) => s.fields);
          const suggestions = await generateAiSuggestionsForReport(caseData, templateId, allFields, computationalResults);
          return suggestions as any;
        } catch (e) {
          console.error('[PathScribe] AI suggestion generation for newly-assigned template failed:', e);
          return {};
        }
      };

      let reports = [...(caseData.synopticReports ?? [])];

      for (const change of accepted) {
        const action = change.action ?? 'replace';

        if (action === 'remove') {
          reports = reports.filter(r => !matchesExisting(change, r));
          continue;
        }

        if (action === 'add') {
          const aiSuggestions = await generateSuggestionsFor(change.proposedTemplateId ?? '');
          reports.push({
            instanceId:   `${change.specimenId}_${change.proposedTemplateId}_${Date.now()}`,
            specimenId:   change.specimenId,
            templateId:   change.proposedTemplateId ?? '',
            templateName: change.proposedTemplateName ?? '',
            // Empty answers (no prior answers exist to carry forward for a
            // brand-new synoptic) — but aiSuggestions above is real, not
            // assumed; pathologist still explicitly confirms/overrides each
            // field, same as any other AI-suggested value.
            answers:      {},
            aiSuggestions,
            status:       'draft',
            createdAt:    nowIso,
            updatedAt:    nowIso,
          } as any);
          continue;
        }

        // action === 'replace'
        const aiSuggestions = await generateSuggestionsFor(change.proposedTemplateId ?? '');
        reports = reports.map(r => {
          if (!matchesExisting(change, r)) return r;
          return {
            ...r,
            templateId:   change.proposedTemplateId ?? r.templateId,
            templateName: change.proposedTemplateName ?? r.templateName,
            updatedAt:    nowIso,
            // Answers cleared, not carried over — the old answers are keyed
            // to the OLD template's field IDs, which a different template
            // isn't guaranteed to share; carrying them forward silently
            // risks misattributing a value to the wrong field under the new
            // schema. Real AI suggestions generated above stand in instead —
            // still pathologist-confirmed per field, not auto-applied.
            answers:      {},
            aiSuggestions,
          } as any;
        });
      }

      const patch = { synopticReports: reports };

      caseRouter.updateCase(caseData.id, patch as any).then(() => {
        setCaseData({ ...caseData, ...patch } as typeof caseData);
        log('protocol_change_committed', {
          caseId: caseData.id,
          acceptedCount: acceptedIds.length,
          totalProposed: protoChanges.length,
          actions: accepted.map(c => c.action ?? 'replace'),
        });
      }).catch(console.error);
    }
  }, [protoChanges, caseData, log, computationalResults]);

  const handleRequestFinalize = useCallback(async (andNext: boolean) => {
    setFinalizeAndNextPending(andNext);
    if (!synopticPanelRef.current) {
      setPreFinalSynoptics(await buildSynopticsForReview());
      setShowPreFinalise(true);
      return;
    }
    const missing = synopticPanelRef.current.validateRequired();
    if (missing.length > 0) { setMissingFields(missing); setShowMissingWarning(true); return; }
    const uncertain = synopticPanelRef.current.getUncertainRequiredFields();
    if (uncertain.length > 0) { setReviewFields(uncertain); setFinalizeAndNextPending(andNext); setShowAiReview(true); return; }
    const deferred = (caseData?.synopticReports ?? []).filter((r: any) => r.status === 'deferred');
    if (deferred.length > 0) {
      const names = deferred.map((r: any) => r.templateName).join(', ');
      // Note: deferred check handled by PreFinalisationModal advisory panel
      console.info('[Finalise] Deferred synoptics:', names);
    }
    setPreFinalSynoptics(await buildSynopticsForReview());
    setShowPreFinalise(true);
  }, [buildSynopticsForReview, caseData, setMissingFields, setShowMissingWarning, setReviewFields, setShowAiReview, setFinalizeAndNextPending, setPreFinalSynoptics, setShowPreFinalise]);

  const handlePreFinalConfirm = useCallback((_ordered: string[], _excluded: string[]) => {
    setShowPreFinalise(false);
    // Credentials already verified inside PreFinalisationModal.
    // _ordered is the pathologist's final section/synoptic ordering choice
    // from the drag-to-reorder interaction — display order only, not
    // persisted here since it doesn't affect report content or status.
    //
    // ROOT FIX — this is the PRIMARY finalize path (PreFinalisationModal
    // shows the full report; this is what runs when there's nothing
    // requiring the AI-review fallback). It previously called only
    // finalizeCase(), fire-and-forget, with zero amendment/addendum
    // awareness — meaning an in-progress amendment finalized through the
    // normal expected flow would NEVER get released at all, regardless
    // of any race condition. Now shares the same fixed logic as the
    // fallback path (handleFinalizeConfirm), properly sequenced.
    (async () => {
      const succeeded = await finalizeCase(_excluded);
      if (succeeded) await releasePendingAmendmentOrAddendum();
    })();
  }, [finalizeCase, releasePendingAmendmentOrAddendum]);

  const [deferredAmendmentContext, setDeferredAmendmentContext] = React.useState<{ title: string; prefill: string } | null>(null);

  const handleFinalizeConfirm = useCallback(() => {
    if (synopticPanelRef.current) {
      const { verificationSummary } = synopticPanelRef.current.sweepAndGetFinalState();
      console.info('[PathScribe] Finalization sweep:', verificationSummary);
    }
    setShowFinalizeModal(false);

    // ── Level 1 AI learning — capture narrative edit signals ──────────────────
    // Record the diff between AI-generated text and pathologist's final version
    // for each orchestration section. Stored for future few-shot / fine-tuning.
    if (isOrchestrationMode && orchSections.length > 0) {
      import('@/services/narrativeSignals/mockNarrativeSignalService').then(
        async ({ mockNarrativeSignalService, computeEditRatio }) => {
          const { deidentifySignal } = await import('@/services/narrativeSignals/deidentification');

          // ── Resolve the active study (if any) covering this case ───────────
          // Previously: studyId always read (caseData as any)?.activeStudyId,
          // a field NOTHING in the codebase ever sets — every real signal got
          // studyId: undefined regardless of whether an active study's scope
          // actually covered this case/pathologist/subspecialty. The matching
          // logic already existed (getStudyForCase), it was just never called
          // anywhere. Calling it here, at signal-capture time, is correct
          // because study membership is evaluated per-case at the moment of
          // finalization, not stored ahead of time.
          let resolvedStudyId: string | undefined;
          try {
            const { mockValidationStudyService } = await import('@/services/validationStudies/mockValidationStudyService');
            const clientId       = (caseData?.order as any)?.clientId ?? '';
            const pathologistId  = signingUser?.id ?? '';
            const subspecialtyId = (caseData as any)?.subspecialtyId;
            const studyResult = await mockValidationStudyService.getStudyForCase(clientId, pathologistId, subspecialtyId);
            if ((studyResult as any).ok && (studyResult as any).data) {
              resolvedStudyId = (studyResult as any).data.id;
            }
          } catch (e) {
            console.error('[PathScribe] Study lookup failed — signals will record without studyId:', e);
          }

          const signals = orchSections
            .filter(s => s.aiGenerated || s.text)
            .map(s => {
              const editRatio = computeEditRatio(s.aiGenerated, s.text);
              const deid      = deidentifySignal(s.aiGenerated, s.text, editRatio);
              return {
                caseId:             caseData?.id ?? '',
                accessionNumber:    caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? '',
                reportTemplateId:   (caseData as any)?.resolvedReportTemplateId ?? 'tmpl-gold-standard',
                templateName:       s.label,
                sectionId:          s.id,
                sectionTitle:       s.label,
                aiGeneratedClean:   deid.aiGeneratedClean,
                finalTextClean:     deid.finalTextClean,
                structuralEditType: deid.structuralEditType,
                replacementCount:   deid.replacementCount,
                editRatio,
                wasAccepted:        s.aiGenerated === s.text && !!s.aiGenerated,
                subspecialtyId:     (caseData as any)?.subspecialtyId,
                studyId:            resolvedStudyId,
              };
            });
          mockNarrativeSignalService.recordSignals(signals).then(() => {
            console.info(`[PathScribe] Recorded ${signals.length} de-identified signal(s)${resolvedStudyId ? ` for study ${resolvedStudyId}` : ' (no active study match)'}`);
          });
        }
      ).catch(console.error);
    }

    const activeReport = caseData?.synopticReports?.find(r => r.instanceId === activeReportInstanceId) as any;
    if (caseData?.status === 'finalized' && activeReport?.status === 'deferred') {
      // Case is ALREADY finalized — this is the amendment path for a
      // deferred synoptic now being completed, not a first-time finalize.
      // Do not re-run finalizeCase() here; that would double-log the
      // case_finalized audit event for a case that's already finalized.
      const completedFields = Object.entries(activeReport.answers ?? {})
        .filter(([, v]) => v && (Array.isArray(v) ? (v as string[]).length > 0 : (v as string).trim()))
        .map(([k]) => k).join(', ');
      const pendingNote = activeReport.deferredPending ? ` (${activeReport.deferredPending})` : '';
      setDeferredAmendmentContext({
        title: activeReport.templateName ?? 'Deferred Synoptic',
        prefill: `Amendment — completion of deferred synoptic${pendingNote}: ${activeReport.templateName ?? ''}.

Ancillary results now available. Completed fields: ${completedFields || 'see synoptic report'}.

Original report issued pending ancillary studies. This amendment incorporates the completed findings.`,
      });
      setAmendmentMode('amendment');
      setShowAmendmentModal(true);
      openAmendmentDraft('amendment');
    } else {
      // Genuine first-time finalize OR amendment/addendum completion —
      // properly sequenced now: finalizeCase() first (awaited, not
      // fire-and-forget), THEN the amendment/addendum release, so there's
      // no race between the two independently updating caseData from
      // stale closures. Previously finalizeCase() ran fire-and-forget
      // while this same logic ran inline right after it — whichever one's
      // setCaseData call resolved last would silently clobber the other,
      // which is exactly why the "AMENDMENT IN PROGRESS" banner stayed
      // stuck inconsistently rather than every time.
      (async () => {
        const succeeded = await finalizeCase();
        if (succeeded) await releasePendingAmendmentOrAddendum();
      })();
    }
  }, [setShowFinalizeModal, showToast, caseData, activeReportInstanceId, setAmendmentMode, setShowAmendmentModal, isOrchestrationMode, orchSections, finalizeCase, releasePendingAmendmentOrAddendum]);

  const [amendmentDraftId, setAmendmentDraftId] = React.useState<string | null>(null);
  const [amendmentSequenceNumber, setAmendmentSequenceNumber] = React.useState(1);
  const [amendmentSubmitError, setAmendmentSubmitError] = React.useState<string | null>(null);
  const [versionHistory, setVersionHistory] = React.useState<VersionHistoryEntry[]>([]);
  const [preOverrideSnapshot, setPreOverrideSnapshot] = React.useState<Record<string, unknown> | null>(null);
  const [pendingFieldOverrides, setPendingFieldOverrides] = React.useState<Record<string, FieldOverride>>({});
  const [resumingAmendment, setResumingAmendment] = React.useState<{ clinicianName?: string; method?: NotificationMethod; notifiedAt?: string } | undefined>(undefined);

  // Opens a real draft record the moment the modal appears — captures
  // initiatedAt now, distinct from whenever it's actually released,
  // matching the spec's explicit "date/time workspace was opened"
  // requirement rather than only timestamping at submit.
  const openAmendmentDraft = useCallback(async (mode: 'amendment' | 'addendum') => {
    if (!caseData?.id) return;
    setAmendmentSubmitError(null);
    const res = await amendmentService.startDraft({
      caseId: caseData.id, type: mode,
      authoringPathologist: { userId: signingUser?.id ?? 'unknown', userName: signingUser?.name ?? 'Unknown User' },
    });
    if (res.ok) { setAmendmentDraftId(res.data.id); setAmendmentSequenceNumber(res.data.sequenceNumber); }

    // Delta step needs the true pre-amendment baseline captured NOW,
    // before any field overrides get applied below — not re-cloned
    // later at Save Draft time, which would already include overrides.
    const activeInstance = (caseData.synopticReports ?? []).find((r: any) => r.instanceId === activeReportInstanceId);
    setPreOverrideSnapshot(activeInstance ? structuredClone(activeInstance.answers) : null);

    const versionRes = await reportVersionService.getByCaseId(caseData.id);
    if (versionRes.ok) {
      const history = versionRes.data
        .filter(v => v.instanceId === activeReportInstanceId && v.synopticAnswersSnapshot)
        .sort((a, b) => a.versionNumber - b.versionNumber)
        .map(v => ({ versionNumber: v.versionNumber, releasedAt: v.createdAt, createdBy: v.createdBy, synopticAnswersSnapshot: v.synopticAnswersSnapshot! }));
      setVersionHistory(history);
    }

    // Per the triage spec's Exit Gate B — starting a real amendment IS
    // the pathologist's decision that changes are needed, so any
    // pending LIS notice transitions to synoptic_amended, not
    // acknowledged. The case stays rooted in triage regardless (an open
    // draft keeps it there), but the notice itself is no longer
    // "awaiting a decision" — the decision was just made.
    if (pendingLisNotice) {
      await lisAmendmentNoticeService.updateStatus(pendingLisNotice.id, 'synoptic_amended');
      setPendingLisNotice(null);
    }
  }, [caseData, signingUser, pendingLisNotice, activeReportInstanceId]);

  const handleFieldOverridesConfirmed = useCallback((overrides: Record<string, FieldOverride>) => {
    if (!caseData || !activeReportInstanceId) return;
    setPendingFieldOverrides(overrides);
    if (Object.keys(overrides).length === 0) return;

    const now = new Date().toISOString();
    const chosenBy = { userId: signingUser?.id ?? 'unknown', userName: signingUser?.name ?? 'Unknown User' };

    const updatedReports = (caseData.synopticReports ?? []).map((r: any) => {
      if (r.instanceId !== activeReportInstanceId) return r;
      const newAnswers = { ...r.answers };
      const newLineage = { ...(r.fieldLineage ?? {}) };
      const newAiSuggestions = { ...(r.aiSuggestions ?? {}) };
      for (const [key, o] of Object.entries(overrides)) {
        newAnswers[key] = o.value;
        newLineage[key] = { fieldKey: key, value: o.value, sourceVersionNumber: o.sourceVersionNumber, chosenAt: now, chosenBy, wasOverride: true };
        // Per feedback: only fields that actually changed should lose
        // their AI-confirmed badge. Untouched fields genuinely were
        // reviewed and remain correct — leaving their verification
        // alone is the right call, not a shortcut. 'disputed' already
        // exists on AiFieldVerification for exactly this case; no new
        // status needed.
        if (newAiSuggestions[key]) {
          newAiSuggestions[key] = { ...newAiSuggestions[key], verification: 'disputed' };
        }
      }
      return { ...r, answers: newAnswers, fieldLineage: newLineage, aiSuggestions: newAiSuggestions };
    });
    setCaseData({ ...caseData, synopticReports: updatedReports } as any);
    caseRouter.updateCase(caseData.id, { synopticReports: updatedReports } as any).catch(console.error);
  }, [caseData, activeReportInstanceId, signingUser, setCaseData]);

  // Real gap fixed here: the "Amend" button always started a brand new
  // draft via openAmendmentDraft, even when the active instance already
  // had one in progress (pendingAmendmentId set) — creating an orphaned
  // duplicate AmendmentRecord instead of reopening the real one. Now it
  // checks first and resumes the existing draft's reason/notification
  // for editing when one exists.
  const handleRequestAmendment = useCallback(async () => {
    setAmendmentMode('amendment');
    const activeInstance = (caseData?.synopticReports ?? []).find((r: any) => r.instanceId === activeReportInstanceId);

    if (activeInstance?.pendingAmendmentId && caseData?.id) {
      const res = await amendmentService.getByCaseId(caseData.id);
      const record = res.ok ? res.data.find(r => r.id === activeInstance.pendingAmendmentId) : undefined;
      if (record) {
        setAmendmentDraftId(record.id);
        setAmendmentSequenceNumber(record.sequenceNumber);
        setAmendmentText(record.explanationOfChange ?? '');
        setResumingAmendment({
          clinicianName: record.notification?.clinicianName,
          method: record.notification?.method,
          notifiedAt: record.notification?.notifiedAt,
        });
        setShowAmendmentModal(true);
        return;
      }
    }

    // No existing draft on this instance — genuinely new amendment.
    setResumingAmendment(undefined);
    setShowAmendmentModal(true);
    openAmendmentDraft('amendment');
  }, [caseData, activeReportInstanceId, openAmendmentDraft]);

  const handleAmendmentSubmit = useCallback(async (fields: { addendumTitle?: string; explanationOfChange?: string; clinicianName?: string; method?: NotificationMethod; notifiedAt?: string }) => {
    if (!amendmentDraftId) return;
    const notification = fields.clinicianName && fields.method
      ? { clinicianName: fields.clinicianName, method: fields.method, notifiedAt: fields.notifiedAt ?? new Date().toISOString() }
      : undefined;

    // Real architectural extension: this used to be CoPilot-only
    // (isCopilotAmendment required reportingMode === 'copilot'). Real
    // gap, caught directly: Orchestration's amendment needs the exact
    // same two-stage unlock-and-re-edit behavior — stay open across
    // sessions, only clear from triage at actual re-finalize — not the
    // single-stage append-only behavior this had before. Stage 2
    // (finalizeSignOut) already checks for pendingAmendmentId
    // mode-agnostically, so this is the only change needed to make
    // both modes work identically here.
    const isUnlockAmendment = amendmentMode === 'amendment';

    if (isUnlockAmendment) {
      // Stage 1 only — captures Reason + Notification up front and
      // unlocks the template. Nothing transmitted yet; that's Stage 2,
      // which fires for real at actual re-sign-out (see
      // handleSignOutConfirm), not here.
      if (!caseData?.id || !activeReportInstanceId) return;

      // The real snapshot — but now sourced from preOverrideSnapshot,
      // captured back when the draft first opened (before the Delta
      // step could apply any field overrides). Re-cloning caseData
      // here directly would incorrectly bake any confirmed overrides
      // into what's supposed to be the untouched "before" record,
      // destroying the whole point of the delta/lineage trail.
      const originalInstance = (caseData.synopticReports ?? []).find((r: any) => r.instanceId === activeReportInstanceId);
      const originalReportSnapshot = originalInstance
        ? { ...structuredClone(originalInstance), answers: preOverrideSnapshot ?? structuredClone(originalInstance.answers) }
        : null;

      const res = await amendmentService.captureFields(amendmentDraftId, {
        explanationOfChange: fields.explanationOfChange ?? '',
        notification: notification!,
        originalReportSnapshot,
      });
      if (!res.ok) { setAmendmentSubmitError('error' in res ? res.error : 'Could not proceed — check required fields.'); return; }

      const unlockedReports = (caseData.synopticReports ?? []).map((r: any) =>
        r.instanceId === activeReportInstanceId
          ? { ...r, status: 'draft', previouslyFinalizedForAmendment: true, pendingAmendmentId: amendmentDraftId }
          : r
      );
      setCaseData({ ...caseData, status: 'amended' as CaseStatus, synopticReports: unlockedReports } as any);
      caseRouter.updateCase(caseData.id, { status: 'amended' as CaseStatus, synopticReports: unlockedReports } as any).catch(console.error);
      showToast('Report unlocked for correction — edit the synoptic fields, then re-finalize and sign out to transmit.');

      setAmendmentSubmitError(null);
      setShowAmendmentModal(false);
      setAmendmentDraftId(null);
      setAmendmentText('');
      return;
    }

    // Single-stage — addenda (both modes), and Orchestration amendments
    // (which append a record rather than unlock/re-edit anything, so
    // there's no separate re-sign-out transmission step to wait for).
    // Single-stage — addenda only. Amendments (both modes now) go
    // through the unlock-and-re-edit path above and never reach here.
    const res = await amendmentService.release(amendmentDraftId, {
      addendumTitle: fields.addendumTitle,
      explanationOfChange: fields.explanationOfChange,
      notification,
      body: amendmentText,
    });
    if (!res.ok) { setAmendmentSubmitError('error' in res ? res.error : 'Could not release — check required fields.'); return; }

    setAmendmentSubmitError(null);
    setShowAmendmentModal(false);
    setAmendmentDraftId(null);
    showToast(`${amendmentMode === 'addendum' ? 'Addendum' : 'Amendment'} released`);
    setAmendmentText('');
  }, [amendmentDraftId, amendmentMode, amendmentText, caseData, activeReportInstanceId, setAmendmentText, setShowAmendmentModal, showToast, setCaseData, preOverrideSnapshot]);

  // ── Orchestrator handlers ──────────────────────────────────

  // ── Orchestrator callbacks ─────────────────────────────────────────────────
  const buildOrchCallbacks = useCallback((): OrchestratorCallbacks => ({
    onSectionStart: (sectionId, title) => {
      setOrchSections(prev => {
        const exists = prev.find(s => s.id === sectionId);
        if (exists) {
          // CRITICAL: a regenerate must start the new stream from a blank
          // slate. Two distinct cases:
          //  • userEdited (accepted) sections — the committed `text` is
          //    the pathologist's signed-off version and must stay exactly
          //    as-is, untouched, for the whole regenerate. The new stream
          //    accumulates in `pendingDraft` only (onToken below), same as
          //    before. Clearing pendingDraft here (not undefined-merging
          //    onto whatever was left over) ensures the new draft starts
          //    from nothing.
          //  • not-yet-accepted (AI-generated or empty) sections — `text`
          //    IS the live preview, so it must also be reset to '' here.
          //    Previously it wasn't, so a regenerate's onToken branch
          //    (`s.text + token`) appended fresh tokens directly onto the
          //    end of the PREVIOUS generation's already-wrapped HTML
          //    string (e.g. "<p>...old draft...</p>" + "**" + ...) —
          //    textToHtml's leading-'<' passthrough then handed that
          //    malformed concatenation straight to the editor unwrapped,
          //    which is what produced the orphaned "**" fragment.
          return prev.map(s => s.id === sectionId
            ? (s.userEdited
                ? { ...s, isStreaming: true, pendingDraft: '' }
                : { ...s, isStreaming: true, pendingDraft: undefined, text: '' })
            : s);
        }
        return [...prev, { id: sectionId, label: title, type: 'narrative' as const, text: '', aiGenerated: '', userEdited: false, isStreaming: true }];
      });
    },
    onToken: (sectionId, token) => {
      setOrchSections(prev => prev.map(s => {
        if (s.id !== sectionId) return s;
        // userEdited (accepted) sections: stream into pendingDraft only —
        // `text` (the committed version) must stay untouched until the
        // pathologist explicitly chooses "Use new draft".
        if (s.userEdited) return { ...s, pendingDraft: (s.pendingDraft ?? '') + token };
        // Not-yet-accepted sections: `text` was just reset to '' in
        // onSectionStart, so this is a clean accumulation, not a
        // concatenation onto stale content.
        return { ...s, text: s.text + token };
      }));
    },
    onSectionComplete: (sectionId, result) => {
      const html = textToHtml(result.text ?? '');
      setOrchSections(prev => prev.map(s => {
        if (s.id !== sectionId) return s;
        // Accepted section: `text` (the pathologist's signed-off version)
        // is left exactly as it was — the finished regenerate result lands
        // in `pendingDraft`, surfacing the "New AI draft available — Use
        // new draft / Keep my version" banner. Nothing is overwritten
        // until the pathologist explicitly chooses.
        if (s.userEdited) return { ...s, isStreaming: false, pendingDraft: html };
        return { ...s, isStreaming: false, text: html, aiGenerated: html };
      }));
    },
    onComplete: () => {
      setIsOrchestrating(false);
      setLastGeneratedAt(new Date());
      engineRef.current = null;
      abortRef.current  = null;
    },
    onError: (_sectionId, error) => {
      setIsOrchestrating(false);
      engineRef.current = null;
      abortRef.current  = null;
      showToast(`Generation error: ${error}`);
    },
  }), [showToast]);

  const handleGenerateReport = useCallback(async () => {
    if (!caseData) return;
    setIsOrchestrating(true);
    safeSetLeftTab('draft');
    try {
      // Build context async — resolves routing rules from service.
      // If the pathologist has overridden the template via Change ▾, pass
      // it straight through — buildContext resolves the override via the
      // same real Parts/Assembly path as auto-routing, so there is exactly
      // one place template→sections resolution happens, not two kept "in
      // sync." (Previously this block re-derived narrativeTemplate here via
      // the registry directly — that divergent path is gone.)
      const ctx = await buildContext(caseData, signingUser, overrideTemplateId || undefined);
      setResolvedContext(ctx);

      // Capture resolved template for display — reflects an active
      // override in the centre pane header, not the auto-resolved name.
      setResolvedTemplateId(ctx.narrativeTemplate.templateId);
      setResolvedTemplateName(ctx.narrativeTemplate.templateName);
      setResolvedBy(overrideTemplateId ? 'pathologist-override' : (ctx.routingResolvedBy ?? 'gold-standard'));
      const engine = new OrchestratorEngine(undefined, ctx as any, buildOrchCallbacks());
      engineRef.current = engine;
      await engine.run();
    } catch (e: any) {
      if (e?.name !== 'AbortError') showToast(`Generation failed: ${e?.message ?? 'Unknown'}`);
      setIsOrchestrating(false);
      engineRef.current = null;
      abortRef.current  = null;
    }
  }, [caseData, buildOrchCallbacks, showToast, overrideTemplateId]);

  const handleAbortGenerate = useCallback(() => {
    engineRef.current?.cancel();
    setIsOrchestrating(false);
    engineRef.current = null;
    abortRef.current  = null;
    showToast('Generation cancelled');
  }, [showToast]);

  const handleRegenerateSection = useCallback(async (sectionId: string) => {
    if (!caseData || isOrchestrating) return;
    setIsOrchestrating(true);
    try {
      // Must pass overrideTemplateId here too — regenerating a single
      // section after a pathologist override previously fell back to the
      // auto-resolved template silently, generating against the wrong
      // section's instructions. Same root cause as handleGenerateReport.
      const ctx    = await buildContext(caseData, signingUser, overrideTemplateId || undefined);
      setResolvedContext(ctx);
      const engine = new OrchestratorEngine(undefined, ctx as any, buildOrchCallbacks());
      engineRef.current = engine;
      await engine.regenerateSection(sectionId);
    } catch (e: any) {
      if (e?.name !== 'AbortError') showToast(`Regeneration failed: ${e?.message ?? 'Unknown'}`);
    } finally {
      setIsOrchestrating(false);
      engineRef.current = null;
      abortRef.current  = null;
    }
  }, [caseData, isOrchestrating, buildOrchCallbacks, showToast, overrideTemplateId]);

  // ── Auto-generate-once — Draft tab, data-state-driven ────────────────────
  // Per design discussion: NOT triggered by tab navigation alone (clicking
  // into Draft to peek shouldn't burn an AI call), and NOT silent (the
  // pathologist gets a cancelable window, not a draft that just appears).
  // Fires when ALL of the following hold simultaneously:
  //   - the pathologist has landed on the Draft tab
  //   - this is an Orchestration-mode case
  //   - no draft exists yet (orchSections is empty — won't re-fire on a
  //     second visit, and won't clobber an existing draft)
  //   - generation isn't already running
  //   - all required synoptic fields are answered (synopticPanelRef's
  //     validateRequired() — the same check already gating Finalize —
  //     returns nothing missing)
  //   - it hasn't already been attempted this case session (the ref guard
  //     below; reset whenever caseId changes)
  const autoGenerateAttemptedRef = React.useRef(false);
  const autoGenerateTimerRef     = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingAutoGenerate, setPendingAutoGenerate] = useState(false);

  useEffect(() => {
    autoGenerateAttemptedRef.current = false;
    if (autoGenerateTimerRef.current) { clearTimeout(autoGenerateTimerRef.current); autoGenerateTimerRef.current = null; }
    setPendingAutoGenerate(false);
  }, [caseId]);

  const cancelAutoGenerate = useCallback(() => {
    if (autoGenerateTimerRef.current) { clearTimeout(autoGenerateTimerRef.current); autoGenerateTimerRef.current = null; }
    setPendingAutoGenerate(false);
  }, []);

  useEffect(() => {
    if (
      leftTab !== 'draft' ||
      !isOrchestrationMode ||
      orchSections.length > 0 ||
      isOrchestrating ||
      autoGenerateAttemptedRef.current ||
      !synopticPanelRef.current
    ) return;

    const missing = synopticPanelRef.current.validateRequired();
    if (missing.length > 0) return; // not complete yet — stay quiet, no nag

    autoGenerateAttemptedRef.current = true;
    setPendingAutoGenerate(true);
    autoGenerateTimerRef.current = setTimeout(() => {
      setPendingAutoGenerate(false);
      autoGenerateTimerRef.current = null;
      handleGenerateReport();
    }, 2000);
  }, [leftTab, isOrchestrationMode, orchSections.length, isOrchestrating, handleGenerateReport]);

  // Cleanup on unmount — don't fire generation against an unmounted page.
  useEffect(() => () => {
    if (autoGenerateTimerRef.current) clearTimeout(autoGenerateTimerRef.current);
  }, []);

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  // ── Case not found ─────────────────────────────────────────────────────────
  if (isLoaded && caseNotFound) {
    return (
      <div className="ps-case-not-found">
        <div className="ps-case-not-found-icon">🔍</div>
        <div className="ps-case-not-found-title">Case not found</div>
        <div className="ps-case-not-found-subtitle">No case exists with ID <code className="ps-case-not-found-id">{caseId}</code></div>
        <button
          onClick={() => navigate('/')}
          className="ps-btn-primary ps-case-not-found-button"
        >
          ← Back to Worklist
        </button>
      </div>
    );
  }

  return (
    <div className={`ps-synrp-root ${isLoaded ? 'ps-synrp-root--loaded' : ''}`}>
      {/* Background */}
      <div className="ps-synrp-bg-image" />
      <div className="ps-synrp-bg-overlay" />
      <div className="ps-synrp-bg-gradient" />

      {/* Toast */}
      <SaveToast message={toastMsg} visible={toastVisible} />

      {/* Auto-generate-once confirmation toast — cancelable window before
          a draft is silently created from completed synoptic data. */}
      {pendingAutoGenerate && (
        <div className="ps-autogen-toast">
          <span className="ps-autogen-toast-spinner" />
          <span className="ps-autogen-toast-text">
            Synoptic complete — generating narrative draft…
          </span>
          <button
            onClick={cancelAutoGenerate}
            className="ps-autogen-toast-cancel"
          >Cancel</button>
        </div>
      )}

      {/* Shell */}
      <div className="ps-synrp-shell">

        {/* NavBar */}
        <NavBar
          onLogoClick={() => guard('/')}
          onLogout={() => setShowLogoutModal(true)}
          onProfileClick={() => setIsProfileOpen(!isProfileOpen)}
        />

        {/* HeaderBar — compact single-strip when in Report Draft (maximises editor space) */}
        <HeaderBar
          caseData={caseData}
          onNavigate={guard}
          onSignOut={() => setShowSignOutModal(true)}
          aiSynthesisStatus={aiSynthesisStatus}
          onAiStatusClick={handleAiStatusReviewClick}
          compact={isOrchestrationMode && leftTab === 'draft'}
          onChangePriority={canEditPriority ? handleChangePriority : undefined}
          priorityLevels={priorityLevels}
          deficiencyCount={caseDeficiencies.length}
          onOpenDeficiencyHistory={() => setShowDeficiencyModal(true)}
          focusedBlockId={focusedBlockEntry?.block.id}
          onOpenBlockEditor={() => setShowBlockEditor(true)}
          onCaseUpdate={updated => {
            caseRouter.updateCase(updated.id, { specimenFlags: (updated as any).specimenFlags } as any)
              .then(() => setCaseData(updated))
              .catch(console.error);
          }}
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
                onClick={() => {
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
                }}
                className="ps-alert-banner-row"
              >
                <div className="ps-alert-banner-text">
                  ⚠️ Alert — Some required fields are incomplete.{' '}
                  <span className="ps-alert-banner-link">
                    {isOrchestrationMode && leftTab === 'draft' ? 'Review required fields →' : 'Click to review →'}
                  </span>
                </div>
                <span
                  className={`ps-alert-chevron${isAlertExpanded ? ' ps-alert-chevron--expanded' : ''}`}
                  onClick={e => { e.stopPropagation(); setIsAlertExpanded(a => !a); }}
                >▼</span>
              </div>
              {isAlertExpanded && (
                <div className="ps-alert-banner-detail">
                  Review all <strong>required fields</strong> marked with * in the synoptic checklist. Ensure all required data elements are completed before finalizing.
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
              onEditSpecimen={(specimenId) => {
                const sp = caseData?.specimens?.find(s => s.id === specimenId);
                setEditingSpecimen(sp ?? null);
                setShowSpecimenEdit(true);
              }}
              onAddSpecimen={() => {
                setAddOrdersInitialTab(undefined);
                setShowAddOrdersModal(true);
              }}
              onOpenCaseComment={() => setShowCaseCommentModal(true)}
              onOpenSpecimenComment={(id) => { setActiveSpecimenCommentId(id); setShowSpecimenCommentModal(true); }}
              hasCaseComment={hasCaseComment}
              specimenComments={specimenComments}
              activeReportInstanceId={activeReportInstanceId}
              onSelectReport={(instanceId, specimenId, reportType) => {
                setActiveReportInstanceId(instanceId);
                setActiveSpecimenId(specimenId);
                setActiveReportType(reportType);
              }}
              onDeleteReport={(instanceId) => {
                if (!caseData) return;
                const remaining = (caseData.synopticReports ?? []).filter(r => r.instanceId !== instanceId);
                const updated: Case = { ...caseData, synopticReports: remaining, updatedAt: new Date().toISOString() };
                setCaseData(updated);
                markDirty('Synoptic reports');
                if (activeReportInstanceId === instanceId) {
                  setActiveReportInstanceId(remaining[0]?.instanceId ?? '');
                  setActiveSpecimenId(remaining[0]?.specimenId ?? '');
                }
              }}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(v => !v)}
            />
          </SynopticSidebar>

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
                      <span className="ps-syn-nav-strip-empty">No synoptic selected</span>
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
                const label = tab === 'draft' ? '✍️ Report Draft' : tab === 'report' ? '📑 Synoptic Reporting' : '🧱 Material';
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
                        title={`Report status: ${String(st2)}`}
                        className={`ps-syn-tab-dot ${dot2Class}`}
                      />
                    )}
                  </button>
                );
              })}

              {/* Sequencer + DEV tools — right side of tab bar.
                  Hidden in Orchestration draft mode — these move into the
                  centre Full Report pane's own header there instead, since
                  they're document-level controls, not tab-bar navigation. */}
              {!(isOrchestrationMode && leftTab === 'draft') && (
              <div className="ps-syn-tabbar-tools">
                {import.meta.env.DEV && caseData && (
                  <button
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
                    className="ps-syn-dev-btn ps-syn-dev-btn--microscopic"
                    title="DEV: Simulate microscopic slide received"
                  >
                    ⚡ Sim Microscopic
                  </button>
                )}
                {import.meta.env.DEV && caseData && (
                  <button
                    onClick={simulateLisAmendmentReceived}
                    className="ps-syn-dev-btn ps-syn-dev-btn--lis"
                    title="DEV: Simulate an amendment received from the LIS, outside PathScribe"
                  >
                    ⚡ Sim LIS Amendment
                  </button>
                )}
                <button
                  onClick={() => setShowSequencer(true)}
                  title="Open report sequencer"
                  className="ps-syn-sequencer-btn"
                >
                  🔀 Sequencer ↗
                </button>
              </div>
              )}

            </div>

            {/* Tab content */}
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
                      <span className="ps-ose-centre-tmpl-name">{resolvedTemplateName ?? 'Gold Standard — General Surgical Pathology'}</span>
                      <span className="ps-ose-centre-tmpl-by">
                        {overrideTemplateId ? 'pathologist override' : `by ${(resolvedBy ?? 'gold-standard').replace(/-/g, ' ')}`}
                      </span>
                      <div className="ps-ose-tmpl-change-wrap">
                        <button className="ps-ose-centre-btn" onClick={() => setShowCentreTemplatePicker(v => !v)}>Change ▾</button>
                        {showCentreTemplatePicker && (
                          <div className="ps-ose-tmpl-picker">
                            <div className="ps-ose-tmpl-picker-title">Select report template</div>
                            {orchSections.some(s => s.text) && (
                              <div className="ps-ose-tmpl-picker-warn">⚠️ Changing template will regenerate all sections.</div>
                            )}
                            {centreTemplates.map(t => (
                              <div
                                key={t.id}
                                className={`ps-ose-tmpl-option${(overrideTemplateId ?? '') === t.id ? ' ps-ose-tmpl-option--active' : ''}`}
                                onClick={() => { setOverrideTemplateId(t.id); setShowCentreTemplatePicker(false); }}
                              >
                                <span className="ps-ose-tmpl-option-name">{t.name}</span>
                                {t.specialty && <span className="ps-ose-tmpl-option-meta">{t.specialty}</span>}
                              </div>
                            ))}
                            <div className="ps-ose-tmpl-option" onClick={() => { setOverrideTemplateId(null); setShowCentreTemplatePicker(false); }}>
                              <span className="ps-ose-tmpl-option-name">↺ System-resolved</span>
                              <span className="ps-ose-tmpl-option-meta">{resolvedTemplateName ?? 'Gold Standard'}</span>
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
                          title="DEV: Simulate microscopic slide received"
                        >⚡ Sim Microscopic</button>
                      )}
                      <button className="ps-ose-centre-btn" onClick={() => setShowSequencer(true)} title="Open report sequencer">
                        🔀 Sequencer ↗
                      </button>
                      <button className="ps-ose-centre-btn" onClick={handleOrchPrint} title="Print report">
                        🖨 Print
                      </button>
                    </div>
                  </div>
                  <div className="ps-ose-centre-pane">
                    <ReportPreviewRenderer
                      sections={orchSections}
                      bodyAssembly={resolvedContext?.narrativeTemplate.bodyAssembly ?? []}
                      structuredContext={resolvedContext}
                      caseData={caseData}
                      templateName={resolvedTemplateName}
                      resolvedBy={resolvedBy}
                      activeSectionId={activeSectionId}
                      onSectionClick={setActiveSectionId}
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
                    onSectionChange={(id, html) => {
                      const updated = orchSections.map(s =>
                        s.id === id ? { ...s, text: html, userEdited: html !== s.aiGenerated } : s
                      );
                      setOrchSections(updated);
                    }}
                    onAcceptSection={(id, finalText) => setOrchSections(prev =>
                      prev.map(s => s.id === id
                        ? { ...s, text: finalText, userEdited: true } // explicit Accept — always commits, no text-equality guessing
                        : s)
                    )}
                    onAcceptDraft={id => setOrchSections(prev =>
                      prev.map(s => s.id === id && s.pendingDraft != null
                        ? { ...s, text: s.pendingDraft, aiGenerated: s.pendingDraft, userEdited: false, pendingDraft: undefined }
                        : s)
                    )}
                    onKeepVersion={id => setOrchSections(prev =>
                      prev.map(s => s.id === id ? { ...s, pendingDraft: undefined } : s)
                    )}
                    onRegenerateSection={handleRegenerateSection}
                    onAcceptAll={() => setOrchSections(prev =>
                      prev.map(s =>
                        s.aiGenerated && !s.userEdited && !s.committed
                          ? { ...s, userEdited: true }
                          : s
                      )
                    )}
                  />
                </div>
              </div>
              )}

              {/* Sequencer — now a modal, triggered by tab button */}
              <SequencerPanel
                show={showSequencer}
                onClose={() => setShowSequencer(false)}
                onSave={(specimenOrder, synopticOrders) => {
                  setCaseData(prev => {
                    if (!prev) return prev;
                    // Reorder specimens
                    const specimenMap = Object.fromEntries((prev.specimens ?? []).map(s => [s.id, s]));
                    const reorderedSpecimens = specimenOrder.map(id => specimenMap[id]).filter(Boolean);
                    // Reorder synoptic reports within each specimen
                    const synopticMap = Object.fromEntries(((prev as any).synopticReports ?? []).map((r: any) => [r.instanceId, r]));
                    const reorderedReports: any[] = [];
                    specimenOrder.forEach(spId => {
                      (synopticOrders[spId] ?? []).forEach(instId => {
                        if (synopticMap[instId]) reorderedReports.push(synopticMap[instId]);
                      });
                    });
                    return { ...prev, specimens: reorderedSpecimens, synopticReports: reorderedReports } as any;
                  });
                  markDirty('Report sequence');
                  showToast('Sequence saved');
                }}
                caseData={caseData}
                activeReportInstanceId={activeReportInstanceId}
                onSelectReport={(instanceId, specimenId, reportType) => {
                  setActiveReportInstanceId(instanceId);
                  setActiveSpecimenId(specimenId);
                  setActiveReportType(reportType);
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
                      <div className="ps-lis-triage-title">⚠ LIS Amendment — Review Required</div>
                      <p className="ps-lis-triage-summary">{pendingLisNotice.lisAmendmentSummary}</p>
                    </div>
                    <button className="ps-conf-btn-primary" onClick={handleMarkReviewedNoChanges}>
                      Mark Reviewed — No PathScribe Changes Required
                    </button>
                  </div>
                )}
                <AmendmentDraftBanner caseData={caseData} activeReportInstanceId={activeReportInstanceId} onEdit={handleRequestAmendment} />
                <AmendmentStatusBanner caseId={caseData?.id} synopticReports={caseData?.synopticReports} />
                <LeftReportPanel caseData={caseData} highlightText={highlightText ?? undefined} onMatchResolved={found => setHighlightNotFound(!found)} />
              </div>
              <div className={`ps-syn-tab-panel${leftTab === 'material' ? ' ps-syn-tab-panel--visible-block' : ''}`}>
                <MaterialTreePanel
                  caseData={caseData}
                  onOpenBlockEditor={() => setShowBlockEditor(true)}
                  onAddSpecimen={() => { setEditingSpecimen(null); setShowSpecimenEdit(true); }}
                  onAddBlock={handleAddBlock}
                />
              </div>

              {/* Computational */}
            </div>
          </div>

          {/* Expand button — hidden in orchestration draft mode */}
          <div className={`ps-syn-expand-btn-wrap${isOrchestrationMode && leftTab === 'draft' ? ' ps-syn-expand-btn-wrap--hidden' : ''}`}>
            <button
              onClick={() => setPanelMode(m => m ? null : 'expanded')}
              title="Full-screen review mode"
              className="ps-syn-expand-btn"
            >⤢</button>
          </div>

          {/* Right panel — hidden in orchestration draft mode (Sequencer provides synoptic access) */}
          <div className={`ps-syn-right-panel${isOrchestrationMode && leftTab === 'draft' ? ' ps-syn-right-panel--collapsed' : ''}`}>
            <div className="ps-syn-right-panel-scroll">
              <RightSynopticPanel
                ref={synopticPanelRef}
                caseData={caseData}
                activeTab={activeTab}
                activeReportInstanceId={activeReportInstanceId}
                activeReportType={activeReportType}
                onReportInstanceChange={setActiveReportInstanceId}
                onReportTypeChange={setActiveReportType}
                onCaseUpdate={(updated) => { setCaseData(updated); markDirty('Synoptic fields'); }}
                isDirty={hasUnsavedData}
                scrollToField={alertFieldId}
                onScrollComplete={() => setAlertFieldId(null)}
                onHighlight={setHighlightText}
                highlightNotFound={highlightNotFound}
                computationalResults={computationalResults}
                onAiSuggestionsUpdate={setAiSuggestions}
              />
            </div>
          </div>
        </div>

        {/* Fullscreen review overlay */}
        {panelMode === 'expanded' && caseData && (() => {
          const accession = caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? '';
          const patient   = caseData.patient ? `${caseData.patient.lastName}, ${caseData.patient.firstName}` : '';
          const dob       = caseData.patient?.dateOfBirth ? new Date(caseData.patient.dateOfBirth).toLocaleDateString() : '';
          const sex       = caseData.patient?.sex ?? '';
          return (
            <div
              className="ps-syn-sequencer-overlay"
              onKeyDown={e => { if (e.key === 'Escape') setPanelMode(null); }}
              tabIndex={-1}
            >
              <div className="ps-syn-sequencer-header">
                <div className="ps-syn-sequencer-header-row">
                  <span className="ps-syn-sequencer-accession">{accession}</span>
                  {patient && <><span className="ps-syn-sequencer-sep">·</span><span className="ps-syn-sequencer-patient">{patient}</span></>}
                  {sex  && <><span className="ps-syn-sequencer-sep">·</span><span className="ps-syn-sequencer-value">{sex}</span></>}
                  {dob  && <><span className="ps-syn-sequencer-sep">·</span><span className="ps-syn-sequencer-label">DOB</span><span className="ps-syn-sequencer-value ps-syn-sequencer-value--spaced">{dob}</span></>}
                </div>
                {caseData.specimens && caseData.specimens.length > 0 && (
                  <div className="ps-syn-sequencer-specimen-row">
                    <span className="ps-syn-sequencer-specimen-label">Specimen:</span>
                    {caseData.specimens.map((sp: any) => {
                      const reports  = (caseData.synopticReports ?? []).filter((r: any) => r.specimenId === sp.id);
                      const hasNone  = reports.length === 0;
                      const hasMulti = reports.length > 1;
                      const isActive = sp.id === activeSpecimenId;
                      const pillStateClass = hasNone ? 'ps-specimen-pill--warning' : isActive ? 'ps-specimen-pill--active' : 'ps-specimen-pill--inactive';
                      return (
                        <div key={sp.id} className="ps-syn-sequencer-specimen-item">
                          <button
                            className={`ps-specimen-pill ${pillStateClass}${hasNone ? ' warning' : ''}`}
                            onClick={() => {
                              setActiveSpecimenId(sp.id);
                              if (hasNone) { setShowAddSynopticModal(true); }
                              else if (!hasMulti) { setActiveReportInstanceId(reports[0].instanceId); }
                            }}
                          >
                            <span className="ps-specimen-pill-letter">{sp.label}:</span>
                            <span>{sp.description}</span>
                            {hasNone && <span className="ps-syn-sequencer-warn-icon">⚠</span>}
                          </button>
                          {hasMulti && (
                            <select
                              className="ps-specimen-pill ps-specimen-pill-select"
                              value={isActive ? activeReportInstanceId : reports[0].instanceId}
                              onChange={e => { setActiveSpecimenId(sp.id); setActiveReportInstanceId(e.target.value); }}
                            >
                              {reports.map((r: any, i: number) => (
                                <option key={r.instanceId} value={r.instanceId}>
                                  {sp.label}: {r.templateId ? r.templateId.replace(/-/g, ' ') : `Report ${i + 1}`}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="ps-syn-sequencer-body">
                <div className="ps-syn-sequencer-left-col">
                  <div className="ps-syn-tabbar">
                    {(['draft', 'sequencer', 'report', 'material'] as const).map(tab => {
                      const isActive = leftTab === tab;
                      const label    = tab === 'draft' ? '✍️ Report Draft' : tab === 'sequencer' ? '🔀 Sequencer' : tab === 'report' ? '📑 Synoptic Reporting' : '🧱 Material';
                      // Status dot for Full Report tab — colour reflects case status
                      const st = caseData?.status ?? 'draft';
                      // 'pending-countersign' is a per-synoptic-instance status (SynopticReportInstance),
                      // not a CaseStatus value — check whether any instance on this case needs it.
                      const needsCountersign = (caseData?.synopticReports ?? []).some(r => r.status === 'pending-countersign');
                      const statusDotClass = st === 'finalized' ? 'ps-syn-tab-dot--finalized'
                        : st === 'pending-review' || needsCountersign ? 'ps-syn-tab-dot--pending'
                        : st === 'in-progress' ? 'ps-syn-tab-dot--in-progress'
                        : 'ps-syn-tab-dot--draft';
                      const statusLabel = String(st);
                      return (
                        <button key={tab} onClick={() => safeSetLeftTab(tab)} className={`ps-syn-tab-btn${isActive ? ' ps-syn-tab-btn--active' : ''}`}>
                          {label}
                          {/* Status dot on Full Report tab — after label, visible on all states */}
                          {tab === 'report' && (
                            <span
                              title={`Report status: ${statusLabel}`}
                              className={`ps-syn-tab-dot ${statusDotClass}`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="ps-syn-tab-content">
                    <div className={`ps-syn-tab-panel${leftTab === 'draft' ? ' ps-syn-tab-panel--visible-flex' : ''}`}>
                      <div className="ps-ose-centre-pane-wrap">
                        <div className="ps-ose-centre-header">
                          <div className="ps-ose-centre-header-left">
                            <span className="ps-ose-centre-tmpl-name">{resolvedTemplateName ?? 'Gold Standard — General Surgical Pathology'}</span>
                            <span className="ps-ose-centre-tmpl-by">
                              {overrideTemplateId ? 'pathologist override' : `by ${(resolvedBy ?? 'gold-standard').replace(/-/g, ' ')}`}
                            </span>
                            <div className="ps-ose-tmpl-change-wrap">
                              <button className="ps-ose-centre-btn" onClick={() => setShowCentreTemplatePicker(v => !v)}>Change ▾</button>
                              {showCentreTemplatePicker && (
                                <div className="ps-ose-tmpl-picker">
                                  <div className="ps-ose-tmpl-picker-title">Select report template</div>
                                  {orchSections.some(s => s.text) && (
                                    <div className="ps-ose-tmpl-picker-warn">⚠️ Changing template will regenerate all sections.</div>
                                  )}
                                  {centreTemplates.map(t => (
                                    <div
                                      key={t.id}
                                      className={`ps-ose-tmpl-option${(overrideTemplateId ?? '') === t.id ? ' ps-ose-tmpl-option--active' : ''}`}
                                      onClick={() => { setOverrideTemplateId(t.id); setShowCentreTemplatePicker(false); }}
                                    >
                                      <span className="ps-ose-tmpl-option-name">{t.name}</span>
                                      {t.specialty && <span className="ps-ose-tmpl-option-meta">{t.specialty}</span>}
                                    </div>
                                  ))}
                                  <div className="ps-ose-tmpl-option" onClick={() => { setOverrideTemplateId(null); setShowCentreTemplatePicker(false); }}>
                                    <span className="ps-ose-tmpl-option-name">↺ System-resolved</span>
                                    <span className="ps-ose-tmpl-option-meta">{resolvedTemplateName ?? 'Gold Standard'}</span>
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
                                title="DEV: Simulate microscopic slide received"
                              >⚡ Sim Microscopic</button>
                            )}
                            <button className="ps-ose-centre-btn" onClick={() => setShowSequencer(true)} title="Open report sequencer">
                              🔀 Sequencer ↗
                            </button>
                            <button className="ps-ose-centre-btn" onClick={handleOrchPrint} title="Print report">
                              🖨 Print
                            </button>
                          </div>
                        </div>
                        <div className="ps-ose-centre-pane">
                          <ReportPreviewRenderer
                            sections={orchSections}
                            bodyAssembly={resolvedContext?.narrativeTemplate.bodyAssembly ?? []}
                            structuredContext={resolvedContext}
                            caseData={caseData}
                            templateName={resolvedTemplateName}
                            resolvedBy={resolvedBy}
                            activeSectionId={activeSectionId}
                            onSectionClick={setActiveSectionId}
                          />
                        </div>
                      </div>
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
                          onSectionChange={(id, html) => {
                            const updated = orchSections.map(s =>
                              s.id === id ? { ...s, text: html, userEdited: html !== s.aiGenerated } : s
                            );
                            setOrchSections(updated);
                          }}
                          onAcceptSection={(id, finalText) => setOrchSections(prev =>
                            prev.map(s => s.id === id
                              ? { ...s, text: finalText, userEdited: true }
                              : s)
                          )}
                          onAcceptDraft={id => setOrchSections(prev =>
                            prev.map(s => s.id === id && s.pendingDraft != null
                              ? { ...s, text: s.pendingDraft, aiGenerated: s.pendingDraft, userEdited: false, pendingDraft: undefined }
                              : s)
                          )}
                          onKeepVersion={id => setOrchSections(prev =>
                            prev.map(s => s.id === id ? { ...s, pendingDraft: undefined } : s)
                          )}
                          onRegenerateSection={handleRegenerateSection}
                          onAcceptAll={() => setOrchSections(prev =>
                            prev.map(s =>
                              s.aiGenerated && !s.userEdited && !s.committed
                                ? { ...s, userEdited: true }
                                : s
                            )
                          )}
                        />
                      </div>
                    </div>
                    <div className={`ps-syn-tab-panel ps-syn-tab-panel--column${leftTab === 'sequencer' ? ' ps-syn-tab-panel--visible-flex' : ''}`}>
                      <SequencerPanel
                        show={leftTab === 'sequencer'}
                        onClose={() => safeSetLeftTab('report')}
                        onSave={(specimenOrder, synopticOrders) => {
                  setCaseData(prev => {
                    if (!prev) return prev;
                    // Reorder specimens
                    const specimenMap = Object.fromEntries((prev.specimens ?? []).map(s => [s.id, s]));
                    const reorderedSpecimens = specimenOrder.map(id => specimenMap[id]).filter(Boolean);
                    // Reorder synoptic reports within each specimen
                    const synopticMap = Object.fromEntries(((prev as any).synopticReports ?? []).map((r: any) => [r.instanceId, r]));
                    const reorderedReports: any[] = [];
                    specimenOrder.forEach(spId => {
                      (synopticOrders[spId] ?? []).forEach(instId => {
                        if (synopticMap[instId]) reorderedReports.push(synopticMap[instId]);
                      });
                    });
                    return { ...prev, specimens: reorderedSpecimens, synopticReports: reorderedReports } as any;
                  });
                  markDirty('Report sequence');
                  showToast('Sequence saved');
                }}
                        caseData={caseData}
                        activeReportInstanceId={activeReportInstanceId}
                        onSelectReport={(instanceId, specimenId, reportType) => {
                          setActiveReportInstanceId(instanceId);
                          setActiveSpecimenId(specimenId);
                          setActiveReportType(reportType);
                        }}
                      />
                    </div>
                    <div className={`ps-syn-tab-panel ps-syn-tab-panel--scroll${leftTab === 'report' ? ' ps-syn-tab-panel--visible-block' : ''}`}>
                      {pendingLisNotice && (
                  <div className="ps-lis-triage-banner">
                    <div>
                      <div className="ps-lis-triage-title">⚠ LIS Amendment — Review Required</div>
                      <p className="ps-lis-triage-summary">{pendingLisNotice.lisAmendmentSummary}</p>
                    </div>
                    <button className="ps-conf-btn-primary" onClick={handleMarkReviewedNoChanges}>
                      Mark Reviewed — No PathScribe Changes Required
                    </button>
                  </div>
                )}
                <AmendmentDraftBanner caseData={caseData} activeReportInstanceId={activeReportInstanceId} onEdit={handleRequestAmendment} />
                <AmendmentStatusBanner caseId={caseData?.id} synopticReports={caseData?.synopticReports} />
                <LeftReportPanel caseData={caseData} highlightText={highlightText ?? undefined} onMatchResolved={found => setHighlightNotFound(!found)} />
                    </div>
                    <div className={`ps-syn-tab-panel${leftTab === 'material' ? ' ps-syn-tab-panel--visible-block' : ''}`}>
                      <MaterialTreePanel
                  caseData={caseData}
                  onOpenBlockEditor={() => setShowBlockEditor(true)}
                  onAddSpecimen={() => { setEditingSpecimen(null); setShowSpecimenEdit(true); }}
                  onAddBlock={handleAddBlock}
                />
                    </div>
                  </div>
                </div>

                <div className="ps-syn-expand-btn-wrap">
                  <button
                    onClick={() => setPanelMode(null)}
                    title="Exit full-screen (Esc)"
                    className="ps-syn-expand-btn"
                  >⤡</button>
                </div>

                <div className="ps-syn-right-panel-scroll ps-syn-right-panel-scroll--flex">
                  <RightSynopticPanel
                    caseData={caseData}
                    activeTab={activeTab}
                    activeReportInstanceId={activeReportInstanceId}
                    activeReportType={activeReportType}
                    onReportInstanceChange={setActiveReportInstanceId}
                    onReportTypeChange={setActiveReportType}
                    onCaseUpdate={(updated) => { setCaseData(updated); markDirty('Synoptic fields'); }}
                    scrollToField={alertFieldId}
                    onScrollComplete={() => setAlertFieldId(null)}
                    onHighlight={setHighlightText}
                highlightNotFound={highlightNotFound}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Bottom action bar */}
        <BottomActionBar
          caseData={caseData}
          isDirty={hasUnsavedData}
          onSaveDraft={async () => {
            if (isOrchestrationMode && caseData?.id) {
              try {
                await caseRouter.updateCase(caseData.id, {
                  orchSections,
                  updatedAt: new Date().toISOString(),
                } as any);
                // Also persist to localStorage as immediate backup
                localStorage.setItem(
                  `ps_orch_sections_${caseData.id}`,
                  JSON.stringify(orchSections)
                );
              } catch (e) {
                console.error('Failed to persist orchSections:', e);
              }
            } else if (caseData?.id) {
              // ROOT FIX — CoPilot's Save Draft never actually persisted
              // synopticReports anywhere. It only cleared the dirty flag
              // and showed "Draft saved," which was true for Orchestration
              // but silently false here — any field edit was lost on
              // refresh since it only ever lived in local React state.
              try {
                await caseRouter.updateCase(caseData.id, {
                  synopticReports: caseData.synopticReports,
                  updatedAt: new Date().toISOString(),
                } as any);
              } catch (e) {
                console.error('Failed to persist synopticReports:', e);
              }
            }
            clearDirty();
            showToast('Draft saved');
          }}
          onSaveAndNext={async () => {
            if (isOrchestrationMode && caseData?.id) {
              try {
                await caseRouter.updateCase(caseData.id, {
                  orchSections,
                  updatedAt: new Date().toISOString(),
                } as any);
                localStorage.setItem(
                  `ps_orch_sections_${caseData.id}`,
                  JSON.stringify(orchSections)
                );
              } catch (e) {
                console.error('Failed to persist orchSections:', e);
              }
            } else if (caseData?.id) {
              // Same root fix as onSaveDraft above.
              try {
                await caseRouter.updateCase(caseData.id, {
                  synopticReports: caseData.synopticReports,
                  updatedAt: new Date().toISOString(),
                } as any);
              } catch (e) {
                console.error('Failed to persist synopticReports:', e);
              }
            }
            clearDirty();
            showToast('Draft saved');
            navigateToCase('next');
          }}
          onFinalize={() => handleRequestFinalize(false)}
          onFinalizeAndNext={() => handleRequestFinalize(true)}
          onSignOut={() => { if (caseData?.reportingMode !== 'copilot') setShowSignOutModal(true); }}
          onRequestAmendment={handleRequestAmendment}
          onPrint={openCopilotReportView}
          
          onHistory={() => setIsSimilarCasesOpen(true)}
          onFlags={() => { openFlagManager(caseData); log('flag_manager_opened', { caseId: caseId ?? '' }); }}
          onDelegate={() => setShowDelegateModal(true)}
          onTeam={() => { setShowTeamModal(true); log('team_modal_opened', { caseId: caseId ?? '' }); }}
          onCodes={() => { setShowCodesModal(true); log('codes_modal_opened', { caseId: caseId ?? '' }); }}
          onNextCase={() => { if (shouldWarnDirty()) { setPendingNavigation('next'); } else { navigateToCase('next'); } }}
          onPreviousCase={() => { if (shouldWarnDirty()) { setPendingNavigation('prev'); } else { navigateToCase('prev'); } }}
          onGenerateReport={isOrchestrationMode ? handleGenerateReport : undefined}
          onGrossComplete={isOrchestrationMode ? handleGrossComplete : undefined}
          synopticFitPending={isEvaluatingSynopticFit || showProtoReview}
          isGenerating={isOrchestrating}
          onAbortGenerate={handleAbortGenerate}
        />
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}

      <CaseSignOutModal
        show={showSignOutModal}
        overlayStyle={overlayStyle}
        accession={caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? ''}
        signOutUser={signOutUser}
        signOutPassword={signOutPassword}
        signOutError={signOutError}
        onClose={() => setShowSignOutModal(false)}
        onUserChange={setSignOutUser}
        onPasswordChange={setSignOutPassword}
        onConfirm={handleSignOutConfirm}
      />

      {pendingReconciliation && caseData && (
        <DiscordanceReconciliationModal
          caseId={caseData.id}
          specimenId={pendingReconciliation.specimenId}
          caseType={pendingReconciliation.caseType}
          frozenCategory={pendingReconciliation.frozenCategory}
          frozenDx={pendingReconciliation.frozenDx}
          performedBy={{ userId: signingUser?.id ?? 'unknown', userName: signingUser?.name ?? 'Unknown User' }}
          onDone={finalizeSignOut}
        />
      )}

      <CopilotReportViewModal
        show={showCopilotReportView}
        onClose={() => setShowCopilotReportView(false)}
        accession={caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? ''}
        patient={caseData?.patient ? `${caseData.patient.lastName}, ${caseData.patient.firstName}` : ''}
        mrn={caseData?.patient?.mrn ?? ''}
        instances={copilotReportInstances}
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

      {showMissingWarning && (
        <div className="ps-cannot-fin-overlay" onClick={() => setShowMissingWarning(false)}>
          <div className="ps-cannot-fin-modal" onClick={e => e.stopPropagation()}>
            <div className="ps-cannot-fin-header">
              <span className="ps-cannot-fin-header-icon">⚠️</span>
              <div>
                <div className="ps-cannot-fin-header-tag">Cannot Finalise</div>
                <div className="ps-cannot-fin-header-title">Required Fields Incomplete</div>
              </div>
            </div>
            <div className="ps-cannot-fin-body">
              <p className="ps-cannot-fin-desc">
                The following required fields must be completed before this report can be finalised:
              </p>
              <div className="ps-cannot-fin-list">
                {missingFields.map((f, i) => (
                  <button
                    key={i}
                    className="ps-cannot-fin-card"
                    title="Click to jump to this field"
                    onClick={() => {
                      setShowMissingWarning(false);
                      if (isOrchestrationMode) safeSetLeftTab('draft');
                      setTimeout(() => setAlertFieldId(f.fieldId), 100);
                    }}
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
              <span className="ps-cannot-fin-footer-count">{missingFields.length} field{missingFields.length !== 1 ? 's' : ''} need attention</span>
              <button className="ps-btn-primary" onClick={() => setShowMissingWarning(false)}>
                Return and Fix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-finalisation review — two-pane: specimen list + Q&A preview + signing */}
      <PreFinalisationModal
        show={showPreFinalise}
        onJumpToField={(instanceId, fieldKey) => {
          setShowPreFinalise(false);
          safeSetLeftTab('draft');
          setTimeout(() => setAlertFieldId(fieldKey), 100);
        }}
        caseAccession={caseData?.accession?.fullAccession ?? ''}
        patientName={`${caseData?.patient?.firstName ?? ''} ${caseData?.patient?.lastName ?? ''}`.trim()}
        reportingMode={caseData?.reportingMode === 'copilot' ? 'assisted' : 'pathscribe'}
        synoptics={preFinalSynoptics}
        userId={(caseData as any)?.order?.assignedTo ?? 'current'}
        userDisplayName={(caseData as any)?.assignedPathologistName ?? 'Pathologist'}
        userCredentials=""
        finalizeAndNext={finalizeAndNextPending}
        onConfirm={handlePreFinalConfirm}
        onCancel={() => setShowPreFinalise(false)}
      />

      {/* Legacy per-synoptic password confirm — kept for deferred/amendment flow */}
      <FinalizeSynopticModal
        show={showFinalizeModal}
        overlayStyle={overlayStyle}
        activeSynoptic={null}
        finalizePassword={finalizePassword}
        finalizeError={finalizeError}
        finalizeAndNext={false}
        onClose={() => setShowFinalizeModal(false)}
        onPasswordChange={setFinalizePassword}
        onConfirm={handleFinalizeConfirm}
      />

      {/* Protocol change review — AI proposes after microscopic received */}
      <ProtocolChangeModal
        show={showProtoReview}
        changes={protoChanges}
        onCommit={handleProtoCommit}
        onCancel={() => setShowProtoReview(false)}
      />

      <AmendmentModal
        show={showAmendmentModal}
        overlayStyle={overlayStyle}
        amendmentMode={amendmentMode}
        amendmentText={amendmentText}
        activeSynopticTitle={(() => {
          const r = caseData?.synopticReports?.find(rr => rr.instanceId === activeReportInstanceId);
          if (!r) return caseData?.accession?.fullAccession ?? 'Case';
          const specimen = caseData?.specimens?.find((s: any) => s.id === r.specimenId);
          return specimen ? `Specimen ${specimen.label}: ${r.templateName}` : r.templateName;
        })()}
        sequenceNumber={amendmentSequenceNumber}
        amendedByName={signingUser?.name ?? 'Unknown User'}
        versionHistory={versionHistory}
        resuming={resumingAmendment}
        orderingPhysicianName={caseData?.order?.requestingProvider}
        onModeChange={setAmendmentMode}
        onTextChange={setAmendmentText}
        onClose={() => { setShowAmendmentModal(false); setDeferredAmendmentContext(null); setAmendmentDraftId(null); setAmendmentSubmitError(null); setResumingAmendment(undefined); }}
        onSubmit={handleAmendmentSubmit}
        onFieldOverridesConfirmed={handleFieldOverridesConfirmed}
        submitError={amendmentSubmitError}
        triggeredBySynopticTitle={deferredAmendmentContext?.title}
        prefillText={deferredAmendmentContext?.prefill}
      />

      <LogoutWarningModal
        show={showLogoutModal}
        overlayStyle={overlayStyle}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => { setShowLogoutModal(false); handleLogout(); }}
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
        onAddBlock={(specimenId, cassetteLabel, note) => {
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
          caseRouter.updateCase(caseData.id, { diagnostic: updated.diagnostic, grossingReports }).catch(console.error);
          markDirty('Gross description');
          showToast('Block/recut added');
          setShowAddOrdersModal(false);
        }}
      />

      {showSpecimenEdit && caseData && (
        <SpecimenEditModal
          specimen={editingSpecimen}
          nextLabel={String.fromCharCode(65 + (caseData.specimens?.length ?? 0))}
          existingSpecimens={caseData.specimens ?? []}
          isOrchestrationMode={isOrchestrationMode}
          onClose={() => { setShowSpecimenEdit(false); setEditingSpecimen(null); }}
          onSave={(saved) => {
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
            const isNewSpecimen = (prev => (prev.specimens ?? []).findIndex(s => s.id === saved.id) < 0)(caseData!);
            setCaseData(prev => {
              if (!prev) return prev;
              const existing = (prev.specimens ?? []).findIndex(s => s.id === saved.id);
              const next = existing >= 0
                ? (prev.specimens ?? []).map(s => s.id === saved.id ? saved : s)
                : [...(prev.specimens ?? []), saved];
              const updated = { ...prev, specimens: next };
              // Persist to mock/Firestore via existing updateCase — no new service needed
              caseRouter.updateCase(prev.id, { specimens: next }).catch(console.error);
              return updated;
            });

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
                  const { evaluateGrossingTemplateAssignment } = await import('@/services/cases/mockCaseService');

                  const allTemplates = await templateModule.listTemplates('published');
                  const availableTemplates = (allTemplates as any[])
                    .filter(t => t.isDiagnostic === false)
                    .map(t => ({ id: t.id, name: t.name, category: t.category }));

                  const overridesRes = await grossingRoutingOverrideService.getAll();
                  const routingOverrides = (overridesRes.ok ? overridesRes.data : [])
                    .filter((o: any) => o.active)
                    .map((o: any) => ({ clientId: o.clientId, specimenType: o.specimenType, grossingTemplateId: o.grossingTemplateId }));

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
                    caseContext: { clientId: caseData?.order?.clientId },
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

                  setCaseData(prev => {
                    if (!prev) return prev;
                    const grossingReports = [...((prev as any).grossingReports ?? []), newGrossingReport];
                    const updated = { ...prev, grossingReports } as any;
                    caseRouter.updateCase(prev.id, { grossingReports }).catch(console.error);
                    return updated;
                  });
                  markDirty('Specimens');
                } catch (err) {
                  console.error('[AddSpecimen] Grossing template auto-assignment failed:', err);
                  showToast('Specimen added, but automatic Grossing template assignment failed — assign one manually');
                }
              })();
            }
            markDirty('Specimens');
            setShowSpecimenEdit(false);
            setEditingSpecimen(null);
          }}
        />
      )}

      {showAddSynopticModal && (
        <AddSynopticModal
          caseData={caseData}
          availableProtocols={availableProtocols}
          onClose={() => setShowAddSynopticModal(false)}
          onAdd={async (newInstances, updatedCase) => {
            markDirty('Synoptic reports');
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
                authoringPathologist: { userId: signingUser?.id ?? 'unknown', userName: signingUser?.name ?? 'Unknown User' },
              });
              if (draftRes.ok) {
                const markedReports = (updatedCase.synopticReports ?? []).map((r: any) =>
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
          }}
        />
      )}

      {showCaseCommentModal && (
        <CaseCommentModal
          accession={caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? ''}
          comments={caseComments}
          currentUserId={signingUser?.id ?? 'unknown'}
          currentUserName={signingUser?.name ?? 'Unknown User'}
          onAddComment={(text) => {
            // Append-only — a new CaseComment record, never overwriting
            // anything already posted. Fixed June 2026: this used to be
            // a single string, silently overwritten by whoever saved
            // last, with no record of who wrote what or when.
            if (!caseData?.id) return;
            const newComment: CaseComment = {
              id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              authorId: signingUser?.id ?? 'unknown',
              authorName: signingUser?.name ?? 'Unknown User',
              text,
              createdAt: new Date().toISOString(),
              origin: 'pathscribe',
              syncStatus: 'pending',
            };
            const updatedComments = [...caseComments, newComment];
            const patch = { order: { ...caseData.order, caseComments: updatedComments } };
            caseRouter.updateCase(caseData.id, patch as any).then(() => {
              setCaseData(prev => prev ? ({ ...prev, ...patch } as typeof prev) : prev);
            }).catch(err => console.error('[CaseComment] Failed to persist:', err));
            markDirty('Case comment');
          }}
          onClose={() => setShowCaseCommentModal(false)}
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
          currentUserName={signingUser?.name ?? 'Unknown User'}
          onAddComment={(text) => {
            // Append-only — fixed June 2026, same reasoning as the case
            // comment thread: this used to be a single string, silently
            // overwritten by whoever saved last, with no author or
            // timestamp recorded at all.
            if (!caseData?.id) return;
            const newComment: CaseComment = {
              id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              authorId: signingUser?.id ?? 'unknown',
              authorName: signingUser?.name ?? 'Unknown User',
              text,
              createdAt: new Date().toISOString(),
              origin: 'pathscribe',
              syncStatus: 'pending',
            };
            const patchedSpecimens = (caseData.specimens ?? []).map((sp: any) =>
              sp.id === activeSpecimenCommentId ? { ...sp, comments: [...(sp.comments ?? []), newComment] } : sp
            );
            const patch = { specimens: patchedSpecimens };
            caseRouter.updateCase(caseData.id, patch as any).then(() => {
              setCaseData(prev => prev ? ({ ...prev, ...patch } as typeof prev) : prev);
            }).catch(err => console.error('[SpecimenComment] Failed to persist:', err));
            markDirty('Specimen comment');
          }}
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

      {showBlockEditor && caseData && (
        <BlockStainEditorModal
          blocks={allBlocks}
          casePriority={(caseData as any)?.order?.priority ?? 'Routine'}
          onUpdateBlock={handleUpdateBlock}
          onSendStainOrder={handleSendStainOrder}
          onClose={() => setShowBlockEditor(false)}
        />
      )}

      {fixativeGateSpecimens && caseData && (
        <FixativeTimeGateModal
          specimens={fixativeGateSpecimens}
          onCancel={() => { setFixativeGateSpecimens(null); setPendingFinalizeArgs([]); }}
          onContinue={async (resolutions: FixativeResolution[]) => {
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
              await caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens } as any);
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

              showToast('Fixation time recorded');
            } catch (err) {
              console.error('[FixativeGate] Failed to persist resolutions:', err);
              showToast('Could not save fixation time — please try again');
              return;
            }

            setFixativeGateSpecimens(null);
            const args = pendingFinalizeArgs;
            setPendingFinalizeArgs([]);
            // Same gap as the other two finalize paths — fixed the same way.
            (async () => {
              const succeeded = await finalizeCase(args);
              if (succeeded) await releasePendingAmendmentOrAddendum();
            })();
          }}
        />
      )}

      {isSimilarCasesOpen && caseData && (
        <PatientHistoryModal
          patientName={`${caseData.patient.lastName}, ${caseData.patient.firstName}`}
          mrn={caseData.patient.mrn ?? ''}
          onClose={() => setIsSimilarCasesOpen(false)}
        />
      )}

      {showCodesModal && caseData && (
        <AddCodeModal
          existingCodes={[
            ...(((caseData as any).coding?.icd10 ?? []) as any[]),
            ...(((caseData as any).coding?.snomed ?? []) as any[]),
          ]}
          allSpecimens={(caseData.specimens ?? []).map((sp, i) => ({
            index: i, id: i + 1,
            name: `${sp.label}: ${sp.description ?? ''}`,
          }))}
          activeSpecimenIndex={0}
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
          onAddToSpecimens={(codes, _specimenIndices) => {
            // Previously: (a) kept only the bare code string, discarding
            // system/display/confidence/AI source/verification state
            // entirely, and (b) existingCodes above read from a
            // completely different field (caseData.codes) than this
            // wrote to (caseData.coding.icd10/.snomed) — so reopening
            // this modal after saving never showed what was just added.
            // Fixed both by keeping the full MedicalCode object here and
            // reading existingCodes from these same two fields above.
            // (c) This also never called caseRouter.updateCase at all —
            // purely local React state, meaning even a diligent "Save
            // Draft" click wouldn't have persisted it, since that save
            // path is scoped specifically to orchSections. Now actually
            // persisted directly, not left to a save mechanism that was
            // never going to carry it.
            const newIcd    = codes.filter(c => c.system === 'ICD');
            const newSnomed = codes.filter(c => c.system === 'SNOMED');
            const newCoding = {
              icd10:  [...(((caseData as any).coding?.icd10  ?? []) as any[]), ...newIcd],
              snomed: [...(((caseData as any).coding?.snomed ?? []) as any[]), ...newSnomed],
            };
            setCaseData(prev => prev ? ({ ...prev, coding: newCoding } as typeof prev) : prev);
            caseRouter.updateCase(caseData.id, { coding: newCoding } as any).catch(err => console.error('[Codes] Failed to save:', err));
            markDirty('Codes');
            setShowCodesModal(false);
          }}
          onClose={() => setShowCodesModal(false)}
          originHospitalId={caseData?.originHospitalId}
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
          onClose={() => {
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
          onUpdated={(updated) => { setCaseData(updated); markDirty('Case data'); }}
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
          registry={mockActionRegistryService}
          caseId={caseId}
          currentUserId="PATH-001"
          onDelegated={() => {
            setShowDelegateModal(false);
            showToast('Case delegated successfully');
            if (delegateReturnTo === 'team') { setShowTeamModal(true); setDelegateReturnTo(null); }
          }}
          synopticInstances={(caseData?.synopticReports ?? []).map(r => ({
            instanceId: r.instanceId,
            specimenDescription: caseData?.specimens?.find(s => s.id === r.specimenId)?.description ?? r.specimenId,
            templateName: r.templateName,
          }))}
        />
      )}

      {/* Tab-switch unsaved draft confirmation — orchestration mode only */}
      {pendingTabSwitch && (
        <div className="ps-tabswitch-overlay">
          <div className="ps-tabswitch-modal">
            <div className="ps-tabswitch-title">
              Unsaved draft changes
            </div>
            <div className="ps-tabswitch-body">
              You have unsaved changes in the report draft. Would you like to save before switching tabs?
            </div>
            <div className="ps-tabswitch-footer">
              <button
                onClick={() => setPendingTabSwitch(null)}
                className="ps-tabswitch-btn ps-tabswitch-btn--cancel"
              >Cancel</button>
              <button
                onClick={() => {
                  const dest = pendingTabSwitch;
                  setPendingTabSwitch(null);
                  // Discard and switch
                  clearDirty();
                  const tab = dest === 'report_and_scroll' ? 'report' : dest as any;
                  safeSetLeftTab(tab);
                  if (dest === 'report_and_scroll') {
                    setTimeout(() => setAlertFieldId('scroll_to_unanswered'), 150);
                  }
                }}
                className="ps-tabswitch-btn ps-tabswitch-btn--discard"
              >Discard &amp; Switch</button>
              <button
                onClick={async () => {
                  // Save then switch
                  const dest = pendingTabSwitch;
                  setPendingTabSwitch(null);
                  if (caseData?.id) {
                    try {
                      await caseRouter.updateCase(caseData.id, { orchSections, updatedAt: new Date().toISOString() } as any);
                      localStorage.setItem(`ps_orch_sections_${caseData.id}`, JSON.stringify(orchSections));
                    } catch (e) { console.error(e); }
                  }
                  clearDirty();
                  showToast('Draft saved');
                  const tab = dest === 'report_and_scroll' ? 'report' : dest as any;
                  safeSetLeftTab(tab);
                  if (dest === 'report_and_scroll') {
                    setTimeout(() => setAlertFieldId('scroll_to_unanswered'), 150);
                  }
                }}
                className="ps-tabswitch-btn ps-tabswitch-btn--save"
              >Save &amp; Switch</button>
            </div>
          </div>
        </div>
      )}

      <UnsavedWarningModal
        show={!!pendingNavigation || !!pendingPath}
        overlayStyle={overlayStyle}
        dirtySections={Array.from(dirtySections)}
        onCancel={() => {
          setPendingNavigation(null);
          cancelContextNavigate();
        }}
        onSaveAndLeave={async () => {
          // This previously just cleared the dirty flag and showed a
          // "Draft saved" toast without ever actually calling
          // caseRouter.updateCase or writing the localStorage backup —
          // the toast was lying, and navigating away right after threw
          // away orchSections for real, since nothing had persisted it
          // anywhere. This is the actual confirmed bug behind "sections
          // lost on navigation" — not a missing persistence mechanism
          // (one already exists, mirrored below, used by Ctrl+S/the
          // PATHSCRIBE_ORCH_SAVE_DRAFT event), but this specific button
          // never calling it. Awaited directly (not dispatched as an
          // event) so navigation can't proceed before the save actually
          // completes.
          if (caseData?.id) {
            try {
              await caseRouter.updateCase(caseData.id, { orchSections, updatedAt: new Date().toISOString() } as any);
              localStorage.setItem(`ps_orch_sections_${caseData.id}`, JSON.stringify(orchSections));
            } catch (e) { console.error('[SaveAndLeave] Failed to save draft:', e); }
          }
          clearDirty();
          showToast('Draft saved');
          if (pendingPath) confirmContextNavigate();
          const dest = pendingNavigation;
          setPendingNavigation(null);
          if (dest === 'next') navigateToCase('next');
          else if (dest === 'prev') navigateToCase('prev');
          else if (dest === '__back__') {
            if (backPath === '/search') sessionStorage.setItem('pathscribe:searchReturn', '1');
            navigate(backPath);
          }
          else if (dest) navigate(dest);
        }}
        onConfirm={() => {
          clearDirty();
          if (pendingPath) confirmContextNavigate();
          const dest = pendingNavigation;
          setPendingNavigation(null);
          if (dest === 'next') navigateToCase('next');
          else if (dest === 'prev') navigateToCase('prev');
          else if (dest === '__back__') {
            if (backPath === '/search') sessionStorage.setItem('pathscribe:searchReturn', '1');
            navigate(backPath);
          }
          else if (dest) navigate(dest);
        }}
      />
    </div>
  );
};

export default SynopticReportPage;
