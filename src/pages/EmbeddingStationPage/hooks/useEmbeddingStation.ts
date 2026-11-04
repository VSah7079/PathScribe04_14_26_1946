// src/pages/EmbeddingStationPage/hooks/useEmbeddingStation.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-285 (Embedding Station) — the ticket's own "sibling,
// bench-focused workstation" to PS-284's Microtome Workstation. Same
// real optimistic-update + real persistence shape as
// useMicrotomyWorkstation.ts (wraps embeddingOperations.ts's pure
// functions), plus the exact same real cassette-print dispatch chain
// (station -> printer profile -> gtin/layout from printSettingsService
// -> printCassetteLabel) already proven there and, before that, in
// useSpecimenBlockManagement.ts's own attemptPrintedLabel.
//
// Batch 729 (Lab Workflow & Batch spec §11.6): a matrix block (a cassette
// shared by several specimens, Case.matrixBlocks[]) is accepted too, the way
// the Microtome has since Batch 460: it is worked through a one-block view
// (utils/embeddingMatrixView.ts), so every operation below applies to it
// unchanged, and its save writes Case.matrixBlocks. Superseded: this header
// used to say matrix blocks were "not yet supported here" (observed:
// S26-4404-M1 refused while S26-4403-A1 was accepted). A Tissue Discrepancy on
// a matrix block is raised against its first participant specimen. A
// confirmed block is recorded on the station scan log as "completed".
//
// Real, deliberate reuse note on the discrepancy deficiency: this
// raises the real, existing def-tissue-discrepancy deficiency through
// specimenDeficiencyService — the exact same real mechanism
// useSpecimenBlockManagement.ts's own handleUpdateBlock already uses
// for a piece-count mismatch — never a second, parallel QA channel.
// The spec's own "Audit Triggers: ...routes an alert to the
// histotechnology supervisor" is implemented as that same real,
// existing deficiency landing in the real, existing QA working queue
// (QualityAssurancePage.tsx) supervisors already monitor — not a new,
// separate paging/notification channel this pass doesn't build.
//
// Batch 401 (PS-359): Confirm, Add comment and Reprint check the
// organisation's Field Requirements (page "embedding",
// services/fieldRequirements/embeddingChecks.ts) here, so the button, the
// voice command and the foot pedal are all held to the same rule. Messages
// the page shows are returned as locale keys (embeddingStation.*), and the
// scan station comes from @/services rather than the mock directly.
//
// Batch 669 (ws-8, ws-10, ws-11): every change goes through `commit`, which saves with
// services/workstationSave/runCaseAction.ts (via hooks/useWorkstationSave.ts): retried on a conflict, and a save that
// still fails shows "Not saved" (`saveError`) and reloads the stored block instead of leaving the change on screen as
// saved. A flagged discrepancy stops Confirm until it is cleared (handleClearDiscrepancy: no extra click, audited), the
// flagger is shown by name, and a Tissue Discrepancy raised (or failing to be raised) says so on screen
// (`discrepancyNotice`).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveScanStation } from '@/hooks/useEffectiveScanStation';
import {
  printerProfileService, printSettingsService, scanStationService, specimenDeficiencyService, specimenDictionaryService,
  userService, auditService, authorizationService,
  embeddingCommentMissing, embeddingConfirmMissing, embeddingReprintMissing, parseObservedPieceCount,
} from '@/services';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { matrixBlockAsEmbeddingView, matrixBlocksWithEmbeddingView } from '@/utils/embeddingMatrixView';
import { recordStationScan } from '@/services/stationScans/recordStationScan';
import { completeReembedding, type AddOnActionResult } from '@/services/addOnOrders/addOnOrderActions';
import { withdrawEndStateFromAction } from '@/services/itemEndStates/recordEndStateFromAction';
import { blockTypeOf, piecesOf, BLOCK_TYPE_PROFILES } from '@/utils/blockPieceRules';
import type { MatrixBlock } from '@/types/case/MatrixBlock';
import { cassetteIdentifier, matrixBlockIdentifier } from '@/types/labels/LabelData';
import { useWorkstationSave } from '@/hooks/useWorkstationSave';
import { replaceSpecimenById, type SpecimenOpResult } from '@/services/workstationSave/runCaseAction';
import { printCassetteLabel } from '@/utils/labels/printCassetteSlideLabel';
import { resolveMaterialFromScan } from '@/utils/resolveMaterialFromScan';
// Real, deliberate reuse: setBlockAlertFlags is a genuinely generic
// HistologyBlock operation (Tiny Tissue/Fragile/Decal Required),
// already built for PS-284 — reused here verbatim rather than a
// second, duplicate toggle function in embeddingOperations.ts. See
// that function's own doc comment in microtomyOperations.ts.
import { setBlockAlertFlags } from '@/utils/microtomyOperations';
import { DEFAULT_CASSETTE_LABEL_LAYOUT } from '@/services/printSettings/IPrintSettingsService';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';
import type { CassetteLabelLayoutConfig } from '@/services/printSettings/IPrintSettingsService';
import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock, EmbeddingMoldSize, EmbeddingDiscrepancyReason, CassetteReprintReason } from '@/types/case/Specimen';
import {
  confirmPieceCount, flagEmbeddingDiscrepancy, setMoldAndOrientation, groupSplitBlocks,
  resolveSplitBlockGroupStatus, recordCassetteReprint, addEmbeddingBlockComment, resolveEmbeddingAlertBadges,
  clearEmbeddingDiscrepancy, hasOpenEmbeddingDiscrepancy, buildEmbeddingDiscrepancyClearedAudit,
} from '@/utils/embeddingOperations';

/** A message for the page to show: a locale key and its values. */
export interface EmbeddingMessage { key: string; values?: Record<string, string> }

/** The outcome of a Confirm, Add comment or Reprint (flat: strictNullChecks is off). */
export interface EmbeddingActionResult {
  ok: boolean;
  /** Field Requirements still unmet (field ids), when that is why it stopped. */
  missing?: string[];
  /** A message to show, when something else stopped it. */
  message?: EmbeddingMessage;
  /** A printer's own error text, shown as given. */
  printerMessage?: string;
}

export interface EmbeddingWorkItem {
  caseData: Case;
  /** For a matrix block, its one-block view (label ''). */
  specimen: Specimen;
  block: HistologyBlock;
  /** Batch 729: set when the work item is a matrix block. */
  matrixBlock?: MatrixBlock;
}

/** The work item again, from another copy of the case (null when its block is gone). */
function workItemIn(caseData: Case, item: EmbeddingWorkItem): EmbeddingWorkItem | null {
  if (item.matrixBlock) {
    const mb = (caseData.matrixBlocks ?? []).find(m => m.id === item.matrixBlock!.id);
    if (!mb) return null;
    const view = matrixBlockAsEmbeddingView(mb);
    return { caseData, specimen: view, block: (view.blocks ?? [])[0], matrixBlock: mb };
  }
  const specimen = (caseData.specimens ?? []).find(x => x.id === item.specimen.id);
  const block = specimen?.blocks?.find(b => b.id === item.block.id);
  return specimen && block ? { caseData, specimen, block } : null;
}

export function useEmbeddingStation() {
  const { user } = useAuth();
  const { effectiveStationId } = useEffectiveScanStation();

  const [workItem, setWorkItem] = useState<EmbeddingWorkItem | null>(null);
  const [scanError, setScanError] = useState<EmbeddingMessage | null>(null);
  const requirements = useFieldRequirements('embedding');
  const [dictionaryType, setDictionaryType] = useState<{ type?: string; procedure?: string }>({});
  // Batch 669 (ws-11): what happened to the Tissue Discrepancy item a mismatch or flag raises; shown on the page.
  const [discrepancyNotice, setDiscrepancyNotice] = useState<(EmbeddingMessage & { kind: 'raised' | 'failed' }) | null>(null);
  // Batch 669 (ws-10): the flagger's name (the block stores the user id).
  const [flaggerName, setFlaggerName] = useState<string | null>(null);
  const { saveError, clearSaveError, saveChange, saveCaseFields, runAction } = useWorkstationSave();

  const actor = useMemo(() => ({ id: user?.id ?? 'unknown', name: user?.name ?? user?.id ?? 'unknown' }), [user?.id, user?.name]);

  /** Real, per "Biopsy/Needle Core" alert badges — resolveEmbeddingAlertBadges
   *  needs the linked specimen dictionary entry's real type/procedure,
   *  never a second, stored, driftable copy of it (see that function's
   *  own doc comment). Looked up once per work item, not on every render. */
  const loadDictionaryType = useCallback(async (specimenDictionaryEntryId?: string) => {
    if (!specimenDictionaryEntryId) { setDictionaryType({}); return; }
    const res = await specimenDictionaryService.getAll();
    if (!res.ok) { setDictionaryType({}); return; }
    const entry = res.data.find(e => e.id === specimenDictionaryEntryId);
    setDictionaryType(entry ? { type: entry.type, procedure: entry.procedure } : {});
  }, []);

  /** Real, per the spec's own "Scan-to-Open: scanning a cassette
   *  barcode auto-opens the corresponding embedding record and locks
   *  the workspace to that block." See this file's own header for the
   *  real, deliberate MatrixBlock scope cut. */
  const resolveScan = useCallback(async (rawScanValue: string): Promise<EmbeddingActionResult> => {
    setScanError(null);
    if (!rawScanValue.trim()) return { ok: false };
    const fail = (message: EmbeddingMessage): EmbeddingActionResult => { setScanError(message); return { ok: false, message }; };
    const resolved = await resolveMaterialFromScan(rawScanValue);
    if (!resolved) return fail({ key: 'embeddingStation.scanErrors.notResolved' });
    const { caseData, specimenLetter, target } = resolved;
    // Batch 729 (spec §11.6): a matrix block is embedded through its one-block view.
    if (target.level === 'matrix_block') {
      const mb = (caseData.matrixBlocks ?? []).find(m => m.id === target.matrixBlockId);
      if (!mb) return fail({ key: 'embeddingStation.scanErrors.blockNotFound', values: { block: rawScanValue.trim() } });
      const view = matrixBlockAsEmbeddingView(mb);
      clearSaveError();
      setDiscrepancyNotice(null);
      setDictionaryType({});
      setWorkItem({ caseData, specimen: view, block: (view.blocks ?? [])[0], matrixBlock: mb });
      return { ok: true };
    }
    // Batch 460: the target is checked first, so a bare specimen or decant scan gets
    // "not supported here" rather than "specimen not found".
    if (target.level !== 'block' && target.level !== 'slide') return fail({ key: 'embeddingStation.scanErrors.unsupportedTarget' });
    const specimen = (caseData.specimens ?? []).find(sp => sp.label === specimenLetter);
    if (!specimen) return fail({ key: 'embeddingStation.scanErrors.specimenNotFound' });
    const block = (specimen.blocks ?? []).find(b => b.label === target.blockNumber);
    if (!block) return fail({ key: 'embeddingStation.scanErrors.blockNotFound', values: { block: `${specimen.label}${target.blockNumber}` } });
    clearSaveError();
    setDiscrepancyNotice(null);
    setWorkItem({ caseData, specimen, block });
    void loadDictionaryType(specimen.specimenDictionaryEntryId);
    return { ok: true };
  }, [loadDictionaryType, clearSaveError]);

  const clearWorkItem = useCallback(() => {
    setWorkItem(null);
    setScanError(null);
    setDictionaryType({});
    setDiscrepancyNotice(null);
    clearSaveError();
  }, [clearSaveError]);

  const flaggedBy = workItem?.block.lastDiscrepancyReportedBy;
  useEffect(() => {
    if (!flaggedBy) { setFlaggerName(null); return; }
    let live = true;
    userService.getById(flaggedBy).then(res => {
      if (live) setFlaggerName(res.ok && res.data ? `${res.data.firstName} ${res.data.lastName}`.trim() || null : null);
    }).catch(() => { if (live) setFlaggerName(null); });
    return () => { live = false; };
  }, [flaggedBy]);

  /** Batch 669 (ws-8): applies `op` to the block's specimen, shows the result at once, and saves it (retried on a
   *  conflict, the operation re-applied to the newest copy). Returns null when the operation refuses; `saved: false`
   *  when the save failed, in which case "Not saved" is showing and the stored block has been reloaded. A caller
   *  never goes on to print or raise a QA item for an unsaved change. */
  const commit = useCallback(async (item: EmbeddingWorkItem, op: (specimen: Specimen) => SpecimenOpResult): Promise<{ saved: boolean; item: EmbeddingWorkItem } | null> => {
    const local = op(item.specimen);
    if (!local.ok) return null;
    const mbId = item.matrixBlock?.id;
    const localCase: Case = mbId
      ? { ...item.caseData, matrixBlocks: matrixBlocksWithEmbeddingView(item.caseData, mbId, local.specimen) ?? item.caseData.matrixBlocks }
      : { ...item.caseData, specimens: replaceSpecimenById(item.caseData.specimens, local.specimen) };
    const shown = workItemIn(localCase, item);
    if (shown) setWorkItem(shown);
    const outcome = mbId
      ? await saveCaseFields(item.caseData.id, current => {
        const mb = (current.matrixBlocks ?? []).find(m => m.id === mbId);
        const res = mb ? op(matrixBlockAsEmbeddingView(mb)) : null;
        const list = res && res.ok ? matrixBlocksWithEmbeddingView(current, mbId, res.specimen) : null;
        return list ? { matrixBlocks: list } : null;
      })
      : await saveChange(item.caseData.id, current => {
        const sp = (current.specimens ?? []).find(x => x.id === item.specimen.id);
        const res = sp ? op(sp) : null;
        return res && res.ok ? replaceSpecimenById(current.specimens, res.specimen) : null;
      });
    if (outcome.status === 'saved') {
      const saved = workItemIn(outcome.caseData, item);
      if (saved) { setWorkItem(saved); return { saved: true, item: saved }; }
      return { saved: true, item: shown ?? item };
    }
    // Not saved: show the block as stored now, so the tech can redo the change.
    const reloaded = outcome.latest ? workItemIn(outcome.latest, item) : null;
    const back = reloaded ?? item;
    setWorkItem(back);
    return { saved: false, item: back };
  }, [saveChange, saveCaseFields]);

  /** Batch 669 (ws-11): raises the Tissue Discrepancy item and says on screen whether it was raised. */
  const raiseTissueDiscrepancy = useCallback(async (item: EmbeddingWorkItem, comment: string) => {
    const failed = () => setDiscrepancyNotice({ kind: 'failed', key: 'embeddingStation.discrepancy.raiseFailed' });
    try {
      // Batch 729: a matrix block's discrepancy is raised against its first participant (the item text names the block).
      const firstParticipant = item.matrixBlock ? (item.caseData.specimens ?? []).find(sp => sp.id === item.matrixBlock!.participants[0]?.specimenId) : undefined;
      const res = await specimenDeficiencyService.raise({
        caseId: item.caseData.id,
        specimenId: firstParticipant?.id ?? item.specimen.id,
        specimenLabel: firstParticipant?.label ?? item.specimen.label,
        deficiencyTypeId: 'def-tissue-discrepancy',
        comment,
        raisedBy: actor.id,
      });
      if (res && res.ok === false) { console.error('[EmbeddingStation] Failed to raise Tissue Discrepancy deficiency:', res); failed(); return; }
      setDiscrepancyNotice({ kind: 'raised', key: 'embeddingStation.discrepancy.raised' });
    } catch (err) {
      console.error('[EmbeddingStation] Failed to raise Tissue Discrepancy deficiency:', err);
      failed();
    }
  }, [actor.id]);

  /** Real, per the spec's own "Piece Count Verification: requires
   *  single-touch confirmation... before sealing the block." On a
   *  genuine mismatch, raises the real, existing def-tissue-discrepancy
   *  deficiency — the identical real mechanism/wording
   *  useSpecimenBlockManagement.ts's own handleUpdateBlock already
   *  uses, so the two real embedding-confirmation entry points (this
   *  bench page, and the pathologist-facing BlockStainEditorModal.tsx)
   *  raise the exact same real QA record, never two different shapes
   *  for the same real event. */
  //
  // Batch 401: `observedCountText` is the observed-count field's text (the
  // pedal passes the expected count). `orientationInstructions`, when given,
  // is the orientation box's current text, saved in the same update, so a
  // Confirm clicked straight after typing neither misses it nor overwrites it.
  const handleConfirmPieceCount = useCallback(async (
    observedCountText: string | number, orientationInstructions?: string,
  ): Promise<EmbeddingActionResult> => {
    if (!workItem) return { ok: false };
    if (workItem.block.status === 'Embedded') return { ok: false };
    const block = workItem.block;
    // Batch 669 (ws-10): a flagged discrepancy stops Confirm until it is cleared.
    if (hasOpenEmbeddingDiscrepancy(block)) return { ok: false, message: { key: 'embeddingStation.discrepancy.confirmBlocked' } };
    const orientation = orientationInstructions ?? block.orientationInstructions ?? '';
    const missing = embeddingConfirmMissing({ observedCount: observedCountText, moldSize: block.moldSize, orientationInstructions: orientation }, requirements);
    if (missing.length > 0) return { ok: false, missing };
    const observedCount = parseObservedPieceCount(observedCountText);
    // The observed count is a locked-required field, so the check above
    // already refuses an unreadable count; this keeps that explicit.
    if (observedCount === null) return { ok: false, missing: ['observedPieceCount'] };
    const expected = block.pieceCount;
    setDiscrepancyNotice(null);
    // The orientation box's text is saved in the same update (and re-applied the same way on a retry).
    const saved = await commit(workItem, sp => {
      let specimen = sp;
      const current = (sp.blocks ?? []).find(b => b.id === block.id);
      if (orientationInstructions !== undefined && orientationInstructions !== (current?.orientationInstructions ?? '')) {
        const withOrientation = setMoldAndOrientation(specimen, block.id, { orientationInstructions });
        if (withOrientation.ok) specimen = withOrientation.specimen;
      }
      if (current && hasOpenEmbeddingDiscrepancy(current)) return { ok: false, error: 'A discrepancy is flagged.' };
      return confirmPieceCount(specimen, block.id, observedCount);
    });
    if (!saved || !saved.saved) return { ok: false };
    if (typeof expected === 'number' && expected !== observedCount) {
      void raiseTissueDiscrepancy(workItem, `Block ${workItem.specimen.label}${workItem.block.label}: ${expected} piece${expected === 1 ? '' : 's'} recorded at grossing, ${observedCount} observed at embedding.`);
    }
    // Batch 729 (spec §7.1): the embedded block is "completed" at this station.
    const fullAccession = workItem.caseData.accession?.fullAccession ?? workItem.caseData.id;
    recordStationScan({
      stationId: effectiveStationId, itemId: workItem.matrixBlock ? matrixBlockIdentifier(fullAccession, workItem.matrixBlock.label) : cassetteIdentifier(fullAccession, workItem.specimen.label, workItem.block.label),
      materialType: workItem.matrixBlock ? 'matrix_block' : 'block', caseAccession: fullAccession, node: 'Embedding',
      userId: actor.id, userName: actor.name, action: 'completed', result: 'ok',
    });
    return { ok: true };
  }, [workItem, commit, raiseTissueDiscrepancy, requirements, effectiveStationId, actor]);

  /** Real, per the spec's own "Discrepancy Reporting: one-touch buttons
   *  ... Audit Triggers: a flagged discrepancy halts the block
   *  workflow and routes an alert." Records the real sub-reason on the
   *  block AND raises the same real deficiency as above — this is the
   *  one-touch path, distinct from a genuine piece-count number
   *  mismatch, for when the tech already knows exactly what's wrong
   *  (an unopened cassette, a broken hinge) without needing to type a
   *  count at all. */
  const handleFlagDiscrepancy = useCallback(async (reason: EmbeddingDiscrepancyReason) => {
    if (!workItem) return;
    setDiscrepancyNotice(null);
    const saved = await commit(workItem, sp => flagEmbeddingDiscrepancy(sp, workItem.block.id, reason, actor.id));
    // Nothing is raised for a flag that was not saved.
    if (!saved || !saved.saved) return;
    await raiseTissueDiscrepancy(workItem, `Block ${workItem.specimen.label}${workItem.block.label}: flagged at embedding — ${reason}.`);
  }, [workItem, commit, raiseTissueDiscrepancy, actor.id]);

  /** Batch 669 (ws-10): clears the flag in one click (no confirmation: it can be flagged again), then audits it. */
  const handleClearDiscrepancy = useCallback(async () => {
    if (!workItem || !hasOpenEmbeddingDiscrepancy(workItem.block)) return;
    const flagged = workItem.block;
    setDiscrepancyNotice(null);
    const saved = await commit(workItem, sp => clearEmbeddingDiscrepancy(sp, flagged.id));
    if (!saved || !saved.saved) return;
    void auditService.logEvent(buildEmbeddingDiscrepancyClearedAudit({
      caseId: workItem.caseData.id,
      accession: workItem.caseData.accession?.fullAccession ?? workItem.caseData.id,
      specimenLabel: workItem.specimen.label,
      block: flagged,
      actor,
    })).catch(err => console.error('[EmbeddingStation] Failed to audit the cleared discrepancy:', err));
  }, [workItem, commit, actor]);

  const handleSetMoldAndOrientation = useCallback(async (changes: { moldSize?: EmbeddingMoldSize; orientationInstructions?: string }) => {
    if (!workItem) return;
    await commit(workItem, sp => setMoldAndOrientation(sp, workItem.block.id, changes));
  }, [workItem, commit]);

  /** Real, per the spec's own "High-Contrast Visual Alerts: Tiny/
   *  Fragile, Decal Required" toggle badges — reuses the identical
   *  real setBlockAlertFlags PS-284 already built (see this file's
   *  own import comment) rather than a second, parallel toggle. */
  const handleSetAlertFlags = useCallback(async (flags: { tinyTissue?: boolean; fragile?: boolean; requiresDecal?: boolean }) => {
    if (!workItem) return;
    await commit(workItem, sp => setBlockAlertFlags(sp, workItem.block.id, flags));
  }, [workItem, commit]);

  /** Real, per the spec's own "Multi-Cassette / Split-Block Tracking...
   *  to ensure all related cassettes are embedded together." Groups
   *  the current work item's block with one or more sibling block ids
   *  already on this specimen (a tech picks the related cassette(s)
   *  from this specimen's own block list) — never creates a new block,
   *  see groupSplitBlocks's own doc comment. */
  const handleGroupSplitBlocks = useCallback(async (siblingBlockIds: string[]) => {
    if (!workItem) return;
    await commit(workItem, sp => groupSplitBlocks(sp, [workItem.block.id, ...siblingBlockIds]));
  }, [workItem, commit]);

  const splitBlockGroupStatus = workItem ? resolveSplitBlockGroupStatus(workItem.specimen, workItem.block.id) : null;

  const handleAddComment = useCallback(async (text: string): Promise<EmbeddingActionResult> => {
    if (!workItem) return { ok: false };
    const missing = embeddingCommentMissing(text, requirements);
    if (missing.length > 0) return { ok: false, missing };
    const saved = await commit(workItem, sp => addEmbeddingBlockComment(sp, workItem.block.id, text, actor.id, actor.name));
    return { ok: !!saved && saved.saved };
  }, [workItem, commit, actor, requirements]);

  /** Real, per the spec's own Right Panel: resolves the actual,
   *  configured printer/gtin/layout for the CURRENT station — the
   *  identical real chain useMicrotomyWorkstation.ts's own
   *  getPrinterContext already proved for slides, reused here for
   *  cassettes (same real cassetteSlidePrinterProfileId station
   *  field covers both — see ScanStation's own doc comment). */
  const getPrinterContext = useCallback(async (): Promise<{ printer: PrinterProfile; gtin: string; layout: CassetteLabelLayoutConfig } | { error: string }> => {
    if (!effectiveStationId) return { error: 'embeddingStation.hardware.noStation' };
    const stationRes = await scanStationService.getById(effectiveStationId);
    if (!stationRes.ok) return { error: 'embeddingStation.hardware.stationNotFound' };
    if (!stationRes.data.supportsPrinting || !stationRes.data.cassetteSlidePrinterProfileId) {
      return { error: 'embeddingStation.hardware.notConfigured' };
    }
    const printerRes = await printerProfileService.getById(stationRes.data.cassetteSlidePrinterProfileId);
    if (!printerRes.ok || !printerRes.data) return { error: 'embeddingStation.hardware.profileMissing' };
    const settingsRes = await printSettingsService.get();
    const gtin = settingsRes.ok ? settingsRes.data.gs1Gtin : '';
    const layout = settingsRes.ok ? settingsRes.data.cassetteLabelLayout : DEFAULT_CASSETTE_LABEL_LAYOUT;
    return { printer: printerRes.data, gtin, layout };
  }, [effectiveStationId]);

  /** Real, per the spec's own "On-Demand Reprint/Re-labeling for a
   *  damaged or wax-obscured cassette label... Reason Log: mandatory
   *  reason prompt for any reprint." Records the required reason first
   *  (embeddingOperations.recordCassetteReprint — real, audited,
   *  cumulative count), then dispatches the actual real print through
   *  the identical GS1/ZPL path this app's own cassette printing
   *  already uses everywhere else. */
  const handleReprintCassette = useCallback(async (reason: CassetteReprintReason | ''): Promise<EmbeddingActionResult> => {
    if (!workItem) return { ok: false, message: { key: 'embeddingStation.hardware.noBlock' } };
    const missing = embeddingReprintMissing(reason, requirements);
    if (missing.length > 0) return { ok: false, missing };
    // Real, per this codebase's own established gotcha (see
    // services/reports/README.md / microtomyOperations.ts's own
    // markStainPrintResult): strictNullChecks: false means a
    // discriminated union doesn't reliably narrow on `if (!x.ok)`
    // either — handled explicitly with `if (recorded.ok) {...}` instead.
    const recorded = await commit(workItem, sp => recordCassetteReprint(sp, workItem.block.id, reason as CassetteReprintReason, actor.id));
    if (!recorded) return { ok: false, message: { key: 'embeddingStation.hardware.noBlock' } };
    // The reason and count are saved before a duplicate label is printed; nothing is printed for an unsaved change.
    if (!recorded.saved) return { ok: false, message: { key: 'embeddingStation.hardware.reprintFailed' } };
    const specimen = recorded.item.specimen;
    const block = recorded.item.block;

    const ctx = await getPrinterContext();
    if ('error' in ctx) return { ok: false, message: { key: ctx.error } };
    const fullAccession = workItem.caseData.accession?.fullAccession ?? workItem.caseData.id;
    const patientName = `${workItem.caseData.patient.givenNames ?? ''} ${workItem.caseData.patient.familyNames ?? ''}`.trim();
    const result = await printCassetteLabel(
      { fullAccession, specimenLabel: specimen.label, blockLabel: block.label, cassetteId: `${fullAccession}-${specimen.label}${block.label}`, patientName, tissueDescription: block.tissueDescription, blockType: block.blockType },
      ctx.printer, ctx.gtin, ctx.layout,
    );
    return result.ok ? { ok: true } : { ok: false, printerMessage: (result as { ok: false; message: string }).message };
  }, [workItem, commit, getPrinterContext, actor.id, requirements]);

  /** Batch 731 (spec §10.6): the block's remnant or wet tissue has been re-embedded: the orders waiting for it go to
   *  the Microtome (services/addOnOrders checks material:reembed:complete and audits it). */
  const handleReembedded = useCallback(async (): Promise<AddOnActionResult> => {
    if (!workItem || workItem.matrixBlock) return { ok: false, failed: true };
    const blockId = workItem.block.id;
    const outcome = await runAction(workItem.caseData.id, (current, save) => completeReembedding({ caseData: current, blockId, actor }, {
      enforce: (capability, context) => authorizationService.enforce(capability, context),
      saveSpecimens: (_c, specimens) => save(specimens),
      audit: entry => auditService.logEvent(entry),
      // Batch 732: the block is back in use, so its "exhausted" end state is withdrawn.
      withdrawEndState: (itemId, acc, reason) => withdrawEndStateFromAction(itemId, acc, reason, actor),
    }));
    if (outcome.status === 'failed') {
      const back = outcome.latest ? workItemIn(outcome.latest, workItem) : null;
      if (back) setWorkItem(back);
      return { ok: false, notSaved: outcome.reason };
    }
    if (outcome.status === 'saved') { const next = workItemIn(outcome.caseData, workItem); if (next) setWorkItem(next); }
    return outcome.value;
  }, [workItem, runAction, actor]);

  /** Batch 732 (spec §11.1, §11.2, §11.6): the block's type, the slide size it produces, and its piece map. */
  const pieceView = useMemo(() => {
    if (!workItem) return null;
    const blockType = workItem.matrixBlock ? 'matrix' as const : blockTypeOf(workItem.block);
    const pieces = workItem.matrixBlock ? piecesOf(workItem.matrixBlock, workItem.caseData.specimens ?? []) : piecesOf(workItem.block);
    return { blockType, slideSize: BLOCK_TYPE_PROFILES[blockType].slideSize, pieces };
  }, [workItem]);

  const alertBadges = workItem ? resolveEmbeddingAlertBadges(workItem.block, dictionaryType.type, dictionaryType.procedure) : [];
  /** Batch 729: for a matrix block, the labels of the specimens sharing it (A, B), shown instead of a specimen type. */
  const matrixSpecimens = workItem?.matrixBlock
    ? workItem.matrixBlock.participants.map(p => (workItem.caseData.specimens ?? []).find(sp => sp.id === p.specimenId)?.label).filter(Boolean).join(', ')
    : null;

  return {
    workItem, scanError, saveError, discrepancyNotice, flaggerName, resolveScan, clearWorkItem, requirements,
    alertBadges, splitBlockGroupStatus, matrixSpecimens,
    handleConfirmPieceCount, handleFlagDiscrepancy, handleClearDiscrepancy, handleSetMoldAndOrientation, handleSetAlertFlags, handleGroupSplitBlocks,
    handleAddComment, handleReprintCassette, handleReembedded, pieceView,
    effectiveStationId, actor,
  };
}
