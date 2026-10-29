// src/pages/MicrotomyWorkstationPage/hooks/useMicrotomyWorkstation.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-284 (Microtomy Workstation). Wraps microtomyOperations.ts's pure
// functions with saving, plus the slide-label print dispatch already used by
// useSpecimenBlockManagement.ts (station → printer profile → gtin/layout from
// printSettingsService → printCassetteSlideLabel.ts).
//
// What a scan resolves to: a block, a decant, or (Batch 460) a matrix block
// (a cassette shared by several specimens, Case.matrixBlocks[]). A matrix
// block is worked through a one-block view (matrixBlockAsSpecimenView), so
// every block operation applies to it unchanged; its save writes
// Case.matrixBlocks. Superseded: this header used to say matrix blocks were
// "not yet supported here". A bare specimen-level scan is still refused.
//
// Saving (Batch 460, PS-71): every change is an operation, re-applied to the
// newest copy of the case when someone else saved first (updateCaseWithRetry),
// never written over their change. Before, a conflicting save was only logged
// and the tech's change was lost while the screen showed it as saved (the
// app-wide scan tracker also writes to the case on the same scan). A save
// that still fails says so on screen and reloads the work item. A change to
// decant slides only still goes through the atomic decant save (Batch 453).
//
// Slide levels (Batch 460): the level printed on a label is the one fixed in
// the slide's displayId (services/material/slideLevels.ts), not its position,
// and batch prints follow the grid's order.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveScanStation } from '@/hooks/useEffectiveScanStation';
import { caseRouter } from '@/services/cases/CaseRouter';
import { flagAddOnException, type AddOnActionResult } from '@/services/addOnOrders/addOnOrderActions';
import { sendEmail } from '@/services/communications/notificationService';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { flagBlockExhaustion } from '@/utils/addOnOrderOperations';
import { cuttingBlockedByExhaustion } from '@/utils/blockExceptionStates';
import { deskRecipientsFor } from '@/services/addOnOrders/blockExceptionRouting';
import { userService, authorizationService, printerProfileService, printSettingsService, scanStationService, stainTypeService, slideLevelOf, updateCaseWithRetry, caseWriteDeps } from '@/services';
import { printSlideLabel } from '@/utils/labels/printCassetteSlideLabel';
import { wasSlideLabelOutput, markSlideLabelOutput } from '@/utils/labels/dispatchSlideLabel';
import { resolveMaterialFromScan } from '@/utils/resolveMaterialFromScan';
import { DEFAULT_SLIDE_LABEL_LAYOUT } from '@/services/printSettings/IPrintSettingsService';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';
import type { SlideLabelLayoutConfig } from '@/services/printSettings/IPrintSettingsService';
import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock, StainOrder } from '@/types/case/Specimen';
import type { Decant } from '@/types/case/Material';
import type { MatrixBlock } from '@/types/case/MatrixBlock';
import { decantOnlyUpdates } from '@/services/material/materialTree';
import { applyDecantChangeLive } from '@/services/material/caseMaterialService';
import { materialEventBus } from '@/services/material/materialEvents';
import type { StainType } from '@/services/stains/IStainService';
import type { CytologyPrepSuggestion } from '@/services/cytology/computeCytologyPrepSuggestions';
import {
  addMicrotomyStain, removeMicrotomyStain, markStainPrinting, markStainPrintResult,
  reprintMicrotomyStain, reorderBlockStains, updateStainComment, updateBlockComment,
  setBlockAlertFlags, updateDecantCytologyFields, applyCytologyPrepSuggestions,
  addDecantStain, removeDecantStain, computeNextUnprintedStain, stainsInGridOrder,
  updateDecantStainComment, reprintDecantStain, restoreStainOrder, MICROTOMY_UNDO_WINDOW_MS,
  markDecantStainPrinting, markDecantStainPrintResult,
  microtomyViewOf, microtomyCaseUpdates,
  type MicrotomyCancelReason, type MicrotomyOperationResult, type MicrotomyTarget, MICROTOMY_REPRINT_REASONS,
} from '@/utils/microtomyOperations';

/** A matrix block is worked as kind 'block' through its view, with `matrixBlock` set. */
export type MicrotomyWorkItem =
  | { kind: 'block'; caseData: Case; specimen: Specimen; block: HistologyBlock; matrixBlock?: MatrixBlock }
  | { kind: 'decant'; caseData: Case; specimen: Specimen; decant: Decant };

export type PrintMode = 'on_demand' | 'batch';

/** Batch 669 (ws-6): the quick Undo shown after Remove or Reprint, and the line shown once it has been used. */
export interface UndoNotice {
  kind: 'removed' | 'reprinted' | 'removedUndone' | 'reprintedUndone';
  stainName: string;
  /** The cancel or reprint reason as stored (English), shown through `microtomyWorkstation.reasons.*`. */
  reason?: string;
}
interface UndoEntry { parent: { kind: 'block' | 'decant'; id: string }; snapshot: StainOrder; index: number; kind: 'removed' | 'reprinted'; reason?: string }

export interface BatchProgressEntry {
  stainId: string;
  stainName: string;
  status: 'pending' | 'printing' | 'printed' | 'failed';
  message?: string;
}

type Op = (specimen: Specimen) => MicrotomyOperationResult;

function targetOf(item: MicrotomyWorkItem): MicrotomyTarget {
  if (item.kind === 'decant') return { kind: 'decant', specimenId: item.specimen.id, decantId: item.decant.id };
  if (item.matrixBlock) return { kind: 'matrix', matrixBlockId: item.matrixBlock.id };
  return { kind: 'block', specimenId: item.specimen.id, blockId: item.block.id };
}

/** The work item for `target` on a copy of the case (null when it's gone). */
function workItemFrom(caseData: Case, target: MicrotomyTarget): MicrotomyWorkItem | null {
  const view = microtomyViewOf(caseData, target);
  if (!view) return null;
  if (target.kind === 'decant') {
    const decant = view.decants?.find(d => d.id === target.decantId);
    return decant ? { kind: 'decant', caseData, specimen: view, decant } : null;
  }
  const blockId = target.kind === 'matrix' ? target.matrixBlockId : target.blockId;
  const block = view.blocks?.find(b => b.id === blockId);
  if (!block) return null;
  const matrixBlock = target.kind === 'matrix' ? (caseData.matrixBlocks ?? []).find(m => m.id === target.matrixBlockId) : undefined;
  return { kind: 'block', caseData, specimen: view, block, ...(matrixBlock ? { matrixBlock } : {}) };
}

function withView(item: MicrotomyWorkItem, view: Specimen): MicrotomyWorkItem {
  const caseData = { ...item.caseData, ...microtomyCaseUpdates(item.caseData, view) } as Case;
  return workItemFrom(caseData, targetOf(item)) ?? item;
}

export function useMicrotomyWorkstation() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { effectiveStationId } = useEffectiveScanStation();

  const [workItem, setWorkItem] = useState<MicrotomyWorkItem | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** Batch 669 (ws-4): why a Print/Etch Next did not print (or that the printer failed), shown on the page. */
  const [printNotice, setPrintNotice] = useState<string | null>(null);
  const [undoNotice, setUndoNotice] = useState<UndoNotice | null>(null);
  const undoEntry = useRef<UndoEntry | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>('on_demand');
  const [batchSelection, setBatchSelection] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<BatchProgressEntry[] | null>(null);
  const [stainTypes, setStainTypes] = useState<StainType[]>([]);
  const [pendingRemoval, setPendingRemoval] = useState<{ kind: 'block' | 'decant'; parentId: string; stainId: string } | null>(null);
  const versionRef = useRef(0);

  const actor = useMemo(() => ({ id: user?.id ?? 'unknown', name: user?.name ?? user?.id ?? 'unknown' }), [user?.id, user?.name]);
  const exceptionRequirements = useFieldRequirements('addOnOrder');

  const loadStainTypes = useCallback(async () => {
    const res = await stainTypeService.getAll();
    if (res.ok) setStainTypes(res.data.filter(s => s.active));
  }, []);

  // Default print mode from PrintSettingsConfig.defaultPrintBehavior; the
  // header switcher can still change it for the session.
  const loadDefaultPrintMode = useCallback(async () => {
    const res = await printSettingsService.get();
    if (res.ok) setPrintMode(res.data.defaultPrintBehavior);
  }, []);

  /** Closes the Undo toast (and forgets what it would restore). */
  const dismissUndo = useCallback(() => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    undoEntry.current = null;
    setUndoNotice(null);
  }, []);
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const startWork = useCallback((item: MicrotomyWorkItem) => {
    versionRef.current = item.caseData.version ?? 0;
    setWorkItem(item);
    setSaveError(null);
    setPrintNotice(null);
    dismissUndo();
    setBatchSelection(new Set());
  }, [dismissUndo]);

  /** A scanned block, decant or matrix block (or one of their slides) becomes the work item. */
  const resolveScan = useCallback(async (rawScanValue: string): Promise<{ ok: true } | { ok: false; message: string }> => {
    setScanError(null);
    const fail = (message: string) => { setScanError(message); return { ok: false as const, message }; };
    if (!rawScanValue.trim()) return { ok: false, message: t('microtomyWorkstation.scanErrors.empty') };
    const resolved = await resolveMaterialFromScan(rawScanValue);
    if (!resolved) return fail(t('microtomyWorkstation.scanErrors.unresolved'));
    const { caseData, specimenLetter, target } = resolved;

    // Batch 460: a matrix block has no specimen letter, so it is checked first
    // (before, it fell through to "specimen not found").
    if (target.level === 'matrix_block' || target.level === 'matrix_slide') {
      const item = workItemFrom(caseData, { kind: 'matrix', matrixBlockId: target.matrixBlockId });
      if (!item) return fail(t('microtomyWorkstation.scanErrors.matrixBlockNotFound'));
      startWork(item);
      return { ok: true };
    }

    const specimen = (caseData.specimens ?? []).find(sp => sp.label === specimenLetter);
    if (!specimen) return fail(t('microtomyWorkstation.scanErrors.specimenNotFound'));

    if (target.level === 'block' || target.level === 'slide') {
      const block = (specimen.blocks ?? []).find(b => b.label === target.blockNumber);
      if (!block) return fail(t('microtomyWorkstation.scanErrors.blockNotFound', { label: `${specimen.label}${target.blockNumber}` }));
      startWork({ kind: 'block', caseData, specimen, block });
      return { ok: true };
    }
    if (target.level === 'decant' || target.level === 'decant_slide') {
      const decant = (specimen.decants ?? []).find(d => d.label === target.decantLabel);
      if (!decant) return fail(t('microtomyWorkstation.scanErrors.decantNotFound', { label: `${specimen.label}${target.decantLabel}` }));
      startWork({ kind: 'decant', caseData, specimen, decant });
      return { ok: true };
    }
    return fail(t('microtomyWorkstation.scanErrors.unsupported'));
  }, [t, startWork]);

  /** A block chosen directly (not scanned). */
  const selectBlockDirectly = useCallback(async (caseId: string, specimenId: string, blockId: string): Promise<{ ok: true } | { ok: false; message: string }> => {
    const caseData = await caseRouter.getCase(caseId);
    if (!caseData) return { ok: false, message: t('microtomyWorkstation.scanErrors.caseNotFound') };
    const item = workItemFrom(caseData, { kind: 'block', specimenId, blockId });
    if (!item) return { ok: false, message: t('microtomyWorkstation.scanErrors.blockNotOnCase') };
    startWork(item);
    return { ok: true };
  }, [t, startWork]);

  /** The tech finished this block or decant; nothing is changed. */
  const clearWorkItem = useCallback(() => {
    setWorkItem(null);
    setScanError(null);
    setSaveError(null);
    setPrintNotice(null);
    dismissUndo();
    setBatchSelection(new Set());
    setBatchProgress(null);
  }, [dismissUndo]);

  /** Applies `op` to the work item and saves it. Returns the work item as
   *  saved, or (saved: false) as it is now after a failed save; null when the
   *  operation itself refused. A caller never prints for an unsaved change. */
  const persistOp = useCallback(async (item: MicrotomyWorkItem, op: Op): Promise<{ item: MicrotomyWorkItem; saved: boolean } | null> => {
    const local = op(item.specimen);
    if (!local.ok) return null;
    const shown = withView(item, local.specimen);
    setWorkItem(shown);
    const target = targetOf(item);
    try {
      // Batch 453: a change to decant slides only goes through the atomic,
      // versioned decant save, announced as MATERIAL_DECANTED.
      const decantUpdates = target.kind !== 'matrix' ? decantOnlyUpdates(item.specimen as never, local.specimen as never) : null;
      if (decantUpdates && decantUpdates.length > 0) {
        for (const u of decantUpdates) {
          const result = await applyDecantChangeLive(item.caseData.id, { kind: 'update', decantId: u.decantId, patch: u.patch }, versionRef.current);
          if (result.ok === false) throw new Error(`decant:${result.error}`);
          versionRef.current = result.version;
          materialEventBus.publish({ type: 'MATERIAL_DECANTED', caseId: item.caseData.id, change: result.change, decant: result.event });
        }
        return { item: shown, saved: true };
      }
      let base: Case | null = null;
      const r = await updateCaseWithRetry(item.caseData.id, current => {
        const view = microtomyViewOf(current, target);
        const res = view ? op(view) : null;
        if (!res || !res.ok) return null;
        base = current;
        return microtomyCaseUpdates(current, res.specimen);
      }, caseWriteDeps);
      if (r.ok && base) {
        versionRef.current = r.version;
        const saved = workItemFrom({ ...(base as Case), ...r.updates, version: r.version } as Case, target);
        if (saved) { setWorkItem(saved); setSaveError(null); return { item: saved, saved: true }; }
        return { item: shown, saved: true };
      }
      setSaveError(t(`microtomyWorkstation.saveFailed.${r.ok === false && r.reason === 'conflict' ? 'conflict' : 'notApplied'}`));
    } catch (e) {
      console.error('[MicrotomyWorkstation] Failed to save:', e);
      setSaveError(t(`microtomyWorkstation.saveFailed.${String((e as Error)?.message ?? '').includes('conflict') ? 'conflict' : 'notApplied'}`));
    }
    // Not saved: show the case as it is now, so the tech can redo the change.
    const latest = await caseRouter.getCase(item.caseData.id).catch(() => null);
    const reloaded = latest ? workItemFrom(latest, target) : null;
    if (reloaded) { versionRef.current = latest!.version ?? 0; setWorkItem(reloaded); return { item: reloaded, saved: false }; }
    return { item: shown, saved: false };
  }, [t]);

  /** The station's slide printer, gtin and label layout. */
  const getPrinterContext = useCallback(async (): Promise<{ printer: PrinterProfile; gtin: string; layout: SlideLabelLayoutConfig } | { error: string }> => {
    if (!effectiveStationId) return { error: t('microtomyWorkstation.hardware.noStation') };
    const stationRes = await scanStationService.getById(effectiveStationId);
    if (!stationRes.ok) return { error: t('microtomyWorkstation.hardware.stationNotFound') };
    if (!stationRes.data.supportsPrinting || !stationRes.data.cassetteSlidePrinterProfileId) {
      return { error: t('microtomyWorkstation.hardware.notConfigured') };
    }
    const printerRes = await printerProfileService.getById(stationRes.data.cassetteSlidePrinterProfileId);
    if (!printerRes.ok || !printerRes.data) return { error: t('microtomyWorkstation.hardware.profileMissing') };
    const settingsRes = await printSettingsService.get();
    const gtin = settingsRes.ok ? settingsRes.data.gs1Gtin : '';
    const layout = settingsRes.ok ? settingsRes.data.slideLabelLayout : DEFAULT_SLIDE_LABEL_LAYOUT;
    return { printer: printerRes.data, gtin, layout };
  }, [effectiveStationId, t]);

  /** One slide: Pending → Printing (saved, so progress is honest) →
   *  Printed/Failed. Returns the work item to carry into the next slide. */
  const dispatchAndRecordPrint = useCallback(async (item: MicrotomyWorkItem, stainId: string, reprint = false): Promise<{ ok: boolean; item: MicrotomyWorkItem; message?: string }> => {
    // Batch 610 (#16): a block flagged as exhausted is not cut until the ordering pathologist answers.
    if (item.kind === 'block' && cuttingBlockedByExhaustion(item.block)) {
      return { ok: false, item, message: t('microtomyWorkstation.exhausted.cuttingBlocked') };
    }
    const parentId = item.kind === 'block' ? item.block.id : item.decant.id;
    const printing: Op = sp => (item.kind === 'block' ? markStainPrinting(sp, parentId, stainId) : markDecantStainPrinting(sp, parentId, stainId));
    const marked = await persistOp(item, printing);
    // Nothing is printed unless "Printing" was saved (a stale or refused change prints nothing).
    if (!marked || !marked.saved) return { ok: false, item: marked?.item ?? item, message: t('microtomyWorkstation.hardware.couldNotStart') };
    const afterPrinting = marked.item;

    const stains = afterPrinting.kind === 'block' ? afterPrinting.block.stains : afterPrinting.decant.stains;
    const idx = stains.findIndex(s => s.id === stainId);
    const stain = stains[idx];
    const ctx = await getPrinterContext();
    const level = slideLevelOf(stain ?? {}, Math.max(idx, 0));
    const parentLabel = afterPrinting.kind === 'block' ? afterPrinting.block.label : afterPrinting.decant.label;
    const slideId = stain?.displayId ?? `${afterPrinting.specimen.label}${parentLabel}-${level}`;
    // Batch 606 (PS-14): a slide whose label was already produced at the scan is not printed twice; a reprint always prints.
    const alreadyProduced = !reprint && wasSlideLabelOutput(slideId);
    const outcome = alreadyProduced
      ? { ok: true as const }
      : 'error' in ctx
      ? { ok: false as const, message: ctx.error }
      : await printSlideLabel(
          { fullAccession: afterPrinting.caseData.accession?.fullAccession ?? afterPrinting.caseData.id, specimenLabel: afterPrinting.specimen.label, blockLabel: parentLabel, level, stainName: stain?.stainName ?? '', slideId, slideDesignation: afterPrinting.caseData.labelStyle?.slide },
          ctx.printer, ctx.gtin, ctx.layout,
        ).then(r => { if (r.ok) markSlideLabelOutput(slideId); return r; }).then(r => (r.ok ? { ok: true as const } : { ok: false as const, message: (r as { ok: false; message: string }).message }));

    const result: Op = sp => (afterPrinting.kind === 'block'
      ? markStainPrintResult(sp, parentId, stainId, outcome, actor.id)
      : markDecantStainPrintResult(sp, parentId, stainId, outcome, actor.id));
    const final = await persistOp(afterPrinting, result);
    return { ok: outcome.ok, item: final?.item ?? afterPrinting, message: outcome.ok ? undefined : outcome.message };
  }, [persistOp, getPrinterContext, actor.id, t]);

  /** On-Demand "Print/Etch Next". */
  const handlePrintNext = useCallback(async () => {
    if (!workItem) return;
    const stains = workItem.kind === 'block' ? workItem.block.stains : workItem.decant.stains;
    const next = computeNextUnprintedStain(stains);
    if (!next) return;
    // Batch 669 (ws-4): a refusal (block flagged exhausted, "could not start") or a printer failure is said on screen,
    // not only in the grid; the batch and per-row Print use the progress window, which already showed it.
    setPrintNotice(null);
    const result = await dispatchAndRecordPrint(workItem, next.id);
    if (!result.ok) setPrintNotice(result.message ?? t('microtomyWorkstation.hardware.couldNotStart'));
  }, [workItem, dispatchAndRecordPrint, t]);

  /** "Print Selected" and Batch "Print Batch": one slide after another (one
   *  physical printer), in the grid's order (Batch 460: not the order ticked). */
  const handlePrintSelected = useCallback(async (stainIds: string[]) => {
    if (!workItem || stainIds.length === 0) return;
    setPrintNotice(null);
    const stains = workItem.kind === 'block' ? workItem.block.stains : workItem.decant.stains;
    const ordered = stainsInGridOrder(stains, stainIds);
    setBatchProgress(ordered.map(s => ({ stainId: s.id, stainName: s.stainName, status: 'pending' })));
    let item = workItem;
    for (const stain of ordered) {
      setBatchProgress(prev => prev?.map(e => e.stainId === stain.id ? { ...e, status: 'printing' } : e) ?? prev);
      const result = await dispatchAndRecordPrint(item, stain.id);
      item = result.item;
      setBatchProgress(prev => prev?.map(e => e.stainId === stain.id ? { ...e, status: result.ok ? 'printed' : 'failed', message: result.message } : e) ?? prev);
    }
  }, [workItem, dispatchAndRecordPrint]);

  const clearBatchProgress = useCallback(() => setBatchProgress(null), []);

  // ── Stain management ────────────────────────────────────────────────────
  const handleAddStain = useCallback(async (stainType: StainType, options: { duplicateCount?: number; levelDepthMicrons?: number; pairWithControl?: boolean; preparationMethod?: StainOrder['preparationMethod'] } = {}) => {
    if (!workItem) return;
    const fullAccession = workItem.caseData.accession?.fullAccession ?? workItem.caseData.id;
    if (workItem.kind === 'block') {
      const blockId = workItem.block.id;
      await persistOp(workItem, sp => addMicrotomyStain(sp, blockId, stainType, fullAccession, options));
    } else {
      const decantId = workItem.decant.id;
      await persistOp(workItem, sp => addDecantStain(sp, decantId, stainType, fullAccession, options.preparationMethod));
    }
  }, [workItem, persistOp]);

  /** Another level of a stain already on this block or decant (the Quick-Picker's
   *  "Levels/Recuts", which isn't a StainType category of its own). */
  const handleAddLevelOfExistingStain = useCallback(async (stain: StainOrder, levelDepthMicrons?: number) => {
    if (!workItem) return;
    const fullAccession = workItem.caseData.accession?.fullAccession ?? workItem.caseData.id;
    const matchedType = stainTypes.find(st => st.name === stain.stainName);
    const stainTypeForRecut: StainType = matchedType ?? ({
      id: `adhoc-${stain.stainName}`, name: stain.stainName, category: 'Other',
      active: true, version: 1, updatedBy: 'system', updatedAt: new Date().toISOString(),
    } as StainType);
    if (workItem.kind === 'block') {
      const blockId = workItem.block.id;
      await persistOp(workItem, sp => addMicrotomyStain(sp, blockId, stainTypeForRecut, fullAccession, { levelDepthMicrons, duplicateCount: 1 }));
    } else {
      const decantId = workItem.decant.id;
      await persistOp(workItem, sp => addDecantStain(sp, decantId, stainTypeForRecut, fullAccession, stain.preparationMethod));
    }
  }, [workItem, persistOp, stainTypes]);

  /** Batch 669 (ws-6): offers a quick Undo for the change just saved (Remove or Reprint), for MICROTOMY_UNDO_WINDOW_MS. */
  const offerUndo = useCallback((entry: UndoEntry) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoEntry.current = entry;
    setUndoNotice({ kind: entry.kind, stainName: entry.snapshot.stainName, reason: entry.reason });
    undoTimer.current = setTimeout(dismissUndo, MICROTOMY_UNDO_WINDOW_MS);
  }, [dismissUndo]);

  const performRemoveStain = useCallback(async (stainId: string, reason?: MicrotomyCancelReason) => {
    if (!workItem) return;
    const parent = { kind: workItem.kind, id: workItem.kind === 'block' ? workItem.block.id : workItem.decant.id };
    const before = (workItem.kind === 'block' ? workItem.block.stains : workItem.decant.stains);
    const index = before.findIndex(s => s.id === stainId);
    const snapshot = before[index];
    const saved = workItem.kind === 'block'
      ? await persistOp(workItem, sp => removeMicrotomyStain(sp, parent.id, stainId, reason))
      : await persistOp(workItem, sp => removeDecantStain(sp, parent.id, stainId, reason));
    if (saved?.saved && snapshot) offerUndo({ parent, snapshot, index, kind: 'removed', reason });
  }, [workItem, persistOp, offerUndo]);

  const requestRemoveStain = useCallback((stainId: string) => {
    if (!workItem) return;
    const parentId = workItem.kind === 'block' ? workItem.block.id : workItem.decant.id;
    const stains = workItem.kind === 'block' ? workItem.block.stains : workItem.decant.stains;
    const stain = stains.find(s => s.id === stainId);
    const alreadyPrinted = stain?.printStatus === 'Printed' || stain?.printStatus === 'Printing';
    if (alreadyPrinted) {
      setPendingRemoval({ kind: workItem.kind, parentId, stainId });
      return 'needs_reason' as const;
    }
    void performRemoveStain(stainId);
    return 'removed' as const;
  }, [workItem, performRemoveStain]);

  const confirmPendingRemoval = useCallback(async (reason: MicrotomyCancelReason) => {
    if (!pendingRemoval) return;
    await performRemoveStain(pendingRemoval.stainId, reason);
    setPendingRemoval(null);
  }, [pendingRemoval, performRemoveStain]);

  const cancelPendingRemoval = useCallback(() => setPendingRemoval(null), []);

  const handleReprint = useCallback(async (stainId: string, reason: typeof MICROTOMY_REPRINT_REASONS[number]) => {
    if (!workItem) return;
    // Batch 669 (ws-2): a decant slide is reprinted too (before, nothing happened for a decant).
    const parent = { kind: workItem.kind, id: workItem.kind === 'block' ? workItem.block.id : workItem.decant.id };
    const before = workItem.kind === 'block' ? workItem.block.stains : workItem.decant.stains;
    const index = before.findIndex(s => s.id === stainId);
    const snapshot = before[index];
    setPrintNotice(null);
    const saved = workItem.kind === 'block'
      ? await persistOp(workItem, sp => reprintMicrotomyStain(sp, parent.id, stainId, reason, actor.id))
      : await persistOp(workItem, sp => reprintDecantStain(sp, parent.id, stainId, reason, actor.id));
    if (!saved?.saved) return;
    // The reprint reason and count are saved before a duplicate label is printed.
    const result = await dispatchAndRecordPrint(saved.item, stainId, true);
    if (!result.ok) setPrintNotice(result.message ?? t('microtomyWorkstation.hardware.couldNotStart'));
    // Batch 669 (ws-6): a quick Undo instead of a confirmation click. It puts the slide's record back; a label that
    // already came out of the printer has to be discarded by hand (the toast says so).
    if (snapshot) offerUndo({ parent, snapshot, index, kind: 'reprinted', reason });
  }, [workItem, persistOp, dispatchAndRecordPrint, actor.id, offerUndo, t]);

  /** Batch 669 (ws-6): Undo for the last Remove or Reprint (within the window). */
  const undoLast = useCallback(async () => {
    const entry = undoEntry.current;
    if (!entry || !workItem) { dismissUndo(); return; }
    dismissUndo();
    const restored = await persistOp(workItem, sp => restoreStainOrder(sp, entry.parent, entry.snapshot, entry.index));
    if (!restored?.saved) return;
    setUndoNotice({ kind: entry.kind === 'removed' ? 'removedUndone' : 'reprintedUndone', stainName: entry.snapshot.stainName });
    undoTimer.current = setTimeout(dismissUndo, MICROTOMY_UNDO_WINDOW_MS);
  }, [workItem, persistOp, dismissUndo]);

  const handleReorder = useCallback(async (orderedStainIds: string[]) => {
    if (!workItem || workItem.kind !== 'block') return;
    const blockId = workItem.block.id;
    await persistOp(workItem, sp => reorderBlockStains(sp, blockId, orderedStainIds));
  }, [workItem, persistOp]);

  // ── Comments ─────────────────────────────────────────────────────────────
  const handleAddStainComment = useCallback(async (stainId: string, text: string, printsOnLabel: boolean) => {
    if (!workItem) return;
    // Batch 669 (ws-2): a decant slide takes a comment too (block comments, alert badges and Block exhausted stay block-only).
    if (workItem.kind === 'block') {
      const blockId = workItem.block.id;
      await persistOp(workItem, sp => updateStainComment(sp, blockId, stainId, text, printsOnLabel, actor));
    } else {
      const decantId = workItem.decant.id;
      await persistOp(workItem, sp => updateDecantStainComment(sp, decantId, stainId, text, printsOnLabel, actor));
    }
  }, [workItem, persistOp, actor]);

  const handleAddBlockComment = useCallback(async (text: string) => {
    if (!workItem || workItem.kind !== 'block') return;
    const blockId = workItem.block.id;
    await persistOp(workItem, sp => updateBlockComment(sp, blockId, text, actor));
  }, [workItem, persistOp, actor]);

  /** Batch 610 (#16): the tech flags the block as exhausted. Goes through the same action as the Add-On
   *  Order station: the pathologist is e-mailed (the Simulated outbox when there is no mail server). */
  const handleFlagBlockExhausted = useCallback(async (note: string): Promise<AddOnActionResult> => {
    if (!workItem || workItem.kind !== 'block') return { ok: false, failed: true };
    const blockId = workItem.block.id;
    const order = workItem.block.stains.find(s => !(s.exception && s.exception.status === 'pending_pathologist_review'));
    if (!order) return { ok: false, failed: true };
    try {
      return await flagAddOnException({ caseData: workItem.caseData, stainOrderId: order.id, reason: 'Block exhausted', note, actor, requirements: exceptionRequirements }, {
        saveSpecimens: async () => {
          const saved = await persistOp(workItem, sp => flagBlockExhaustion(sp, blockId, order.id, 'Block exhausted', note.trim() || undefined, actor));
          if (!saved?.saved) throw new Error('not-saved');
        },
        enforce: (capability, context) => authorizationService.enforce(capability, context),
        getUserEmail: async id => { const r = await userService.getById(id); return r.ok ? r.data.email : undefined; },
        // Batch 669 (ws-3): no ordering pathologist to e-mail: the Supervisor / Accessioning Desk is told instead.
        getDeskRecipients: async c => { const r = await userService.getAll(); return deskRecipientsFor(c, r.ok ? r.data : []); },
        sendEmail,
      });
    } catch {
      return { ok: false, failed: true };
    }
  }, [workItem, persistOp, actor, exceptionRequirements]);

  const handleSetAlertFlags = useCallback(async (flags: { tinyTissue?: boolean; fragile?: boolean; requiresDecal?: boolean }) => {
    if (!workItem || workItem.kind !== 'block') return;
    const blockId = workItem.block.id;
    await persistOp(workItem, sp => setBlockAlertFlags(sp, blockId, flags));
  }, [workItem, persistOp]);

  // ── Cytology / Decant panel ──────────────────────────────────────────────
  const handleUpdateCytologyFields = useCallback(async (fields: { totalVolumeMl?: number; appearance?: Decant['appearance']; yieldPelletSize?: Decant['yieldPelletSize'] }) => {
    if (!workItem || workItem.kind !== 'decant') return;
    const decantId = workItem.decant.id;
    await persistOp(workItem, sp => updateDecantCytologyFields(sp, decantId, fields));
  }, [workItem, persistOp]);

  const handleApplyPrepSuggestions = useCallback(async (suggestions: CytologyPrepSuggestion[]) => {
    if (!workItem || workItem.kind !== 'decant') return;
    const fullAccession = workItem.caseData.accession?.fullAccession ?? workItem.caseData.id;
    const decantId = workItem.decant.id;
    await persistOp(workItem, sp => applyCytologyPrepSuggestions(sp, decantId, suggestions, fullAccession));
  }, [workItem, persistOp]);

  /** Batch 460: the case as saved by the billing panel (full review). */
  const adoptSavedCase = useCallback((caseData: Case) => {
    if (!workItem) return;
    const next = workItemFrom(caseData, targetOf(workItem));
    if (next) { versionRef.current = caseData.version ?? versionRef.current; setWorkItem(next); }
  }, [workItem]);

  return {
    workItem, scanError, saveError, printNotice, undoNotice, undoLast, dismissUndo, resolveScan, selectBlockDirectly, clearWorkItem,
    printMode, setPrintMode, loadDefaultPrintMode,
    batchSelection, setBatchSelection, batchProgress, clearBatchProgress,
    stainTypes, loadStainTypes,
    handlePrintNext, handlePrintSelected,
    handleAddStain, handleAddLevelOfExistingStain, requestRemoveStain, pendingRemoval, confirmPendingRemoval, cancelPendingRemoval,
    handleReprint, handleReorder,
    handleAddStainComment, handleAddBlockComment, handleSetAlertFlags, handleFlagBlockExhausted,
    handleUpdateCytologyFields, handleApplyPrepSuggestions,
    adoptSavedCase,
    effectiveStationId, actor,
  };
}

