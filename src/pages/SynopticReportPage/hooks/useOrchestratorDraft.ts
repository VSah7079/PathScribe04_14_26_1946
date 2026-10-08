// src/pages/SynopticReportPage/hooks/useOrchestratorDraft.ts
// ─────────────────────────────────────────────────────────────────────────────
// Extracted from SynopticReportPage.tsx as part of the same incremental
// cleanup that produced the other hooks in this directory — see
// useLisIntegration.ts's header for the full rationale.
//
// This is a narrower, more honest scope than "the orchestrator state
// cluster" as a whole. orchSections and activeSectionId themselves stay
// in the main component — both are read directly in JSX (section
// editor props, tab-switch guards) and by other already-extracted hooks
// (useReportGeneration, useSignOutWorkflow), so moving the state itself
// would mean either dragging those concerns in too or splitting the
// state from its own usage. Same reasoning as caseData/orchSections in
// every earlier extraction tonight. What moves here is the DRAFT
// LIFECYCLE logic that operates on that state: save, restore-on-load,
// and sync-to-diagnostic.
//
// Deliberately NOT included: handleConcurrencyForceSave. It's defined
// very early in the main file (before orchSections is even declared), so
// it stays there; it saves through writeCaseDraft below, the same write
// path as saveDraftInternal.
//
// SECOND HALF OF THIS EXTRACTION — pulled inline JSX closures into
// named functions:
// handleSectionTextChange, handleAcceptSection, handleAcceptDraft,
// handleKeepVersion, and handleAcceptAllSections were previously
// anonymous arrow functions written directly as OrchestratorSectionEditor
// JSX props (onSectionChange, onAcceptSection, onAcceptDraft,
// onKeepVersion, onAcceptAll) in the main file. Each one contains real
// business logic — what counts as a user edit, how a pending AI draft
// gets promoted to the committed version, what "accept all" means —
// not just event wiring. Per explicit direction to minimize business
// logic living in the UI/JSX layer, these are pulled out here as named,
// independently readable functions; the JSX now just wires each prop to
// the named function, same as every other handler in this file.
// ─────────────────────────────────────────────────────────────────────────────

import { countBlockMessage, findSynopticEntryChecks, totalWarningsMessage } from '@/services/templates/synopticEntryChecks';
import { useEffect, useCallback, useRef, type MutableRefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { formatList } from '@/utils/formatList';
import { caseRouter } from '@/services/cases/CaseRouter';
import type { OrchestratorSection } from '../components/OrchestratorSectionEditor';
import type { Case } from '@/types/case/Case';
import type { SetConcurrencyConflict } from './sharedHookTypes';
import { handleConcurrencyConflict } from './sharedHookTypes';
import { saveDraftParts, caseWriteDeps, caseConflictRows, type MergeReview } from '@/services';
import { ConcurrencyConflictError } from '@/services/cases/ConcurrencyConflictError';

// orchSections genuinely isn't declared on the shared Case type — it's
// real, persisted data (see writeCaseDraft below), just never added to
// Case.ts. Extended locally here rather than editing the shared type:
// Case.ts is used across the whole app, and OrchestratorSection is
// defined in a UI component file, not a shared types module — importing
// it into Case.ts would be a real layering violation (core data types
// depending on component types). A local extension gets the same
// type-safety win (no more `as any` on every orchSections access) without
// that wider, harder-to-verify blast radius.
type CaseWithOrchSections = Case & { orchSections?: OrchestratorSection[] };

// ── Shared write path ──────────────────────────────────────────────────────
// Both saveDraftInternal below and the main file's handleConcurrencyForceSave
// (the "Save Mine Anyway" conflict-resolution action) need to write the same
// mode-aware field (orchSections for Orchestration, synopticReports for
// CoPilot) — that decision was previously duplicated verbatim in both
// places, a real, silent-drift risk if one path ever got fixed without the
// other. The genuine difference between the two callers — a normal save
// passes expectedVersion for the optimistic-concurrency check;
// "Save Mine Anyway" deliberately omits it to force the overwrite — is
// preserved by leaving expectedVersion as an explicit, optional parameter
// here rather than folding the two callers into one function outright.
// Exported as a plain async function, not part of the hook itself, so
// handleConcurrencyForceSave (defined very early in the main file, before
// useOrchestratorDraft is even called) can import and call it directly
// without needing to go through the hook's return value or be reordered.
/**
 * What a draft save writes, by reporting mode (the comments below explain
 * why each field is there). PS-71 (Batch 458): shared by the versioned save
 * and the Edit Conflict dialog's Overwrite.
 */
export function caseDraftUpdates(caseData: Case, orchSections: OrchestratorSection[]): Partial<Case> {
  // Real fix, per direct follow-up: "the case prefix can't determine
  // assist vs. orchestration case, we need to use a real flag."
  // reportingMode is the real, authoritative field (reportingModeRouting.ts).
  if (caseData.reportingMode === 'orchestrator') {
    // Real fix, per direct report: synopticReports and grossingReports are
    // edited for Orchestration cases too, and caseRouter.updateCase does a
    // shallow merge, so omitting them here meant Save Draft silently
    // discarded edits to either field.
    return {
      orchSections,
      synopticReports: caseData.synopticReports,
      grossingReports: caseData.grossingReports,
    } as Partial<CaseWithOrchSections> as Partial<Case>;
  }
  // CoPilot mode persists synopticReports; orchSections means nothing there.
  return { synopticReports: caseData.synopticReports };
}

export async function writeCaseDraft(
  caseData: Case,
  _caseId: string | undefined,
  orchSections: OrchestratorSection[],
  // PS-71 (Batch 458): required. A save without a version could overwrite
  // someone else's newer save; the Edit Conflict dialog's Overwrite goes
  // through services/cases/caseWrite.ts overwriteAfterConflict instead.
  expectedVersion: number,
): Promise<void> {
  // Batch 431: no browser copy. The case record (with its version) is the
  // one copy, so a copy left on another workstation can't override it.
  await caseRouter.updateCase(caseData.id, caseDraftUpdates(caseData, orchSections), expectedVersion);
}

interface UseOrchestratorDraftParams {
  caseData: Case | null;
  setCaseData: React.Dispatch<React.SetStateAction<Case | null>>;
  caseId: string | undefined;
  orchSections: OrchestratorSection[];
  setOrchSections: React.Dispatch<React.SetStateAction<OrchestratorSection[]>>;
  activeSectionId: string | null;
  setActiveSectionId: (id: string | null) => void;
  isOrchestrationMode: boolean;
  leftTab: string;
  knownVersionRef: MutableRefObject<number>;
  setConcurrencyConflict: SetConcurrencyConflict;
  clearDirty: () => void;
  discardDraft: () => void;
  showToast: (message: string, kind?: import('@/utils/toastPolicy').ToastKind) => void;
  /** PS-71 (Batch 458): the draft as last loaded or saved, owned by the page so
   *  the browser draft copy can carry it (a restored draft then merges too). */
  draftBaseRef?: MutableRefObject<Partial<Case>>;
  /** PS-71 (Batch 458): a change that stopped at the Edit Conflict dialog;
   *  saved (merged) with the next draft save, then cleared. */
  pendingPartsRef?: MutableRefObject<{ parts: Partial<Case>; base: Partial<Case> } | null>;
  /** Batch 458 (Pete: "an option to abort or accept the changes"): someone
   *  else saved other parts since; the page shows what changed and the
   *  person decides. Without it, the merge is saved straight away. */
  onMergeReview?: (review: MergeReview) => void;
  /** Batch 465b: asks the person to go past a warning (a hand-entered total that differs from its grid); false = don't save. */
  confirmWarnings?: (message: string) => Promise<boolean>;
}

export function useOrchestratorDraft({
  caseData, setCaseData, caseId, orchSections, setOrchSections,
  activeSectionId, setActiveSectionId, isOrchestrationMode, leftTab,
  knownVersionRef, setConcurrencyConflict, clearDirty, discardDraft, showToast, draftBaseRef, pendingPartsRef, onMergeReview, confirmWarnings,
}: UseOrchestratorDraftParams) {
  const { t, i18n } = useTranslation();

  // PS-71 (Batch 458): the draft as this page last loaded or saved it, so a
  // refused save can be merged section by section onto someone else's newer
  // save (services/cases/caseWrite.ts saveDraftParts).
  const ownBaseRef = useRef<Partial<Case>>({});
  const baseDraftRef = draftBaseRef ?? ownBaseRef;

  // ── Save ──────────────────────────────────────────────────────────────
  // The real consolidation — ONE implementation of "save the draft,"
  // mode-aware (Orchestration's orchSections vs. CoPilot's synopticReports)
  // and version-checked, used by every save trigger in this file instead
  // of each one reimplementing the same logic slightly differently. Found
  // while wiring concurrency checks: there were at least four separate,
  // independently-written copies of this (the PATHSCRIBE_ORCH_SAVE_DRAFT
  // event handler, "Save & Switch," "Save & Leave," and the
  // onSaveDraft/onSaveAndNext pair) — fixing "Save Draft" didn't fix "Save
  // Draft" everywhere, because there wasn't one save path, there were four.
  //
  // Returns true if the save actually completed (caller may proceed with
  // whatever it wanted to do next — switch tabs, navigate, etc.); false if
  // held by a real conflict (caller must NOT proceed — the conflict modal
  // is now showing and owns the next step).
  //
  // Matches pre-existing behavior for non-conflict failures deliberately
  // unchanged: every one of the four original implementations logged the
  // error to console but still cleared dirty state and showed "Draft
  // saved" — not something this consolidation silently fixes, since
  // nobody asked for that behavior to change and it's a separate,
  // pre-existing issue if it's wrong.
  const saveDraftInternal = useCallback(async (): Promise<boolean> => {
    if (!caseData?.id) {
      clearDirty();
      showToast(t('useOrchestratorDraft.toast.draftSaved'));
      return true;
    }
    // Batch 465b (Pete): a grid count above its limit (nodes positive > examined) stops the save; a hand-entered
    // total that differs from its grid asks first.
    const checks = await findSynopticEntryChecks(caseData);
    if (checks.blocking.length) {
      showToast(t('synopticChecks.saveBlocked', { problem: countBlockMessage(t, checks.blocking[0]) }), 'error');
      return false;
    }
    if (checks.warnings.length && confirmWarnings && !(await confirmWarnings(totalWarningsMessage(t, checks.warnings)))) return false;
    // PS-71 (Batch 458): saved against the page's version. If someone else
    // saved since, the draft is merged section by section onto their save
    // and saved with no dialog; only when both changed the same section does
    // the Edit Conflict dialog open.
    let merged = false;
    let mergedParts: string[] = [];
    try {
      const pending = pendingPartsRef?.current ?? null;
      const mine = { ...(pending?.parts ?? {}), ...caseDraftUpdates(caseData, orchSections) };
      const base = { ...(pending?.base ?? {}), ...baseDraftRef.current };
      const r = await saveDraftParts(caseData.id, mine, base, knownVersionRef.current, caseWriteDeps, { review: !!onMergeReview, before: caseData });
      if (r.ok === false) {
        if (r.reason === 'review') { onMergeReview?.(r.review); return false; }
        if (r.reason === 'overlap') {
          handleConcurrencyConflict(new ConcurrencyConflictError(caseData.id, knownVersionRef.current, r.actualVersion), setConcurrencyConflict, { actionName: `draft save (same section changed by both: ${r.overlap.join(', ') || 'repeated saves'})` });
          return false;
        }
        console.error('Failed to persist draft: case not found');
      } else {
        knownVersionRef.current = r.version;
        if (pendingPartsRef) pendingPartsRef.current = null;
        if (r.merged) {
          merged = true;
          const saved = r.saved as CaseWithOrchSections;
          // Which parts the other person had changed, for the message.
          mergedParts = caseConflictRows(caseData, saved, []).map(row => row.field).filter(f => !(f in mine));
          baseDraftRef.current = caseDraftUpdates(saved, saved.orchSections ?? []);
          // Take up the other person's changes; keep this page's narrative view.
          setCaseData(prev => (prev ? { ...saved, diagnostic: isOrchestrationMode ? prev.diagnostic : saved.diagnostic } as Case : prev));
          if (isOrchestrationMode && Array.isArray(saved.orchSections)) setOrchSections(saved.orchSections);
        } else {
          baseDraftRef.current = caseDraftUpdates(caseData, orchSections);
        }
      }
    } catch (e) {
      if (handleConcurrencyConflict(e, setConcurrencyConflict)) return false;
      console.error('Failed to persist draft:', e);
    }
    // Real fix, found via a direct bug report: this never cleared the
    // LOCAL draft cache (useDraftCache.ts) after a genuinely successful
    // server save — the server-side save and the local backup are two
    // separate mechanisms, and this function only ever handled the
    // former. That meant a stale local draft entry survived every
    // successful Save Draft, and the next time the draft-recovery check
    // ran (e.g. landing back on this case), it incorrectly reported an
    // "unsaved draft found" for work that had already been persisted.
    discardDraft();
    clearDirty();
    showToast(!merged ? t('useOrchestratorDraft.toast.draftSaved')
      : mergedParts.length
        ? t('useOrchestratorDraft.toast.draftSavedMergedParts', { parts: formatList(mergedParts.map(f => t(`synopticReportPage.concurrency.parts.${f}`)), i18n.language) })
        : t('useOrchestratorDraft.toast.draftSavedMerged'));
    return true;
  }, [caseData, orchSections, clearDirty, showToast, discardDraft, knownVersionRef, setConcurrencyConflict, setCaseData, setOrchSections, isOrchestrationMode, t, i18n.language, pendingPartsRef, baseDraftRef, onMergeReview, confirmWarnings]);

  // ── Restore on load ──────────────────────────────────────────────────
  // Batch 431 (Pete: the saved case is the single source of truth): the
  // sections come from the case record only. They used to be read from a
  // browser copy first, which let a copy left on one workstation override a
  // newer save made at another. Runs whenever caseId or caseData changes, so
  // a later caseData load can't be missed.
  useEffect(() => {
    if (!caseId) return;

    let restored: OrchestratorSection[] | null = null;
    const fromCase = (caseData as CaseWithOrchSections | null)?.orchSections;
    // PS-71 (Batch 458): the draft as loaded, the base for merging a later save.
    if (caseData) baseDraftRef.current = caseDraftUpdates(caseData, fromCase ?? []);
    if (Array.isArray(fromCase) && fromCase.length > 0) {
      restored = fromCase;
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
  }, [orchSections, activeSectionId, setActiveSectionId]);

  // ── Sync to diagnostic ────────────────────────────────────────────────
  // Sync orchSections → caseData.diagnostic so LeftReportPanel (Full Report)
  // always reflects the current draft without requiring a manual save.
  // Extracted to a stable callback so it can be invoked both reactively
  // (whenever orchSections itself changes — the original behavior) AND
  // explicitly whenever the user switches onto the Synoptic Reporting tab,
  // as a defensive re-sync at the moment LeftReportPanel actually becomes
  // visible — covers any edge case where the continuous effect hasn't
  // caught up yet (e.g. orchSections just restored from the case on a
  // fresh tab switch before that effect's first run lands).
  const syncOrchSectionsToDiagnostic = useCallback(() => {
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
  }, [orchSections, isOrchestrationMode, setCaseData]);

  useEffect(() => { syncOrchSectionsToDiagnostic(); }, [orchSections, isOrchestrationMode]); // eslint-disable-line

  // Explicit re-sync on tab switch — the moment leftTab becomes 'report',
  // force a fresh pull from orchSections rather than relying solely on the
  // change-triggered effect above.
  useEffect(() => {
    if (leftTab === 'report') syncOrchSectionsToDiagnostic();
  }, [leftTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wire ORCH keyboard/voice events to page-level handlers ────────────────
  useEffect(() => {
    if (!isOrchestrationMode) return;
    const saveDraft = async () => {
      await saveDraftInternal();
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
  }, [isOrchestrationMode, caseData?.id, orchSections, saveDraftInternal]);

  // ── Section editing business logic ───────────────────────────────────
  // Previously five anonymous inline closures on OrchestratorSectionEditor's
  // JSX props — see this file's header for why they're named functions here.
  const handleSectionTextChange = useCallback((id: string, html: string) => {
    setOrchSections(prev => prev.map(s =>
      s.id === id ? { ...s, text: html, userEdited: html !== s.aiGenerated } : s
    ));
  }, [setOrchSections]);

  const handleAcceptSection = useCallback((id: string, finalText: string) => {
    setOrchSections(prev =>
      prev.map(s => s.id === id
        ? { ...s, text: finalText, userEdited: true } // explicit Accept — always commits, no text-equality guessing
        : s)
    );
  }, [setOrchSections]);

  const handleAcceptDraft = useCallback((id: string) => {
    setOrchSections(prev =>
      prev.map(s => s.id === id && s.pendingDraft != null
        ? { ...s, text: s.pendingDraft, aiGenerated: s.pendingDraft, userEdited: false, pendingDraft: undefined }
        : s)
    );
  }, [setOrchSections]);

  const handleKeepVersion = useCallback((id: string) => {
    setOrchSections(prev =>
      prev.map(s => s.id === id ? { ...s, pendingDraft: undefined } : s)
    );
  }, [setOrchSections]);

  const handleAcceptAllSections = useCallback(() => {
    setOrchSections(prev =>
      prev.map(s =>
        s.aiGenerated && !s.userEdited && !s.committed
          ? { ...s, userEdited: true }
          : s
      )
    );
  }, [setOrchSections]);

  return {
    saveDraftInternal,
    handleSectionTextChange,
    handleAcceptSection,
    handleAcceptDraft,
    handleKeepVersion,
    handleAcceptAllSections,
  };
}
