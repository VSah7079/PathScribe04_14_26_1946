// src/components/Flags/FlagManagerModal.tsx
//
// Layout:
//   LEFT (260px) — target rows (Case, All Specimens, Sp.1…) with applied flag chips.
//   RIGHT        — search + flag catalog filtered by selected target level.
//   FOOTER       — Cancel (reverts all changes) | Save (commits + closes)
//
// July 2026: restored to this file's own originally-documented design above.
// The implementation had drifted into persisting every click immediately
// (with a 5-second "undo toast" band-aid layered on top) despite this
// header always saying Cancel/Save. That drift caused two real bugs:
// (1) closing the modal after zero real edits could still trip the page's
// unsaved-changes warning (openFlagManager's own fetch-and-filter step
// could differ from what was already loaded), and (2) the "Discard
// changes?" prompt shown on close never actually reversed anything --
// the flag was already permanently written the moment "+Apply" was
// clicked, so "Discard" was a false promise. Fixed by actually building
// the draft-then-commit model this file always said it had: nothing
// touches the real backend until Save is clicked, so Cancel/Discard is
// now genuinely true, and FlagChip's existing per-row Undo (clears
// deletedAt on the same draft instance) is the safety net for removals,
// matching CaseTeamModal's correct deferred/undo model in spirit.
//
// Styling: 100% via pathscribe.css classes (section 23 — Flag Manager).
// Gradients match the Patient History modal (.ps-research-* system).

import React, { useState, useMemo, useCallback, useEffect } from "react";
import ReactDOM from 'react-dom';
import { useAuditLog } from '@/components/Audit/useAuditLog';
import "../../pathscribe.css";
import type { FlagDefinition } from "../../types/FlagDefinition";

// ─── Payload types (previously in missing caseFlagsApi) ──────────────────────
interface ApplyFlagPayload  { caseId: string; flagDefinitionId: string; specimenId?: string; }
interface DeleteFlagPayload { caseId: string; flagInstanceId: string; specimenId?: string; }

// ─── Local runtime types (previously in missing flagsRuntime / caseFlagsApi) ──
interface FlagInstance {
  id: string;
  flagDefinitionId: string;
  appliedAt: string;
  appliedBy: string;
  source: "product" | "system" | "user";
  deletedAt: string | null;
  deletedBy: string | null;
}
interface CaseWithFlags {
  id: string;
  flags: FlagInstance[];
  specimens: Array<{ id: string; label?: string; flags: FlagInstance[] }>;
  [key: string]: any;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  caseData: CaseWithFlags;
  flagDefinitions: FlagDefinition[];
  onApplyFlags: (payload: ApplyFlagPayload) => Promise<void>;
  onRemoveFlag:  (payload: DeleteFlagPayload) => Promise<void>;
  /** Reports whether the LOCAL DRAFT currently differs from what was
   *  loaded when the modal opened -- lets the page know a real unsaved
   *  edit is sitting in this modal, independent of the page's own
   *  content-field dirty-tracking. Called with false on unmount too, so
   *  the page never thinks a closed modal still has pending edits. */
  onDirtyChange?: (dirty: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const activeInst = (flags?: FlagInstance[]) => (flags ?? []).filter(f => !f.deletedAt);
const defById    = (defs: FlagDefinition[], id: string) => defs.find(d => d.id === id);
function deepClone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

const sevColor = (sev?: number): string => {
  if (!sev) return "#334155";
  if (sev >= 5) return "#ef4444";
  if (sev >= 4) return "#f59e0b";
  if (sev >= 3) return "#38bdf8";
  return "#334155";
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IcoCase = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect x="1.5" y="2" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4.5 5.5h7M4.5 8h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const IcoSpec = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="8" cy="8" r="2.5" fill="currentColor"/>
  </svg>
);
const IcoSearch = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const IcoFlag = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: "#ef4444" }}>
    <path d="M3 2v12M3 2h9l-2.5 4L12 10H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcoTrash = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcoUndo = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M3 7V3L1 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 3C3 3 5 1 8 1C11.866 1 15 4.134 15 8C15 11.866 11.866 15 8 15C4.134 15 1 11.866 1 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const IcoLock = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
);
const IcoCheck = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Scope dialog ─────────────────────────────────────────────────────────────

const ScopeDialog: React.FC<{
  flagName: string; otherCount: number;
  onSingle: () => void; onAll: () => void; onCancel: () => void;
}> = ({ flagName, otherCount, onSingle, onAll, onCancel }) => (
  <div data-capture-hide="true" className="fm-overlay" style={{ zIndex: 9500 }}>
    <div className="fm-dialog" style={{ width: 440 }}>
      <div className="fm-dialog-icon info"><IcoSpec /></div>
      <h3 className="fm-dialog-title">Remove from multiple specimens?</h3>
      <p className="fm-dialog-body">
        <strong>{flagName}</strong> is also applied to{" "}
        <strong>{otherCount} other specimen{otherCount !== 1 ? "s" : ""}</strong>.
      </p>
      <p className="fm-dialog-hint">This will apply once you click Save — all removals will be recorded in the audit trail.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={onSingle} className="fm-dialog-option neutral">
          Remove from this specimen only
        </button>
        <button onClick={onAll} className="fm-dialog-option danger">
          Remove from all {otherCount + 1} specimens
        </button>
        <button onClick={onCancel} className="fm-dialog-option ghost">
          Cancel
        </button>
      </div>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const FlagManagerModal: React.FC<Props> = ({
  onClose, caseData: initialCaseData, flagDefinitions, onApplyFlags, onRemoveFlag, onDirtyChange,
}) => {
  // The ONLY thing edited while this modal is open. Nothing here touches
  // the real backend until handleSave runs. initialCaseData itself is
  // kept around, untouched, as the "what did this look like when we
  // opened" snapshot used to compute both the Save diff and the dirty
  // check -- never mutated.
  const [localCase, setLocalCase] = useState<CaseWithFlags>(() => {
    const clone = deepClone(initialCaseData);
    if (!Array.isArray(clone.flags)) clone.flags = [];
    clone.specimens.forEach((s: any) => { if (!Array.isArray(s.flags)) s.flags = []; });
    return clone;
  });
  const [caseOn, setCaseOn]         = useState(true);
  const [spIds, setSpIds]           = useState<Set<string>>(new Set());
  const [query, setQuery]           = useState("");
  const [isSaving, setIsSaving]     = useState(false);

  const [scopeDialog, setScopeDialog] = useState<{
    flagName: string; defId: string; specimenId: string;
    otherSpecimenIds: string[];
    onConfirm: (removeAll: boolean) => void;
  } | null>(null);

  const [showDirtyWarn, setShowDirtyWarn] = useState(false);
  const { log } = useAuditLog();

  const allIds  = localCase.specimens.map((s: any) => s.id);
  const allOn   = allIds.length > 0 && allIds.every((id: string) => spIds.has(id));
  const invalid = caseOn && spIds.size > 0;

  const targetLevel: "case" | "specimen" | "none" =
    caseOn ? "case" : spIds.size > 0 ? "specimen" : "none";
  const hasTarget = targetLevel !== "none" && !invalid;

  // ── toggles ───────────────────────────────────────────────────────────────────
  const toggleCase = useCallback(() => { setCaseOn(v => !v); setSpIds(new Set()); }, []);
  const toggleAll  = useCallback(() => {
    setCaseOn(false);
    setSpIds(allOn ? new Set() : new Set(allIds));
  }, [allOn, allIds]);
  const toggleSp = useCallback((id: string) => {
    setCaseOn(false);
    setSpIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  // ── draft edits — local only, no API calls ────────────────────────────────────
  const addFlagLocally = useCallback((defId: string, specimenId?: string) => {
    const def = flagDefinitions.find(f => f.id === defId);
    if (def) log('flag_applied', { caseId: localCase?.id ?? '', flagName: def.name ?? def.id, specimenId });
    const inst: FlagInstance = {
      id: `local-${Date.now()}-${Math.random()}`,
      flagDefinitionId: defId,
      appliedAt: new Date().toISOString(),
      appliedBy: "current-user",
      source: "product",
      deletedAt: null,
      deletedBy: null,
    };
    setLocalCase(prev => {
      const next = deepClone(prev);
      if (!Array.isArray(next.flags)) next.flags = [];
      next.specimens.forEach((s: any) => { if (!Array.isArray(s.flags)) s.flags = []; });

      if (!specimenId) {
        if (!activeInst(next.flags).some((f: FlagInstance) => f.flagDefinitionId === defId))
          next.flags.push(inst);
      } else {
        const sp = next.specimens.find((s: any) => s.id === specimenId);
        if (sp && !activeInst(sp.flags).some((f: FlagInstance) => f.flagDefinitionId === defId))
          sp.flags.push({ ...inst, id: `local-${Date.now()}-${Math.random()}` });
      }
      return next;
    });
  }, [flagDefinitions, log, localCase?.id]);

  // Soft-delete within the draft only. If the instance was added THIS
  // session (local- id), this is the only trace of it ever existing --
  // no confirmation needed, nothing real is at risk. If it's a
  // previously-saved instance, this marks it for real removal on Save;
  // FlagChip's own Undo button (unchanged, see below) is the safety net,
  // not a blocking dialog -- see this file's header note on that choice.
  const removeFlagLocally = useCallback((instanceId: string, specimenId?: string) => {
    const inst = [...(localCase?.flags ?? []), ...(localCase?.specimens?.flatMap((sp: any) => sp.flags) ?? [])].find((f: any) => f.id === instanceId);
    const def  = inst ? flagDefinitions.find(f => f.id === inst.flagDefinitionId) : undefined;
    if (def) log('flag_removed', { caseId: localCase?.id ?? '', flagName: def.name ?? def.id, specimenId });
    const now = new Date().toISOString();
    setLocalCase(prev => {
      const next = deepClone(prev);
      if (!Array.isArray(next.flags)) next.flags = [];
      next.specimens.forEach((s: any) => { if (!Array.isArray(s.flags)) s.flags = []; });

      if (!specimenId) {
        const f = next.flags.find((f: FlagInstance) => f.id === instanceId);
        if (f) { f.deletedAt = now; f.deletedBy = "current-user"; }
      } else {
        const sp = next.specimens.find((s: any) => s.id === specimenId);
        const f  = sp?.flags.find((f: FlagInstance) => f.id === instanceId);
        if (f) { f.deletedAt = now; f.deletedBy = "current-user"; }
      }
      return next;
    });
  }, [flagDefinitions, log, localCase]);

  // ── apply — draft only ────────────────────────────────────────────────────────
  const handleApply = useCallback((def: FlagDefinition) => {
    if (!hasTarget) return;
    if (caseOn) {
      addFlagLocally(def.id);
    } else {
      for (const spId of Array.from(spIds)) {
        const sp = localCase.specimens.find((s: any) => s.id === spId);
        if (!activeInst(sp?.flags ?? []).some((f: FlagInstance) => f.flagDefinitionId === def.id)) {
          addFlagLocally(def.id, spId);
        }
      }
    }
  }, [hasTarget, caseOn, spIds, localCase, addFlagLocally]);

  // ── remove — draft only ───────────────────────────────────────────────────────
  const doRemoveSingle = useCallback((inst: FlagInstance, specimenId: string | undefined) => {
    removeFlagLocally(inst.id, specimenId);
  }, [removeFlagLocally]);

  const doRemoveAll = useCallback((defId: string, specimenIds: string[]) => {
    for (const spId of specimenIds) {
      const sp   = localCase.specimens.find((s: any) => s.id === spId);
      const inst = sp ? activeInst(sp.flags).find((f: FlagInstance) => f.flagDefinitionId === defId) : undefined;
      if (inst) doRemoveSingle(inst, spId);
    }
  }, [localCase.specimens, doRemoveSingle]);

  const requestRemove = useCallback((inst: FlagInstance, specimenId: string | undefined) => {
    const def = defById(flagDefinitions, inst.flagDefinitionId);
    const flagName = def?.name ?? inst.flagDefinitionId;

    // If flag exists on other specimens too, show scope dialog
    if (specimenId) {
      const otherSpecimenIds = localCase.specimens
        .filter((sp: any) => sp.id !== specimenId && activeInst(sp.flags).some((f: FlagInstance) => f.flagDefinitionId === inst.flagDefinitionId))
        .map((sp: any) => sp.id);

      if (otherSpecimenIds.length > 0) {
        setScopeDialog({
          flagName, defId: inst.flagDefinitionId, specimenId, otherSpecimenIds,
          onConfirm: (removeAll) => {
            removeAll
              ? doRemoveAll(inst.flagDefinitionId, [specimenId, ...otherSpecimenIds])
              : doRemoveSingle(inst, specimenId);
            setScopeDialog(null);
          },
        });
        return;
      }
    }

    doRemoveSingle(inst, specimenId);
  }, [flagDefinitions, localCase.specimens, doRemoveSingle, doRemoveAll]);

  // ── dirty check — real ID-set comparison against the original snapshot ────────
  const isDraftDirty = useMemo(() => {
    const diff = (origFlags: FlagInstance[], nowFlags: FlagInstance[]) => {
      const origIds = new Set(activeInst(origFlags).map(f => f.id));
      const nowIds  = new Set(activeInst(nowFlags).map(f => f.id));
      if (origIds.size !== nowIds.size) return true;
      for (const id of origIds) if (!nowIds.has(id)) return true;
      for (const id of nowIds) if (!origIds.has(id)) return true;
      return false;
    };
    if (diff(initialCaseData.flags ?? [], localCase.flags)) return true;
    for (const sp of localCase.specimens) {
      const origSp = initialCaseData.specimens.find((s: any) => s.id === sp.id);
      if (diff(origSp?.flags ?? [], sp.flags)) return true;
    }
    return false;
  }, [initialCaseData, localCase]);

  // Report dirty state up to the page -- reset to false on unmount so a
  // closed modal never leaves a stale "dirty" flag behind.
  useEffect(() => {
    onDirtyChange?.(isDraftDirty);
    return () => { onDirtyChange?.(false); };
  }, [isDraftDirty, onDirtyChange]);

  // ── save / cancel ─────────────────────────────────────────────────────────────
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    let succeededAny = false;
    try {
      const commit = async (origFlags: FlagInstance[], nowFlags: FlagInstance[], specimenId?: string) => {
        const origIds = new Set(activeInst(origFlags).map(f => f.id));
        for (const f of nowFlags) {
          const wasActive = origIds.has(f.id);
          const isActive  = !f.deletedAt;
          if (!wasActive && isActive) {
            await onApplyFlags({ caseId: localCase.id, flagDefinitionId: f.flagDefinitionId, specimenId });
            succeededAny = true;
          } else if (wasActive && !isActive) {
            await onRemoveFlag({ caseId: localCase.id, flagInstanceId: f.id, specimenId });
            succeededAny = true;
          }
        }
      };
      await commit(initialCaseData.flags ?? [], localCase.flags);
      for (const sp of localCase.specimens) {
        const origSp = initialCaseData.specimens.find((s: any) => s.id === sp.id);
        await commit(origSp?.flags ?? [], sp.flags, sp.id);
      }
      onClose();
    } catch (e) {
      // Real, surfaced failure instead of silently doing nothing — the
      // user needs to know a save didn't fully complete, and needs an
      // accurate picture if some items DID succeed before this one
      // failed (some flag changes may already be persisted even though
      // the modal is still showing "unsaved changes").
      const detail = (e as Error)?.message ?? 'unknown error';
      setSaveError(
        succeededAny
          ? `Some flag changes saved before this failed (${detail}). The remaining changes shown are still unsaved — try again, or close and reopen to see what actually persisted.`
          : `Save failed (${detail}) — nothing was saved. Try again.`
      );
    } finally {
      setIsSaving(false);
    }
  }, [localCase, initialCaseData, onApplyFlags, onRemoveFlag, onClose]);

  const handleClose = useCallback(() => {
    if (isDraftDirty) { setShowDirtyWarn(true); return; }
    onClose();
  }, [isDraftDirty, onClose]);

  const handleDiscardConfirm = useCallback(() => {
    setShowDirtyWarn(false);
    onClose();
  }, [onClose]);

  // ── catalog ───────────────────────────────────────────────────────────────────
  const catalog = useMemo(() => {
    let pool = flagDefinitions.filter(d =>
      (d.active === true || (d as any).status?.toLowerCase() === 'active')
    );
    if (hasTarget) pool = pool.filter(d =>
      (d.level as string).toLowerCase() === targetLevel
    );
    if (query.trim()) {
      const q = query.toLowerCase();
      pool = pool.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q) ||
        d.lisCode.toLowerCase().includes(q)
      );
    }
    return pool;
  }, [flagDefinitions, hasTarget, targetLevel, query]);

  const isAppliedAll = useCallback((defId: string): boolean => {
    if (caseOn) return activeInst(localCase.flags).some((f: FlagInstance) => f.flagDefinitionId === defId);
    return Array.from(spIds).every(spId => {
      const sp = localCase.specimens.find((s: any) => s.id === spId);
      return activeInst(sp?.flags ?? []).some((f: FlagInstance) => f.flagDefinitionId === defId);
    });
  }, [caseOn, localCase, spIds]);

  // ── voice listeners ───────────────────────────────────────────────────────────
  useEffect(() => {
    const selectCase    = () => toggleCase();
    const selectAllSpec = () => toggleAll();
    const deselectAll   = () => { setCaseOn(false); setSpIds(new Set()); };
    const saveFlags     = () => handleSave();
    const cancelFlags   = () => handleClose();

    window.addEventListener("PATHSCRIBE_FLAG_SELECT_CASE",          selectCase);
    window.addEventListener("PATHSCRIBE_FLAG_SELECT_ALL_SPECIMENS", selectAllSpec);
    window.addEventListener("PATHSCRIBE_FLAG_DESELECT_ALL",         deselectAll);
    window.addEventListener("PATHSCRIBE_FLAG_SAVE",                 saveFlags);
    window.addEventListener("PATHSCRIBE_FLAG_CANCEL",               cancelFlags);
    return () => {
      window.removeEventListener("PATHSCRIBE_FLAG_SELECT_CASE",          selectCase);
      window.removeEventListener("PATHSCRIBE_FLAG_SELECT_ALL_SPECIMENS", selectAllSpec);
      window.removeEventListener("PATHSCRIBE_FLAG_DESELECT_ALL",         deselectAll);
      window.removeEventListener("PATHSCRIBE_FLAG_SAVE",                 saveFlags);
      window.removeEventListener("PATHSCRIBE_FLAG_CANCEL",               cancelFlags);
    };
  }, [toggleCase, toggleAll, handleSave, handleClose]);

  // ── derived ───────────────────────────────────────────────────────────────────
  const totalFlags =
    activeInst(localCase.flags).length +
    localCase.specimens.reduce((n: number, sp: any) => n + activeInst(sp.flags).length, 0);

  // ── FlagChip ─────────────────────────────────────────────────────────────────
  const FlagChip: React.FC<{ inst: FlagInstance; specimenId?: string }> =
    ({ inst, specimenId }) => {
      const def      = defById(flagDefinitions, inst.flagDefinitionId);
      const isLis    = false; // "lis" not in current source union; reserved for future LIS integration
      const isDeleted = !!inst.deletedAt;
      const name     = def?.name ?? inst.flagDefinitionId;

      const handleUndo = () => {
        setLocalCase(prev => {
          const next = deepClone(prev);
          if (!specimenId) {
            const f = next.flags.find((f: FlagInstance) => f.id === inst.id);
            if (f) { f.deletedAt = null; f.deletedBy = null; }
          } else {
            const sp = next.specimens.find((s: any) => s.id === specimenId);
            const f  = sp?.flags.find((f: FlagInstance) => f.id === inst.id);
            if (f) { f.deletedAt = null; f.deletedBy = null; }
          }
          return next;
        });
      };

      return (
        <div className={`fm-flag-chip${isDeleted ? " deleted" : ""}`}>
          <span className={`fm-flag-chip-name${isDeleted ? " strikethrough" : ""}`}>
            {name}
          </span>
          {isDeleted ? (
            <button
              className="fm-chip-undo-btn"
              onClick={handleUndo}
              title="Undo removal"
            >
              <IcoUndo />
            </button>
          ) : isLis ? (
            <span title="Applied by LIS — cannot be removed" className="fm-chip-remove-btn" style={{ cursor: "default" }}>
              <IcoLock />
            </span>
          ) : (
            <button
              className="fm-chip-remove-btn"
              onClick={() => requestRemove(inst, specimenId)}
              title="Remove flag"
            >
              <IcoTrash />
            </button>
          )}
        </div>
      );
    };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div data-capture-hide="true" className="fm-overlay">
        <div
          className="ps-research-modal fm-modal"
          onClick={e => e.stopPropagation()}
        >

          {/* ── HEADER ── */}
          <div className="ps-research-header">
            <div>
              <div className="fm-eyebrow">Flag Manager</div>
              <div className="fm-title-row">
                <IcoFlag />
                <h2 className="fm-title">Case</h2>
                <span className="fm-accession">· {localCase.accession}</span>
                {totalFlags > 0 && (
                  <span className="fm-active-badge">{totalFlags} active</span>
                )}
              </div>
            </div>
            <button onClick={handleClose} aria-label="Close"
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 18, cursor: 'pointer', padding: '2px 8px', lineHeight: 1, flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            >✕</button>
          </div>

          {/* ── BODY ── */}
          <div className="fm-body">

            {/* LEFT: targets */}
            <div className="fm-left">
              <div className="fm-section-label">Apply to</div>

              {/* Case */}
              <button
                className={`fm-target-row${caseOn ? " active" : ""}`}
                onClick={toggleCase}
              >
                <IcoCase />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Case {localCase.accession}
                </span>
                {activeInst(localCase.flags).length > 0 && (
                  <span className="fm-count-badge">{activeInst(localCase.flags).length}</span>
                )}
              </button>
              {localCase.flags.filter((f: FlagInstance) => f.flagDefinitionId).map((inst: FlagInstance) => (
                <FlagChip key={inst.id} inst={inst} />
              ))}
              {activeInst(localCase.flags).length === 0 && localCase.flags.filter((f: FlagInstance) => f.flagDefinitionId && !f.deletedAt).length === 0 && (
                <div className="fm-no-flags-note">No case flags applied</div>
              )}

              <div className="fm-divider" />

              {/* All specimens */}
              {allIds.length > 1 && (
                <>
                  <button
                    className={`fm-target-row${allOn ? " active" : ""}`}
                    onClick={toggleAll}
                  >
                    <IcoSpec />
                    <span>All Specimens</span>
                  </button>
                  <div className="fm-divider" />
                </>
              )}

              {/* Individual specimens */}
              {localCase.specimens.map((sp: any) => (
                <div key={sp.id} style={{ marginBottom: 2 }}>
                  <button
                    className={`fm-target-row${spIds.has(sp.id) ? " active" : ""}`}
                    onClick={() => toggleSp(sp.id)}
                  >
                    <IcoSpec />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>{sp.label}:</span>{' '}
                      <span style={{ color: 'inherit' }}>{sp.description ?? ''}</span>
                    </span>
                    {activeInst(sp.flags).length > 0 && (
                      <span className="fm-count-badge">{activeInst(sp.flags).length}</span>
                    )}
                  </button>
                  {sp.flags.filter((f: FlagInstance) => f.flagDefinitionId).map((inst: FlagInstance) => (
                    <FlagChip key={inst.id} inst={inst} specimenId={sp.id} />
                  ))}
                  {activeInst(sp.flags).length === 0 && sp.flags.filter((f: FlagInstance) => f.flagDefinitionId && !f.deletedAt).length === 0 && (
                    <div className="fm-no-flags-note">No flags applied</div>
                  )}
                </div>
              ))}

              {invalid && (
                <div className="fm-invalid-warn">
                  Case and specimens can't be selected together
                </div>
              )}
            </div>

            {/* RIGHT: catalog */}
            <div className="fm-right">

              {/* Search */}
              <div className="fm-search-bar">
                <span className="fm-search-icon"><IcoSearch /></span>
                <input
                  className="fm-search-input"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search flags by name, code, or description…"
                />
                {query && (
                  <button className="fm-search-clear" onClick={() => setQuery("")}>✕</button>
                )}
              </div>

              {/* Column headers */}
              <div className="fm-col-header">
                <span className="fm-col-label">Code</span>
                <span className="fm-col-label">
                  Flag
                  {hasTarget && (
                    <span className="fm-col-label-note"> · {targetLevel}-level</span>
                  )}
                </span>
                <span className="fm-col-label" style={{ textAlign: "right" }}>Action</span>
              </div>

              {/* Flag list */}
              <div className="fm-flag-list" tabIndex={0}>

                {!hasTarget && !invalid && (
                  <div className="fm-empty">
                    <IcoCase />
                    <div className="fm-empty-heading">Select a target on the left</div>
                    <div className="fm-empty-hint">Choose the case or one or more specimens, then click a flag to apply it</div>
                  </div>
                )}

                {invalid && (
                  <div className="fm-empty">
                    <div className="fm-empty-heading" style={{ color: "#f87171" }}>Invalid selection</div>
                    <div className="fm-empty-hint">Deselect either the case or the specimens</div>
                  </div>
                )}

                {hasTarget && catalog.length === 0 && (
                  <div className="fm-empty">
                    <IcoSearch />
                    <div className="fm-empty-heading">
                      {query ? `No flags match "${query}"` : `No ${targetLevel}-level flags defined`}
                    </div>
                    {!query && (
                      <div className="fm-empty-hint">Go to Configuration → System → Flags to add some</div>
                    )}
                  </div>
                )}

                {hasTarget && catalog.map((def: FlagDefinition) => {
                  const applied = isAppliedAll(def.id);
                  const sev     = (def as any).severity as number | undefined;
                  return (
                    <div
                      key={def.id}
                      className={`fm-flag-card${applied ? " applied" : ""}`}
                      onClick={() => !applied && handleApply(def)}
                    >
                      <div>
                        <span className={`fm-code-chip${applied ? " applied" : ""}`}>
                          {def.lisCode}
                        </span>
                      </div>

                      <div className="fm-flag-info">
                        <div className="fm-flag-name-row">
                          {sev && (
                            <span className="fm-sev-dot" style={{ background: sevColor(sev) }} title={`Severity ${sev}`} />
                          )}
                          <span className="fm-flag-name">{def.name}</span>
                        </div>
                        {def.description && (
                          <span className="fm-flag-desc">{def.description}</span>
                        )}
                      </div>

                      <div style={{ textAlign: "right" }}>
                        {applied ? (
                          <span className="fm-applied-text">
                            <IcoCheck />
                            Applied
                          </span>
                        ) : (
                          <span className="fm-apply-text">+ Apply</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── FOOTER — Cancel (reverts) | Save (commits + closes) ── */}
          <div className="fm-footer">
            {saveError ? (
              <span style={{ fontSize: 11, color: '#f87171', flex: 1 }}>{saveError}</span>
            ) : (
              <span style={{ fontSize: 11, color: isDraftDirty ? '#f59e0b' : '#475569', flex: 1 }}>
                {isDraftDirty ? 'You have unsaved flag changes' : 'No changes'}
              </span>
            )}
            <button className="fm-btn-cancel" onClick={handleClose} style={{ flexShrink: 0 }}>
              Cancel
            </button>
            <button
              className="fm-btn-cancel"
              onClick={handleSave}
              disabled={!isDraftDirty || isSaving}
              style={{
                flexShrink: 0,
                background: isDraftDirty ? 'rgba(34,197,94,0.15)' : undefined,
                borderColor: isDraftDirty ? 'rgba(34,197,94,0.5)' : undefined,
                color: isDraftDirty ? '#4ade80' : undefined,
                fontWeight: 700,
                opacity: isSaving ? 0.6 : 1,
                cursor: (!isDraftDirty || isSaving) ? 'default' : 'pointer',
              }}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {scopeDialog && (
        <ScopeDialog
          flagName={scopeDialog.flagName}
          otherCount={scopeDialog.otherSpecimenIds.length}
          onSingle={() => scopeDialog.onConfirm(false)}
          onAll={() => scopeDialog.onConfirm(true)}
          onCancel={() => setScopeDialog(null)}
        />
      )}

      {/* ── Discard-changes warning — now genuinely accurate: the draft
          is discarded and nothing was ever written to the backend ── */}
      {showDirtyWarn && ReactDOM.createPortal(
        <div className="ps-overlay" style={{ zIndex: 9500 }}>
          <div className="ps-modal-dark ps-modal-dark--sm">
            <div className="ps-modal-dark-header">
              <span className="ps-modal-dark-emoji">⚠️</span>
              <span className="ps-modal-dark-title">Discard changes?</span>
            </div>
            <p className="ps-modal-dark-body">
              {saveError
                ? 'You have unsaved flag changes, and the last save attempt failed partway through — some of these may already be saved. Closing now will discard whatever is still local and unsaved.'
                : 'You have unsaved flag changes. Closing will discard them — nothing has been saved yet.'}
            </p>
            <div className="ps-modal-dark-footer ps-modal-dark-footer--stretch">
              <button className="ps-btn-ghost-dark ps-modal-dark-footer__flex-btn" onClick={() => setShowDirtyWarn(false)}>Keep editing</button>
              <button className="ps-btn-red ps-modal-dark-footer__flex-btn" onClick={handleDiscardConfirm}>Discard changes</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default FlagManagerModal;
