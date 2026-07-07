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
import NavBar             from '@/components/NavBar/NavBar';
import HeaderBar          from './components/HeaderBar';
import Sidebar            from './components/Sidebar';
import LeftReportPanel    from './components/LeftReportPanel';
import RightSynopticPanel, { type RightSynopticPanelHandle, type AiSuggestion, type MissingRequiredField, type ReviewField } from './components/RightSynopticPanel';
import BottomActionBar    from './components/BottomActionBar';

import AmendmentModal        from './modals/AmendmentModal';
import { CaseCommentModal }   from '../Synoptic/Comments/CaseCommentModal';
import PatientHistoryModal    from '../../components/CasePanel/PatientHistoryModal';
import FlagManagerModal       from '../../components/Flags/FlagManagerModal';
import { AddCodeModal }       from '../Synoptic/Codes/AddCodeModal';
import { ReportCommentModal } from '../Synoptic/Comments/ReportCommentModal';
import CaseSignOutModal      from './modals/CaseSignOutModal';
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
import ComputationalPanel from '../../components/sidecar/ComputationalPanel';
import SynopticSidebar    from '../../components/synoptic/SynopticSidebar';
import { useSidecar }     from '@/contexts/SidecarContext';
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
import { ProtocolChangeModal }     from './modals/ProtocolChangeModal';
// ProtocolChange moved to Case.ts — see comment there. (ProtocolChangeModal.tsx
// still re-exports it for backward compat, but importing it from its real
// home directly here, alongside Case/SynopticReportInstance below.)
import { mockActionRegistryService } from '@/services/actionRegistry/mockActionRegistryService';
import { COMP_EVENT, COMP_VOICE, COMP_AUDIT } from '@/constants/computationalActions';
import { useAuditLog } from '@/components/Audit/useAuditLog';

// ── Orchestrator ───────────────────────────────────────────────
import OrchestratorSectionEditor, { textToHtml } from './components/OrchestratorSectionEditor';
import type { OrchestratorSection } from './components/OrchestratorSectionEditor';
import ReportPreviewRenderer, { getInstitution, buildRenderScope } from '@/pages/ReportPreview/ReportPreviewRenderer';
import SequencerPanel from './components/SequencerPanel';
import { OrchestratorEngine } from '@/orchestrator/orchestratorEngine';
import type { OrchestratorCallbacks } from '@/orchestrator/orchestratorEngine';
import { buildContext } from '@/orchestrator/contextBuilder';
import type { StructuredContext } from '@/orchestrator/contextBuilder';

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

  // ── Voice action execution ───────────────────────────────────────────────────
  // The context activation earlier in this component makes voice
  // recognition correctly match a spoken phrase to one of the SYNOPTIC
  // actions and dispatch it — but dispatching an event that nothing
  // listens for still does nothing. Only the 4 Grossing actions are
  // wired to real behavior here; the pre-existing 24 SYNOPTIC actions
  // (save draft, AI review confirm/override/skip, delegation, etc.)
  // still have no listener anywhere and remain recognized-but-inert —
  // a separate, real piece of remaining work, not something this pass
  // silently completed.
  //
  // Placed here deliberately, after allBlocks/focusedBlockIndex/
  // handleAdvanceFocusedBlockStatus/handleConfirmTriage are all
  // actually declared — an earlier version of this effect sat higher
  // up in the component, referencing these before their declarations
  // ran, which threw "Cannot access before initialization" on every
  // load. Caught and fixed; keeping this comment as a flag against
  // moving it back above its own dependencies again.
  useEffect(() => {
    const unsubscribe = mockActionRegistryService.onAction((actionId: string) => {
      switch (actionId) {
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
      }
    });
    return unsubscribe;
  }, [allBlocks.length, handleAdvanceFocusedBlockStatus, handleConfirmTriage]);

  const [activeReportInstanceId, setActiveReportInstanceId] = useState<string>('');
  const [isAlertExpanded, setIsAlertExpanded] = useState(false);
  const [isSimilarCasesOpen, setIsSimilarCasesOpen] = useState(false);
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [panelMode, setPanelMode] = useState<null | 'expanded'>(null);
  const [highlightText, setHighlightText] = useState<string | null>(null);
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

  // Computational flags + left panel tab state
  const [computationalFlags,   setComputationalFlags]   = useState<Flag[]>([]);
  const refreshCompFlags = useCallback(async () => {
    const res = await flagService.getAll().catch(() => null);
    if (!res?.ok) return;
    const allComp = (res.data as Flag[]).filter(f => f.tagClass === 'COMPUTATIONAL' && f.status === 'Active');
    const seenCodes = new Set<string>();
    const compFlags = allComp.filter(f => {
      if (!f.lisCode || seenCodes.has(f.lisCode)) return false;
      seenCodes.add(f.lisCode);
      return true;
    });
    setComputationalFlags(compFlags);
    if (caseId) {
      const c = await caseRouter.getCase(caseId);
      if (c) setCaseData(c);
    }
    if (compFlags.length > 0 && caseId) {
      const { resultService } = await import('@/services');
      const entries = await Promise.allSettled(
        compFlags.map(async f => {
          if (!f.dataSource?.sourceId) return null;
          const result = await resultService.getResult(f.dataSource.sourceId, caseId);
          return [f.name, result.data] as [string, Record<string, string | number | boolean | null>];
        })
      );
      const resultsMap: Record<string, Record<string, string | number | boolean | null>> = {};
      entries.forEach(e => {
        if (e.status === "fulfilled" && e.value) {
          const [name, data] = e.value;
          if (data && Object.keys(data).length > 0) resultsMap[name] = data;
        }
      });
      setComputationalResults(resultsMap);
    }
  }, [caseId]);

  // ── Left panel tab + Orchestrator state ───────────────────
  const [leftTab, setLeftTab] = useState<'draft' | 'sequencer' | 'report' | 'results'>('report');
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

    // Conservative: flag the single LOWEST-confidence field across ALL
    // suggestions, not just a tier subset, since tier isn't reliably known.
    let flagged: [string, AiSuggestion] | null = null;
    for (const entry of entries) {
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

    refreshCompFlags();

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
        synopticAnswers: resolvedContext?.synoptic.answers ?? [],
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

  const caseComputationalFlags = React.useMemo(() => {
    if (!caseData) return [];

    // Collect all applied flag objects (raw) from the case
    const appliedFlags: any[] = [
      ...((caseData as any).caseFlags     ?? []),
      ...((caseData as any).specimenFlags ?? []),
      ...((caseData as any).flags         ?? []),
    ];
    (caseData as any).specimens?.forEach((sp: any) => {
      appliedFlags.push(...(sp.specimenFlags ?? sp.flags ?? sp.appliedFlags ?? []));
    });

    // Collect applied lisCodes and specimenId assignments
    const appliedLisCodes = new Set<string>();
    const lisCodeToSpecimenId: Record<string, string | null> = {};
    appliedFlags.forEach(f => {
      if (!f?.lisCode) return;
      appliedLisCodes.add(f.lisCode);
      const spId = f.specimenId ?? null;
      if (!(f.lisCode in lisCodeToSpecimenId) || spId !== null) {
        lisCodeToSpecimenId[f.lisCode] = spId;
      }
    });

    if (appliedLisCodes.size === 0) {
      // No computational tests ordered on this case — return empty, not all definitions
      return [];
    }

    // Match against flag service definitions (by lisCode)
    const fromDefinitions = computationalFlags
      .filter(f => f.lisCode && appliedLisCodes.has(f.lisCode))
      .map(f => ({ ...f, specimenId: lisCodeToSpecimenId[f.lisCode!] ?? null }));

    if (fromDefinitions.length > 0) return fromDefinitions;

    // Fallback: definitions didn't have matching lisCodes — use the raw applied flags
    // directly if they carry enough info (tagClass, name, lisCode)
    return appliedFlags
      .filter(f => f?.lisCode && f?.tagClass === 'COMPUTATIONAL')
      .map(f => ({
        ...f,
        specimenId: lisCodeToSpecimenId[f.lisCode] ?? null,
      }));
  }, [
    caseData?.id,
    JSON.stringify(((caseData as any)?.specimenFlags ?? []).map((f: any) => `${f.lisCode}:${f.specimenId ?? ''}`)),
    JSON.stringify(((caseData as any)?.caseFlags    ?? []).map((f: any) => `${f.lisCode}:${f.specimenId ?? ''}`)),
    computationalFlags.length,
  ]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { protocolIds, flagName } = (e as CustomEvent).detail;
      if (!protocolIds?.length) return;
      setAvailableProtocols((prev: any[]) =>
        prev.filter((p: any) => protocolIds.includes(p.id))
      );
      setShowAddSynopticModal(true);
      showToast(`${flagName} ordered — select a protocol to add`);
    };
    window.addEventListener('ps:suggest-protocols', handler);
    return () => window.removeEventListener('ps:suggest-protocols', handler);
  }, [showToast]);

  // ── Computational voice actions ────────────────────────────
  useEffect(() => {
    Object.entries(COMP_VOICE).forEach(([key, phrases]) => {
      const eventName = COMP_EVENT[key as keyof typeof COMP_EVENT];
      (mockActionRegistryService as any).registerAction?.({
        id:       `comp_synoptic_${key.toLowerCase()}`,
        label:    phrases[0],
        phrases,
        event:    eventName,
        context:  'SYNOPTIC',
        category: 'Computational Data',
      });
    });

    const openCompTab   = () => { safeSetLeftTab('results'); log(COMP_AUDIT.USE_COMP_TAB_OPENED, { caseId, source: 'voice' }); };
    const openReportTab = () => safeSetLeftTab('report');
    const openOrderModal = () => {
      safeSetLeftTab('results');
      setTimeout(() => window.dispatchEvent(new CustomEvent('PATHSCRIBE_COMP_OPEN_ORDER_MODAL_INTERNAL')), 100);
      log(COMP_AUDIT.USE_ORDER_MODAL_OPENED, { caseId });
    };
    const nextAssay  = () => window.dispatchEvent(new CustomEvent(COMP_EVENT.NEXT_ASSAY));
    const prevAssay  = () => window.dispatchEvent(new CustomEvent(COMP_EVENT.PREV_ASSAY));
    const readResult = () => window.dispatchEvent(new CustomEvent(COMP_EVENT.READ_RESULT));

    window.addEventListener(COMP_EVENT.OPEN_COMP_TAB,    openCompTab);
    window.addEventListener(COMP_EVENT.OPEN_REPORT_TAB,  openReportTab);
    window.addEventListener(COMP_EVENT.OPEN_ORDER_MODAL, openOrderModal);
    window.addEventListener(COMP_EVENT.NEXT_ASSAY,       nextAssay);
    window.addEventListener(COMP_EVENT.PREV_ASSAY,       prevAssay);
    window.addEventListener(COMP_EVENT.READ_RESULT,      readResult);

    return () => {
      window.removeEventListener(COMP_EVENT.OPEN_COMP_TAB,    openCompTab);
      window.removeEventListener(COMP_EVENT.OPEN_REPORT_TAB,  openReportTab);
      window.removeEventListener(COMP_EVENT.OPEN_ORDER_MODAL, openOrderModal);
      window.removeEventListener(COMP_EVENT.NEXT_ASSAY,       nextAssay);
      window.removeEventListener(COMP_EVENT.PREV_ASSAY,       prevAssay);
      window.removeEventListener(COMP_EVENT.READ_RESULT,      readResult);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

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

  const { selectedFlag, isOpen } = useSidecar();
  React.useEffect(() => {
    if (isOpen && selectedFlag) safeSetLeftTab('results');
  }, [selectedFlag, isOpen]);

  const {
    flagCaseData, setFlagCaseData: _setFlagCaseData,
    flagDefinitions,
    showFlagManager, setShowFlagManager,
    openFlagManager,
    onApplyFlags,
    onRemoveFlag,
  } = useSynopticFlags(caseId ?? '');

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

  const handleSignOutConfirm = useCallback(() => {
    setCaseSigned(true);
    setShowSignOutModal(false);
    showToast('Case signed out successfully');
  }, [setCaseSigned, setShowSignOutModal, showToast]);

  // ── Build SynopticForReview[] for PreFinalisationModal ─────────────────
  const buildSynopticsForReview = useCallback((): SynopticForReview[] => {
    if (!caseData?.synopticReports?.length) return [];
    return caseData.synopticReports
      .filter(r => (r as any).status !== 'deferred')
      .map(report => {
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
          report.templateName?.includes('WHO')   ? 'WHO'   : 'CAP';
        const fieldLabels: Record<string, string> = {};
        fieldKeys.forEach(k => { fieldLabels[k] = getFieldLabel(k, std); });
        return {
          instanceId:    report.instanceId,
          templateName:  report.templateName,
          specimenId:    report.specimenId,
          specimenLabel: specimen?.label ?? '?',
          specimenDesc:  specimen?.specimenType ?? specimen?.description ?? 'Specimen',
          answers, fieldLabels, fieldOrder: fieldKeys,
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
  ): Promise<void> => {
    if (!caseData) return;

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
      return; // abort — do not finalize until the gate is resolved
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
    } catch (err) {
      console.error('[Finalise] Failed to persist finalization:', err);
      showToast('Finalization failed — please try again');
    }
  }, [caseData, signingUser, log, showToast, specimenDictionary]);

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
  const handleGrossComplete = useCallback(async () => {
    if (!caseData) return;

    const draftGrossing = (caseData.grossingReports ?? []).filter(g => g.status === 'draft');
    if (draftGrossing.length === 0) return;

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

  const handleProtoCommit = useCallback((acceptedIds: string[]) => {
    setShowProtoReview(false);
    // FIELD NAMES CONFIRMED against ProtocolChangeModal.tsx's real ProtocolChange
    // type (June 2026). Previous version matched on `instanceId`, which never
    // existed on this type — every match silently failed and "Apply" was a
    // no-op that still logged success. Fixed to match on currentInstanceId
    // (falling back to specimenId + currentTemplateId for older callers that
    // don't set it), and to handle all three real actions: replace, add, remove.
    if (acceptedIds.length > 0 && caseData) {
      const accepted = protoChanges.filter(c => acceptedIds.includes(c.id));
      const nowIso = new Date().toISOString();

      const matchesExisting = (change: ProtocolChange, r: SynopticReportInstance) =>
        change.currentInstanceId
          ? r.instanceId === change.currentInstanceId
          : r.specimenId === change.specimenId && r.templateId === change.currentTemplateId;

      let reports = [...(caseData.synopticReports ?? [])];

      for (const change of accepted) {
        const action = change.action ?? 'replace';

        if (action === 'remove') {
          reports = reports.filter(r => !matchesExisting(change, r));
          continue;
        }

        if (action === 'add') {
          reports.push({
            instanceId:   `${change.specimenId}_${change.proposedTemplateId}_${Date.now()}`,
            specimenId:   change.specimenId,
            templateId:   change.proposedTemplateId ?? '',
            templateName: change.proposedTemplateName ?? '',
            // Intentionally empty — this is a newly-assigned synoptic with no
            // prior answers to carry forward. AI suggestions populate it on
            // the next evaluation/render pass, same as any fresh assignment.
            answers:      {},
            status:       'draft',
            createdAt:    nowIso,
            updatedAt:    nowIso,
          });
          continue;
        }

        // action === 'replace'
        reports = reports.map(r => {
          if (!matchesExisting(change, r)) return r;
          return {
            ...r,
            templateId:   change.proposedTemplateId ?? r.templateId,
            templateName: change.proposedTemplateName ?? r.templateName,
            updatedAt:    nowIso,
            // Answers are cleared rather than carried over: the old answers
            // are keyed to the OLD template's field IDs, which a different
            // template is not guaranteed to share. Carrying them forward
            // silently would risk misattributing values to the wrong fields
            // under the new schema. Re-populates via AI suggestions on next
            // pass instead. PETE: confirm this is the behavior you want —
            // the alternative (best-effort carry-over of fields with
            // matching IDs only) is also reasonable if blank-on-replace
            // feels disruptive in practice.
            answers:      {},
          };
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
  }, [protoChanges, caseData, log]);

  const handleRequestFinalize = useCallback((andNext: boolean) => {
    setFinalizeAndNextPending(andNext);
    if (!synopticPanelRef.current) {
      setPreFinalSynoptics(buildSynopticsForReview());
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
    setPreFinalSynoptics(buildSynopticsForReview());
    setShowPreFinalise(true);
  }, [buildSynopticsForReview, caseData, setMissingFields, setShowMissingWarning, setReviewFields, setShowAiReview, setFinalizeAndNextPending, setPreFinalSynoptics, setShowPreFinalise]);

  const handlePreFinalConfirm = useCallback((_ordered: string[], _excluded: string[]) => {
    setShowPreFinalise(false);
    // Credentials already verified inside PreFinalisationModal.
    // _ordered is the pathologist's final section/synoptic ordering choice
    // from the drag-to-reorder interaction — display order only, not
    // persisted here since it doesn't affect report content or status.
    finalizeCase(_excluded);
  }, [finalizeCase]);

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
    } else {
      // Genuine first-time finalize — actually persist the status change
      // and audit event. Previously this branch only showed a toast with
      // no underlying state change at all.
      finalizeCase();
    }
  }, [setShowFinalizeModal, showToast, caseData, activeReportInstanceId, setAmendmentMode, setShowAmendmentModal, isOrchestrationMode, orchSections, finalizeCase]);

  const handleAmendmentSubmit = useCallback(() => {
    setShowAmendmentModal(false);
    showToast(`${amendmentMode === 'addendum' ? 'Addendum' : 'Amendment'} submitted`);
    setAmendmentText('');
  }, [amendmentMode, setAmendmentText, setShowAmendmentModal, showToast]);

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
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b1120', gap: 16 }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>Case not found</div>
        <div style={{ fontSize: 14, color: '#64748b' }}>No case exists with ID <code style={{ color: '#38bdf8' }}>{caseId}</code></div>
        <button
          onClick={() => navigate('/')}
          className="ps-btn-primary"
          style={{ marginTop: 8 }}
        >
          ← Back to Worklist
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: 'var(--app-height, 100vh)',
        backgroundColor: '#0f172a',
        color: '#fff',
        fontFamily: "'Inter', sans-serif",
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.4s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/main_background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.75) 100%)', zIndex: 2 }} />

      {/* Toast */}
      <SaveToast message={toastMsg} visible={toastVisible} />

      {/* Auto-generate-once confirmation toast — cancelable window before
          a draft is silently created from completed synoptic data. */}
      {pendingAutoGenerate && (
        <div
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 70000, display: 'flex', alignItems: 'center', gap: 14,
            background: '#1e293b', border: '1px solid rgba(8,145,178,0.4)',
            borderRadius: 10, padding: '12px 16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          <span style={{ display: 'inline-flex', width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(56,189,248,0.3)', borderTopColor: '#38bdf8', animation: 'ps-spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#e2e8f0' }}>
            Synoptic complete — generating narrative draft…
          </span>
          <button
            onClick={cancelAutoGenerate}
            style={{
              padding: '5px 12px', fontSize: 12, fontWeight: 600,
              background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.3)',
              borderRadius: 6, color: '#cbd5e1', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >Cancel</button>
          <style>{`@keyframes ps-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Shell */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>

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
            <div style={{ background: '#fef3c7', borderTop: 'none', borderBottom: '1px solid #fde047', flexShrink: 0 }}>
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
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 40px', cursor: 'pointer', userSelect: 'none' as const }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#92400e', fontSize: '12px' }}>
                  ⚠️ Alert — Some required fields are incomplete.{' '}
                  <span style={{ textDecoration: 'underline', fontWeight: 700 }}>
                    {isOrchestrationMode && leftTab === 'draft' ? 'Review required fields →' : 'Click to review →'}
                  </span>
                </div>
                <span
                  style={{ fontSize: '12px', color: '#92400e', transform: isAlertExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); setIsAlertExpanded(a => !a); }}
                >▼</span>
              </div>
              {isAlertExpanded && (
                <div style={{ padding: '0 40px 6px', color: '#78350f', fontSize: '11px', borderTop: '1px solid #fde047', paddingTop: '5px' }}>
                  Review all <strong>required fields</strong> marked with * in the synoptic checklist. Ensure all required data elements are completed before finalizing.
                </div>
              )}
            </div>
          );
        })()}

        {/* Main body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

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
                setEditingSpecimen(null);
                setShowSpecimenEdit(true);
              }}
              onOpenCaseComment={() => setShowCaseCommentModal(true)}
              onOpenSpecimenComment={(id) => { setActiveSpecimenCommentId(id); setShowSpecimenCommentModal(true); }}
              hasCaseComment={hasCaseComment}
              specimenComments={specimenComments}
              activeReportInstanceId={activeReportInstanceId}
              onSelectReport={(instanceId, specimenId) => {
                setActiveReportInstanceId(instanceId);
                setActiveSpecimenId(specimenId);
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
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', position: 'relative', background: 'rgba(15,23,42,0.95)', display: 'flex', flexDirection: 'column' }}>

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
                      <span style={{ color: '#475569' }}>No synoptic selected</span>
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
            <div style={{
              display: 'flex', alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              flexShrink: 0, background: 'rgba(10,16,32,0.6)',
            }}>
              {(['draft', 'report', 'results'] as const)
                .filter(tab => tab !== 'draft' || isOrchestrationMode)
                .map(tab => {
                const label = tab === 'draft' ? '✍️ Report Draft' : tab === 'report' ? '📑 Synoptic Reporting' : '⚗️ Computational';
                const isActive = leftTab === tab;
                const hasResult = tab === 'results' && caseComputationalFlags.length > 0;
                const st2 = caseData?.status ?? 'draft';
                // 'pending-countersign' is a per-synoptic-instance status (SynopticReportInstance),
                // not a CaseStatus value — check whether any instance on this case needs it.
                const needsCountersign2 = (caseData?.synopticReports ?? []).some(r => r.status === 'pending-countersign');
                const dot2Color = st2 === 'finalized' ? '#10b981'
                  : st2 === 'pending-review' || needsCountersign2 ? '#f59e0b'
                  : st2 === 'in-progress' ? '#60a5fa'
                  : '#3b82f6'; // draft = blue
                return (
                  <button
                    key={tab}
                    onClick={() => safeSetLeftTab(tab)}
                    style={{
                      padding: '9px 18px', fontSize: 12,
                      fontWeight:   isActive ? 600 : 400,
                      color:        isActive ? '#38bdf8' : 'rgba(148,163,184,0.7)',
                      background:   'none', border: 'none',
                      borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                      cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 6,
                      whiteSpace: 'nowrap' as const,
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#94a3b8'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'rgba(148,163,184,0.7)'; }}
                  >
                    {label}
                    {tab === 'draft' && isOrchestrationMode && (
                      <span
                        title={`Report status: ${String(st2)}`}
                        style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                          background: dot2Color, flexShrink: 0,
                          border: `1.5px solid ${dot2Color}`,
                          boxShadow: `0 0 5px ${dot2Color}`,
                        }}
                      />
                    )}
                    {hasResult && (
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        background:  isActive ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.08)',
                        color:       isActive ? '#38bdf8' : 'rgba(148,163,184,0.6)',
                        padding: '0px 5px', borderRadius: 99, lineHeight: '16px',
                      }}>
                        {caseComputationalFlags.length}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Sequencer + DEV tools — right side of tab bar.
                  Hidden in Orchestration draft mode — these move into the
                  centre Full Report pane's own header there instead, since
                  they're document-level controls, not tab-bar navigation. */}
              {!(isOrchestrationMode && leftTab === 'draft') && (
              <div style={{ marginLeft: 'auto', padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                {import.meta.env.DEV && caseData && (
                  <button
                    onClick={() => handleProtocolChangesDetected([{
                      id: 'demo-proto-1',
                      specimenId:           caseData.specimens?.[0]?.id ?? 'sp-1',
                      specimenLabel:        (caseData.specimens?.[0] as any)?.label ?? 'A',
                      specimenDesc:         (caseData.specimens?.[0] as any)?.specimenType ?? 'Core biopsy',
                      currentTemplateId:    'breast_core_general',
                      currentTemplateName:  'Breast Core Biopsy (General)',
                      proposedTemplateId:   'breast_invasive_carcinoma',
                      proposedTemplateName: 'Breast Invasive Carcinoma (CAP)',
                      reason:               'Microscopic shows invasive ductal carcinoma, nuclear grade 2, tubule formation score 3.',
                      confidence:           92,
                    }])}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: '#f59e0b', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                    title="DEV: Simulate microscopic slide received"
                  >
                    ⚡ Sim Microscopic
                  </button>
                )}
                <button
                  onClick={() => setShowSequencer(true)}
                  title="Open report sequencer"
                  style={{
                    padding: '5px 12px', fontSize: 11, fontWeight: 600,
                    color: '#38bdf8', cursor: 'pointer',
                    background: 'rgba(8,145,178,0.1)',
                    border: '1px solid rgba(8,145,178,0.3)',
                    borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.15s', whiteSpace: 'nowrap' as const,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(8,145,178,0.2)'; e.currentTarget.style.borderColor = '#0891B2'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(8,145,178,0.1)'; e.currentTarget.style.borderColor = 'rgba(8,145,178,0.3)'; }}
                >
                  🔀 Sequencer ↗
                </button>
              </div>
              )}

            </div>

            {/* Tab content */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
              {/* Report Draft — three-column Orchestration layout (O26- cases only)
                  Navigator (foldable) | Full Report (centre, read-only) | Section Editor (right)
                  All three share activeSectionId — clicking in any pane updates the other two. */}
              {isOrchestrationMode && (
              <div style={{ position: 'absolute', inset: 0, display: leftTab === 'draft' ? 'flex' : 'none', background: '#0b1120' }}>

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
                            specimenDesc:         (caseData.specimens?.[0] as any)?.specimenType ?? 'Core biopsy',
                            currentTemplateId:    'breast_core_general',
                            currentTemplateName:  'Breast Core Biopsy (General)',
                            proposedTemplateId:   'breast_invasive_carcinoma',
                            proposedTemplateName: 'Breast Invasive Carcinoma (CAP)',
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
                onSelectReport={(instanceId, specimenId) => {
                  setActiveReportInstanceId(instanceId);
                  setActiveSpecimenId(specimenId);
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
              <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', display: leftTab === 'report' ? 'block' : 'none' }}>
                <LeftReportPanel caseData={caseData} highlightText={highlightText ?? undefined} />
              </div>

              {/* Computational */}
              {leftTab === 'results' && (
                <div style={{ position: 'absolute', inset: 0, background: '#0b1120' }}>
                  {caseId && (
                    <ComputationalPanel
                      caseId={caseId}
                      allCompFlags={caseComputationalFlags}
                      allAvailableFlags={computationalFlags}
                      aiSuggestions={aiSuggestions}
                      onFlagsChanged={async () => {
                        // Re-fetch case so the tab badge count stays in sync
                        if (!caseId) return;
                        const c = await caseRouter.getCase(caseId).catch(() => null);
                        if (c) setCaseData(c ?? null);
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Expand button — hidden in orchestration draft mode */}
          <div style={{ position: 'relative', width: 0, zIndex: 200, display: isOrchestrationMode && leftTab === 'draft' ? 'none' : 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setPanelMode(m => m ? null : 'expanded')}
              title="Full-screen review mode"
              style={{
                position: 'absolute', left: -16,
                width: 32, height: 32, borderRadius: '50%',
                background: '#0891B2', border: '2px solid rgba(255,255,255,0.2)',
                color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 15, boxShadow: '0 2px 12px rgba(0,0,0,0.8)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0e7490')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0891B2')}
            >⤢</button>
          </div>

          {/* Right panel — hidden in orchestration draft mode (Sequencer provides synoptic access) */}
          <div style={{
            flex: isOrchestrationMode && leftTab === 'draft' ? '0 0 0px' : 1,
            minWidth: 0,
            background: 'rgba(15,23,42,0.95)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            visibility: isOrchestrationMode && leftTab === 'draft' ? 'hidden' : 'visible',
          }}>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <RightSynopticPanel
                ref={synopticPanelRef}
                caseData={caseData}
                activeTab={activeTab}
                activeReportInstanceId={activeReportInstanceId}
                onReportInstanceChange={setActiveReportInstanceId}
                onCaseUpdate={(updated) => { setCaseData(updated); markDirty('Synoptic fields'); }}
                isDirty={hasUnsavedData}
                scrollToField={alertFieldId}
                onScrollComplete={() => setAlertFieldId(null)}
                onHighlight={setHighlightText}
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
              style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', flexDirection: 'column', background: '#0a0f1e' }}
              onKeyDown={e => { if (e.key === 'Escape') setPanelMode(null); }}
              tabIndex={-1}
            >
              <div style={{ background: 'rgba(8,20,40,0.98)', borderBottom: '1px solid rgba(8,145,178,0.3)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', height: 34, fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>{accession}</span>
                  {patient && <><span style={{ color: '#334155' }}>·</span><span style={{ color: '#f1f5f9', fontWeight: 600 }}>{patient}</span></>}
                  {sex  && <><span style={{ color: '#334155' }}>·</span><span style={{ color: '#f1f5f9' }}>{sex}</span></>}
                  {dob  && <><span style={{ color: '#334155' }}>·</span><span style={{ color: '#94a3b8', fontSize: 11 }}>DOB</span><span style={{ color: '#f1f5f9', marginLeft: 3 }}>{dob}</span></>}
                </div>
                {caseData.specimens && caseData.specimens.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 10px', overflowX: 'auto' }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.08em', flexShrink: 0, textTransform: 'uppercase', marginRight: 4 }}>Specimen:</span>
                    {caseData.specimens.map((sp: any) => {
                      const reports  = (caseData.synopticReports ?? []).filter((r: any) => r.specimenId === sp.id);
                      const hasNone  = reports.length === 0;
                      const hasMulti = reports.length > 1;
                      const isActive = sp.id === activeSpecimenId;
                      const pillBorder = hasNone ? '#d97706' : '#0891B2';
                      const pillBg     = hasNone ? 'transparent' : isActive ? '#0891B2' : 'transparent';
                      const pillColor  = hasNone ? '#fbbf24' : isActive ? '#ffffff' : '#7dd3fc';
                      const labelColor = hasNone ? '#f59e0b' : isActive ? '#ffffff' : '#38bdf8';
                      return (
                        <div key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <button
                            className={`ps-specimen-pill${hasNone ? ' warning' : ''}`}
                            onClick={() => {
                              setActiveSpecimenId(sp.id);
                              if (hasNone) { setShowAddSynopticModal(true); }
                              else if (!hasMulti) { setActiveReportInstanceId(reports[0].instanceId); }
                            }}
                            style={{
                              padding: '3px 12px', fontSize: 12, fontWeight: 600, flexShrink: 0,
                              borderRadius: 20, border: `1.5px solid ${pillBorder}`,
                              background: pillBg, color: pillColor,
                              cursor: 'pointer', transition: 'all 0.15s',
                              display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                            }}
                          >
                            <span style={{ color: labelColor, fontWeight: 800 }}>{sp.label}:</span>
                            <span>{sp.description}</span>
                            {hasNone && <span style={{ fontSize: 10 }}>⚠</span>}
                          </button>
                          {hasMulti && (
                            <select
                              className="ps-specimen-pill"
                              value={isActive ? activeReportInstanceId : reports[0].instanceId}
                              onChange={e => { setActiveSpecimenId(sp.id); setActiveReportInstanceId(e.target.value); }}
                              style={{
                                height: 24, fontSize: 11, fontWeight: 600, maxWidth: 160, flexShrink: 0,
                                background: 'rgba(8,145,178,0.15)', color: '#7dd3fc',
                                border: '1.5px solid #0891B2', borderRadius: 20,
                                padding: '0 8px', cursor: 'pointer', outline: 'none',
                              }}
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

              <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'rgba(15,23,42,0.95)' }}>
                  <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, background: 'rgba(10,16,32,0.6)' }}>
                    {(['draft', 'sequencer', 'report', 'results'] as const).map(tab => {
                      const isActive = leftTab === tab;
                      const label    = tab === 'draft' ? '✍️ Report Draft' : tab === 'sequencer' ? '🔀 Sequencer' : tab === 'report' ? '📑 Synoptic Reporting' : '⚗️ Computational';
                      // Status dot for Full Report tab — colour reflects case status
                      const st = caseData?.status ?? 'draft';
                      // 'pending-countersign' is a per-synoptic-instance status (SynopticReportInstance),
                      // not a CaseStatus value — check whether any instance on this case needs it.
                      const needsCountersign = (caseData?.synopticReports ?? []).some(r => r.status === 'pending-countersign');
                      const statusDotColor = st === 'finalized' ? '#10b981'
                        : st === 'pending-review' || needsCountersign ? '#f59e0b'
                        : st === 'in-progress' ? '#60a5fa'
                        : '#3b82f6'; // draft = blue
                      const statusLabel = String(st);
                      return (
                        <button key={tab} onClick={() => safeSetLeftTab(tab)} style={{
                          padding: '9px 18px', fontSize: 12,
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? '#38bdf8' : 'rgba(148,163,184,0.7)',
                          background: 'none', border: 'none',
                          borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                          cursor: 'pointer', transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#94a3b8'; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'rgba(148,163,184,0.7)'; }}
                        >
                          {label}
                          {/* Status dot on Full Report tab — after label, visible on all states */}
                          {tab === 'report' && (
                            <span
                              title={`Report status: ${statusLabel}`}
                              style={{
                                display: 'inline-block',
                                width: 8, height: 8, borderRadius: '50%',
                                background: statusDotColor,
                                border: `1.5px solid ${statusDotColor}`,
                                flexShrink: 0,
                                boxShadow: `0 0 5px ${statusDotColor}`,
                              }}
                            />
                          )}
                          {tab === 'results' && caseComputationalFlags.length > 0 && (
                            <span style={{
                              fontSize: 10, fontWeight: 600,
                              background: isActive ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.08)',
                              color: isActive ? '#38bdf8' : 'rgba(148,163,184,0.6)',
                              padding: '0 5px', borderRadius: 99, lineHeight: '16px',
                            }}>{caseComputationalFlags.length}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, display: leftTab === 'draft' ? 'flex' : 'none' }}>
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
                                  specimenDesc:         (caseData.specimens?.[0] as any)?.specimenType ?? 'Core biopsy',
                                  currentTemplateId:    'breast_core_general',
                                  currentTemplateName:  'Breast Core Biopsy (General)',
                                  proposedTemplateId:   'breast_invasive_carcinoma',
                                  proposedTemplateName: 'Breast Invasive Carcinoma (CAP)',
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
                    <div style={{ position: 'absolute', inset: 0, display: leftTab === 'sequencer' ? 'flex' : 'none', flexDirection: 'column' }}>
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
                        onSelectReport={(instanceId, specimenId) => {
                          setActiveReportInstanceId(instanceId);
                          setActiveSpecimenId(specimenId);
                        }}
                      />
                    </div>
                    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', display: leftTab === 'report' ? 'block' : 'none' }}>
                      <LeftReportPanel caseData={caseData} highlightText={highlightText ?? undefined} />
                    </div>
                    {leftTab === 'results' && (
                      <div style={{ position: 'absolute', inset: 0, background: '#0b1120', display: 'flex' }}>
                        {caseId && (
                          <ComputationalPanel
                            caseId={caseId}
                            allCompFlags={caseComputationalFlags}
                            allAvailableFlags={computationalFlags}
                            aiSuggestions={aiSuggestions}
                            
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ position: 'relative', width: 0, zIndex: 200, display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={() => setPanelMode(null)}
                    title="Exit full-screen (Esc)"
                    style={{
                      position: 'absolute', left: -16,
                      width: 32, height: 32, borderRadius: '50%',
                      background: '#0891B2', border: '2px solid rgba(255,255,255,0.2)',
                      color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 15, boxShadow: '0 2px 12px rgba(0,0,0,0.8)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#0e7490')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#0891B2')}
                  >⤡</button>
                </div>

                <div style={{ flex: 1, minWidth: 0, background: 'rgba(15,23,42,0.95)', overflowY: 'auto' }}>
                  <RightSynopticPanel
                    caseData={caseData}
                    activeTab={activeTab}
                    activeReportInstanceId={activeReportInstanceId}
                    onReportInstanceChange={setActiveReportInstanceId}
                    onCaseUpdate={(updated) => { setCaseData(updated); markDirty('Synoptic fields'); }}
                    scrollToField={alertFieldId}
                    onScrollComplete={() => setAlertFieldId(null)}
                    onHighlight={setHighlightText}
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
            }
            clearDirty();
            showToast('Draft saved');
            navigateToCase('next');
          }}
          onFinalize={() => handleRequestFinalize(false)}
          onFinalizeAndNext={() => handleRequestFinalize(true)}
          onSignOut={() => { if (caseData?.reportingMode !== 'copilot') setShowSignOutModal(true); }}
          
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
        activeSynopticTitle={caseData?.accession?.fullAccession ?? 'Case'}
        onModeChange={setAmendmentMode}
        onTextChange={setAmendmentText}
        onClose={() => { setShowAmendmentModal(false); setDeferredAmendmentContext(null); }}
        onSubmit={handleAmendmentSubmit}
        triggeredBySynopticTitle={deferredAmendmentContext?.title}
        prefillText={deferredAmendmentContext?.prefill}
      />

      <LogoutWarningModal
        show={showLogoutModal}
        overlayStyle={overlayStyle}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => { setShowLogoutModal(false); handleLogout(); }}
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
          onAdd={(newInstances, updatedCase) => {
            setCaseData(updatedCase);
            markDirty('Synoptic reports');
            setActiveReportInstanceId(newInstances[0].instanceId);
            setActiveSpecimenId(newInstances[0].specimenId);
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
            finalizeCase(args);
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
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60000,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)',
            borderRadius: 12, padding: '28px 32px', maxWidth: 420, width: '90%',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
              Unsaved draft changes
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24, lineHeight: 1.6 }}>
              You have unsaved changes in the report draft. Would you like to save before switching tabs?
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPendingTabSwitch(null)}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
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
                style={{ padding: '8px 16px', background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, color: '#cbd5e1', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
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
                style={{ padding: '8px 16px', background: 'rgba(8,145,178,0.2)', border: '1px solid rgba(8,145,178,0.4)', borderRadius: 6, color: '#38bdf8', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
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
