// src/pages/SynopticReportPage/hooks/useSpecimenBlockManagement.ts
// ─────────────────────────────────────────────────────────────────────────────
// Extracted from SynopticReportPage.tsx (originally lines ~391-476,
// ~2359-2415) as part of the same incremental cleanup that produced
// useLisIntegration.ts — see that file's header for the full rationale.
//
// PURE MOVE, not a rewrite — every function body is unchanged from its
// original implementation.
//
// Scope: focused-block navigation/state and the block-level edit
// operations (advance status, confirm triage, manual edit, add a new
// block). Deliberately does NOT include handleGrossComplete, even
// though its name also mentions grossing/specimens — that function is
// ~235 lines and genuinely depends on handleProtocolChangesDetected
// (part of the amendment/protocol-change domain), plus pool routing,
// AI-behavior config, and Stage 1 synoptic evaluation. It's cross-
// cutting enough that it deserves its own dedicated extraction pass
// rather than being bundled in here just because of its name.
//
// allBlocks, focusedBlockIndex, and handleAdvanceFocusedBlockStatus /
// handleConfirmTriage are also read directly by a large voice-command
// listener elsewhere in the main file (search for "openFlagManager,
// showTeamModal" in SynopticReportPage.tsx for the comment explaining
// why that listener couldn't live next to these). That listener is
// untouched by this extraction — it continues to reference these by
// name, now sourced from this hook's return value instead of being
// defined inline in the same scope.
// ─────────────────────────────────────────────────────────────────────────────

import type { DirtySectionId } from '@/services';
import { useState, useEffect, useMemo, useCallback, useRef, type MutableRefObject } from 'react';
import { isTriagePending } from '@/pages/WorklistPage/PendingGrossingTriageTile';
import { useTranslation } from 'react-i18next';
import { caseRouter } from '@/services/cases/CaseRouter';
import { ConcurrencyConflictError } from '@/services/cases/ConcurrencyConflictError';
import type { CaseWriteDeps } from '@/services/cases/caseWrite';
import {
  saveScreenCaseChange, cancelBlockChange, orderRestainChange, appendBlockChange, setBlockLisStatusChange,
  releasePendingBlocksChange, removePendingBlockChange, createMatrixBlockChange,
  updateMatrixBlockParticipantsChange, dissolveMatrixBlockChange, type CaseChange,
} from '@/services/material/blockCaseChanges';
import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock, BlockStatus, StainOrder } from '@/types/case/Specimen';
import type { MatrixBlock } from '@/types/case/MatrixBlock';
import type { Decant } from '@/types/case/Material';
import { useCaseMaterialStore } from './useCaseMaterialStore';
import { nextDecantLabel, decantRefusalKey } from '@/services/material/materialTree';
import type { DispatchOutcome } from '@/services/material/caseMaterialStore';
import { UNSTAINED_LABEL } from '@/types/case/Specimen';
import type { SigningUser, SetConcurrencyConflict } from './sharedHookTypes';
import { handleConcurrencyConflict } from './sharedHookTypes';
import { useCassetteScanVerification } from './useCassetteScanVerification';
import { printSettingsService, specimenDeficiencyService, auditService as mockAuditService } from '@/services/index';
import type { PrintSettingsConfig, CassetteLabelLayoutConfig } from '@/services/printSettings/IPrintSettingsService';
import { DEFAULT_CASSETTE_LABEL_LAYOUT } from '@/services/printSettings/IPrintSettingsService';
import { dispatchCassetteLabel, dispatchMatrixCassetteLabel } from '@/utils/labels/dispatchCassetteLabel';
import { getAllCassetteLabelRequests } from '@/utils/labels/getAllCassetteLabelRequests';
import { cassetteIdentifier, slideIdentifier, decantIdentifier, matrixBlockIdentifier } from '@/types/labels/LabelData';
import { dispatchSlideLabel } from '@/utils/labels/dispatchSlideLabel';
import { getAllSlideLabelRequests } from '@/utils/labels/getAllSlideLabelRequests';
import { scanStationService } from '@/services';
import { printerProfileService } from '@/services/index';
import { printCassetteLabel, printSlideLabel } from '@/utils/labels/printCassetteSlideLabel';
import { resolveDecantCassetteColor } from '@/utils/resolveDecantCassetteColor';
import { resolveBlockCassetteColor } from '@/utils/resolveBlockCassetteColor';
import { resolveProtocolIdForSpecimen } from '@/utils/resolveProtocolIdForSpecimen';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';

interface UseSpecimenBlockManagementParams {
  caseData: Case | null;
  setCaseData: React.Dispatch<React.SetStateAction<Case | null>>;
  signingUser: SigningUser;
  markDirty: (section: DirtySectionId) => void;
  knownVersionRef: MutableRefObject<number>;
  setConcurrencyConflict: SetConcurrencyConflict;
  sendMaterialOrderToLis: (order: {
    kind: 'block_recut' | 'stain' | 'cancel' | 'restain';
    specimenId: string;
    label: string;
    /** Real, per direct billing-expert guidance (PS-93): only ever set
     *  on a kind: 'stain' order targeting a shared MatrixBlock's own
     *  slides[] (types/case/MatrixBlock.ts) — the real matrixBlockId
     *  this targeted ancillary stain is being cut from. Undefined for
     *  every ordinary, specimen-owned block's own stain order. */
    matrixBlockId?: string;
    /** The real, explicit set of participating specimens (from that
     *  matrix block's own participants[]) this order actually
     *  targets — one for Case A (a single core selected), more than
     *  one for Case B (the stain genuinely evaluates multiple cores
     *  at once). specimenId above still carries the first of these,
     *  for any caller with no matrix-aware handling. Undefined for
     *  every ordinary block's own stain order, same as matrixBlockId. */
    targetSpecimenIds?: string[];
  }) => Promise<{ ok: boolean }>;
  /** The report page's toast; cassette and slide ids carry the accession, so those messages pass `{ containsPhi: true }`. */
  showToast: import('@/pages/Synoptic/useSynopticToast').ShowToast;
  /** Real fix, per direct follow-up: "I would like to support both
   *  slide engraving and printed labels." Passed in explicitly by the
   *  caller (SynopticReportPage.tsx, via useEffectiveScanStation())
   *  rather than this hook calling useEffectiveScanStation() itself —
   *  that hook depends on useAuth()/AuthContext, and this hook is
   *  deliberately, explicitly designed to take every real dependency
   *  as a plain parameter so it stays testable with renderHook() and
   *  no provider tree at all (confirmed directly: the existing
   *  integration test renders this hook completely unwrapped). Real,
   *  optional — null/undefined behaves exactly as this feature not
   *  existing at all. */
  effectiveStationId?: string | null;
}

export function useSpecimenBlockManagement({
  caseData, setCaseData, signingUser, markDirty, knownVersionRef,
  setConcurrencyConflict, sendMaterialOrderToLis, showToast, effectiveStationId,
}: UseSpecimenBlockManagementParams) {
  // Real fix, per direct follow-up: "what will happen if two
  // transaction happen at the same time?" Confirmed directly: the
  // optimistic block/stain flow below has a real, second async phase
  // (confirming/rejecting the request, ~400ms later in the mock) that
  // was persisting from a snapshot of specimens captured back at the
  // START of that phase — a real, unrelated change made anywhere else
  // on the case during that window would get silently overwritten
  // and lost the moment this phase's own write went through, since
  // it would blindly re-save its own stale copy of everything, not
  // just the one field it actually meant to change. This ref is kept
  // synced to the real, latest caseData on every render — reading
  // caseDataRef.current at the moment of persisting (rather than a
  // value closed over when the async function started) means Phase 2
  // only ever builds its write from what's genuinely current.
  const caseDataRef = useRef(caseData);
  caseDataRef.current = caseData;
  const { t } = useTranslation();

  // PS-71 (Batch 458): the block/stain/Biopsy Array saves below used to
  // catch a version conflict and save again WITHOUT a version ("force-write
  // on retry because the LIS already acknowledged the physical order"),
  // silently overwriting whatever the other person had just saved. Now the
  // first save carries knownVersionRef; on a conflict the same change
  // (services/material/blockCaseChanges.ts) is re-applied to the newest
  // case and saved with that case's version, so the LIS-acknowledged order
  // is still recorded AND the other person's edits survive. The screen
  // then adopts what was saved and knownVersionRef follows the saved
  // version. If it still can't be saved, the optimistic change is undone
  // (when `revert` is given) and the user is told: never a silent loss and
  // never a pretended save.
  //   'saved'    saved on the screen's version
  //   'merged'   saved on top of someone else's newer version
  //   'notSaved' could not be saved (kept conflicting, or no longer applies)
  //   'error'    any other failure (logged; callers keep their old flow)
  const caseWriteDeps = useMemo<CaseWriteDeps>(() => ({
    getCase: (id: string) => caseRouter.getCase(id),
    updateCase: (id: string, updates: Partial<Case>, expectedVersion: number) => caseRouter.updateCase(id, updates, expectedVersion),
  }), []);
  const persistBlockChange = useCallback(async (
    caseId: string,
    firstUpdates: Partial<Case>,
    change: CaseChange,
    revert: Partial<Case> | null,
    logLabel: string,
  ): Promise<'saved' | 'merged' | 'notSaved' | 'error'> => {
    try {
      const r = await saveScreenCaseChange(caseId, firstUpdates, change, knownVersionRef.current, caseWriteDeps);
      if (r.ok) {
        // PS-71 (Batch 458): adopt the new version only when this page's copy
        // is the saved case. After a merge, someone else changed the case and
        // this page holds only their specimens and blocks, so its other parts
        // are older than the saved case: keeping the old version makes the
        // page's next save of those parts open the Edit Conflict dialog
        // instead of overwriting their work.
        if (!r.retried) { knownVersionRef.current = r.version; return 'saved'; }
        setCaseData(prev => prev ? ({ ...prev, ...r.updates } as typeof prev) : prev);
        return 'merged';
      }
      if (revert) setCaseData(prev => prev ? ({ ...prev, ...revert } as typeof prev) : prev);
      showToast(t('useSpecimenBlockManagement.toast.blockChangeNotSavedConflict'), 'warning');
      return 'notSaved';
    } catch (e) {
      console.error(logLabel, e);
      return 'error';
    }
  }, [caseWriteDeps, knownVersionRef, setCaseData, showToast, t]);

  // Real feature, per direct follow-up: Step 4 of the label-printing
  // build plan — on-demand trigger wiring + scan verification. Real,
  // deliberate composition here (not threaded in from the parent as a
  // prop) — this hook already owns block creation (handleAddBlock
  // below), the one real place a cassette gets created during
  // grossing, so the trigger and the verification state live right
  // next to each other.
  const { pendingVerification, registerPendingVerification, hasUnverifiedPendingCassette } = useCassetteScanVerification();
  const [printSettings, setPrintSettings] = useState<PrintSettingsConfig | null>(null);
  useEffect(() => {
    printSettingsService.get().then(res => { if (res.ok) setPrintSettings(res.data); });
  }, []);

  // ── Grossing: focused block navigation ──────────────────────────────────────
  // A voice command like "mark grossed" needs to know *which* block,
  // unambiguously — there was no such concept anywhere before this.
  // Flattened across every specimen so "next/previous block" moves
  // through the whole case in one sequence, not per-specimen.
  const allBlocks = useMemo(() => {
    const out: { specimenId: string; specimenLabel: string; specimenDescription: string; block: HistologyBlock }[] = [];
    (caseData?.specimens ?? []).forEach((sp: Specimen) => {
      (sp.blocks ?? []).forEach((block: HistologyBlock) => out.push({ specimenId: sp.id, specimenLabel: sp.label, specimenDescription: sp.description, block }));
    });
    return out;
  }, [caseData?.specimens]);
  // Real feature, per direct follow-up: "decant-level linking UI. In
  // the same UI we add specimens, blocks stains, protocols?" Real,
  // parallel counterpart to allBlocks above — kept genuinely separate
  // (not merged into one, unioned array) rather than risk an invasive
  // type-union rippling through allBlocks' own established consumers
  // (focusedBlockIndex, voice commands, etc.), which never needed to
  // know about decants at all.
  const allDecants = useMemo(() => {
    const out: { specimenId: string; specimenLabel: string; specimenDescription: string; decant: Decant }[] = [];
    (caseData?.specimens ?? []).forEach((sp: Specimen) => {
      (sp.decants ?? []).forEach((decant: Decant) => out.push({ specimenId: sp.id, specimenLabel: sp.label, specimenDescription: sp.description, decant }));
    });
    return out;
  }, [caseData?.specimens]);
  const [focusedBlockIndex, setFocusedBlockIndex] = useState(0);
  useEffect(() => {
    if (focusedBlockIndex >= allBlocks.length) setFocusedBlockIndex(Math.max(0, allBlocks.length - 1));
  }, [allBlocks.length, focusedBlockIndex]);
  const focusedBlockEntry = allBlocks[focusedBlockIndex];

  // Real feature, per direct research: Step 6 of the label-printing build
  // plan — "PathScribe, print current cassette" vs "PathScribe, batch
  // print case slides" as real voice/hotkey actions
  // (services/actionRegistry/'s own PRINT_CURRENT_CASSETTE and
  // BATCH_PRINT_CASE_LABELS entries dispatch these same custom events).
  // Both real functions here are also directly callable from a UI
  // button (MaterialTreePanel.tsx) — the voice/hotkey listener and the
  // button share one real implementation, not two parallel ones that
  // could drift apart.
  // Real feature, per direct follow-up: "Label Reprint is a real thing
  // too. Either a batch or single." The real, underlying print logic
  // takes an explicit specimen/block — never depends on what's
  // currently focused — so a reprint action on ANY block (not just the
  // one the user happens to have open) can call this directly.
  // Real feature, per direct follow-up: "I would like to support both
  // slide engraving and printed labels." Real, effective scan station
  // (services/scanStations/) is where "does THIS station actually
  // print, engrave, both, or neither" now lives — see
  // ScanStation.supportsEngraving/supportsPrinting's own doc comments.
  // Received as an explicit parameter (see UseSpecimenBlockManagementParams's
  // own doc comment) rather than called directly here.

  /** Real, deliberate, purely-ADDITIVE helper — never replaces or
   *  gates the existing dispatchCassetteLabel/dispatchSlideLabel
   *  engrave-stub calls below, which stay exactly as they were.
   *  Fetches the real, effective station, and — only when it's
   *  genuinely configured with supportsPrinting and a real target
   *  printer profile — fires the real, parallel print via
   *  printCassetteSlideLabel.ts. A station with neither flag set
   *  (the real default for every seeded station except the two
   *  deliberately configured as print-capable examples) behaves
   *  exactly as it did before this feature existed. Fire-and-forget,
   *  same posture as the engrave-stub calls it sits beside — a real
   *  print failure surfaces via its own toast, never blocks the rest
   *  of the grossing/scanning workflow.
   *
   *  `build`'s own return shape is deliberately a flat
   *  { ok, message? } rather than printCassetteSlideLabel.ts's own
   *  real, discriminated PrintCassetteSlideLabelResult|Error union —
   *  this project's own tsconfig.json has strictNullChecks disabled,
   *  under which that union can't be reliably narrowed at this call
   *  boundary; each real call site below does its own, local,
   *  established cast against the real union before flattening it
   *  here, rather than fighting that limitation a second time in this
   *  shared helper. */
  const attemptPrintedLabel = useCallback(async (
    kind: 'cassette' | 'slide',
    build: (printer: PrinterProfile, gtin: string, cassetteLabelLayout: CassetteLabelLayoutConfig) => Promise<{ ok: boolean; message?: string }>,
  ) => {
    if (!effectiveStationId) return;
    const stationRes = await scanStationService.getById(effectiveStationId);
    if (!stationRes.ok || !stationRes.data.supportsPrinting || !stationRes.data.cassetteSlidePrinterProfileId) return;
    const printerRes = await printerProfileService.getById(stationRes.data.cassetteSlidePrinterProfileId);
    if (!printerRes.ok || !printerRes.data) {
      showToast(t('useSpecimenBlockManagement.toast.printerProfileMissing', {
        kind: t(kind === 'cassette' ? 'useSpecimenBlockManagement.labels.kindCassette' : 'useSpecimenBlockManagement.labels.kindSlide'),
      }), 'warning');
      return;
    }
    const settingsRes = await printSettingsService.get();
    const gtin = settingsRes.ok ? settingsRes.data.gs1Gtin : '';
    // Real, per direct follow-up ("allow the admin to enter/edit the
    // parameters in order for them to ensure safety") — fetched here
    // alongside gtin, the same real, established pattern, rather than
    // printCassetteLabel reaching for its own config independently.
    const cassetteLabelLayout = settingsRes.ok ? settingsRes.data.cassetteLabelLayout : DEFAULT_CASSETTE_LABEL_LAYOUT;
    const result = await build(printerRes.data, gtin, cassetteLabelLayout);
    if (!result.ok) showToast(t('useSpecimenBlockManagement.toast.printedLabelFailed', {
      kind: t(kind === 'cassette' ? 'useSpecimenBlockManagement.labels.kindCassette' : 'useSpecimenBlockManagement.labels.kindSlide'),
      message: result.message ?? t('useSpecimenBlockManagement.labels.unknownError'),
    }), 'warning');
  }, [effectiveStationId, showToast, t]);

  const printCassetteForBlock = useCallback((specimenLabel: string, blockLabel: string) => {
    if (!caseData) return;
    const cassetteId = cassetteIdentifier(caseData.accession.fullAccession, specimenLabel, blockLabel);
    // Real, per direct follow-up flagging a real, confirmed gap: this
    // block's own real tissueDescription (editable via
    // BlockStainEditorModal.tsx) never actually reached the printed
    // label before now — looked up here rather than widening this
    // function's own real parameter list, since caseData already
    // carries everything needed.
    const block = (caseData.specimens ?? [])
      .find(s => s.label === specimenLabel)?.blocks
      ?.find(b => b.label === blockLabel);
    dispatchCassetteLabel({
      fullAccession: caseData.accession.fullAccession,
      specimenLabel,
      blockLabel,
      cassetteId,
    }).catch(console.error);
    // Real, purely additive — see attemptPrintedLabel's own doc
    // comment. Never affects the dispatchCassetteLabel engrave-stub
    // call above.
    attemptPrintedLabel('cassette', async (printer, gtin, cassetteLabelLayout) => {
      const result = await printCassetteLabel({
        fullAccession: caseData.accession.fullAccession, specimenLabel, blockLabel, cassetteId,
        patientName: `${caseData.patient.givenNames} ${caseData.patient.familyNames}`.trim(),
        tissueDescription: block?.tissueDescription,
      }, printer, gtin, cassetteLabelLayout);
      // Real, deliberate cast — see attemptPrintedLabel's own doc
      // comment on why this project's own tsconfig.json requires it.
      return result.ok ? { ok: true } : { ok: false, message: (result as { ok: false; message: string }).message };
    }).catch(console.error);
    registerPendingVerification({ cassetteId, blockLabel, specimenLabel });
    showToast(t('useSpecimenBlockManagement.toast.printingCassette', { cassetteId }), 'info', { containsPhi: true });
  }, [caseData, registerPendingVerification, showToast, attemptPrintedLabel, t]);

  // Real, dedicated sibling to printCassetteForBlock above, for a real
  // matrix block — added per direct follow-up: "primary label
  // printing for matrix blocks." Same real on-demand reprint
  // capability (voice/hotkey/button-callable), just resolving every
  // real participant's own label rather than a single specimenLabel.
  const printMatrixCassette = useCallback((matrixBlockId: string) => {
    if (!caseData) return;
    const matrixBlock = (caseData.matrixBlocks ?? []).find(m => m.id === matrixBlockId);
    if (!matrixBlock) return;
    const fullAccession = caseData.accession.fullAccession;
    const cassetteId = matrixBlockIdentifier(fullAccession, matrixBlock.label);
    const specimenLabels = matrixBlock.participants.map(p =>
      (caseData.specimens ?? []).find(s => s.id === p.specimenId)?.label ?? '?');
    dispatchMatrixCassetteLabel({
      fullAccession, specimenLabels, matrixBlockLabel: matrixBlock.label, cassetteId,
    }).catch(console.error);
    // Real, purely additive — see attemptPrintedLabel's own doc
    // comment. Never affects the dispatchMatrixCassetteLabel
    // engrave-stub call above. Real, deliberate reuse of the ordinary-
    // block printCassetteLabel rather than a whole, separate matrix-
    // specific print function: the GS1 barcode itself only ever
    // encodes the accession + this cassette's own real, shared id
    // (matrix or ordinary makes no difference there) — the joined
    // specimen labels below only affect the human-readable text line.
    attemptPrintedLabel('cassette', async (printer, gtin, cassetteLabelLayout) => {
      const result = await printCassetteLabel({
        fullAccession, specimenLabel: specimenLabels.join(','), blockLabel: matrixBlock.label, cassetteId,
        patientName: `${caseData.patient.givenNames} ${caseData.patient.familyNames}`.trim(),
      }, printer, gtin, cassetteLabelLayout);
      return result.ok ? { ok: true } : { ok: false, message: (result as { ok: false; message: string }).message };
    }).catch(console.error);
    registerPendingVerification({ cassetteId, blockLabel: matrixBlock.label, specimenLabel: '' });
    showToast(t('useSpecimenBlockManagement.toast.printingCassette', { cassetteId }), 'info', { containsPhi: true });
  }, [caseData, registerPendingVerification, showToast, attemptPrintedLabel, t]);

  // Voice/hotkey entry point — "print current cassette" genuinely means
  // whatever's focused right now, so this stays a thin wrapper around
  // the real, explicit-block function above rather than its own,
  // separate implementation.
  const handlePrintCurrentCassette = useCallback(() => {
    if (!focusedBlockEntry) return;
    printCassetteForBlock(focusedBlockEntry.specimenLabel, focusedBlockEntry.block.label);
  }, [focusedBlockEntry, printCassetteForBlock]);

  // Real fix, per direct follow-up: enforceOnDemandGuardrails was a
  // real, working Config toggle (Step 3) that persisted correctly but
  // was never actually read anywhere — confirmed directly (grepped the
  // whole codebase, zero real matches outside its own definition and
  // the Config UI). "When on, the default above is fixed lab-wide —
  // accessioners cannot switch to Batch for an individual case"
  // (PrintSettingsSection.tsx's own stated behavior) now means what it
  // says: batch printing is genuinely blocked, not just described as
  // blocked, whenever the lab's real default is on-demand and the
  // guardrail is enforced.
  const batchPrintBlocked = printSettings?.defaultPrintBehavior === 'on_demand' && printSettings?.enforceOnDemandGuardrails === true;

  const handleBatchPrintCassettes = useCallback(() => {
    if (!caseData) return;
    if (batchPrintBlocked) {
      showToast(t('useSpecimenBlockManagement.toast.batchPrintCassetteDisabled'), 'warning');
      return;
    }
    const { ordinary, matrix } = getAllCassetteLabelRequests(caseData);
    const total = ordinary.length + matrix.length;
    if (total === 0) {
      showToast(t('useSpecimenBlockManagement.toast.noCassettesToPrint'));
      return;
    }
    Promise.all([
      ...ordinary.map(r => dispatchCassetteLabel(r)),
      ...matrix.map(r => dispatchMatrixCassetteLabel(r)),
    ]).catch(console.error);
    // Real, purely additive — see attemptPrintedLabel's own doc
    // comment. A real batch run touches every real cassette on the
    // case, ordinary and matrix alike, same as the engrave-stub calls
    // immediately above — this was a real, genuine gap until now: the
    // on-demand print paths (printCassetteForBlock/printMatrixCassette)
    // already had this wired; batch printing hadn't.
    const patientName = `${caseData.patient.givenNames} ${caseData.patient.familyNames}`.trim();
    Promise.all([
      ...ordinary.map(r => attemptPrintedLabel('cassette', async (printer, gtin, cassetteLabelLayout) => {
        const result = await printCassetteLabel({ ...r, patientName }, printer, gtin, cassetteLabelLayout);
        return result.ok ? { ok: true } : { ok: false, message: (result as { ok: false; message: string }).message };
      })),
      ...matrix.map(r => attemptPrintedLabel('cassette', async (printer, gtin, cassetteLabelLayout) => {
        const result = await printCassetteLabel({
          fullAccession: r.fullAccession, specimenLabel: r.specimenLabels.join(','), blockLabel: r.matrixBlockLabel,
          cassetteId: r.cassetteId, patientName,
        }, printer, gtin, cassetteLabelLayout);
        return result.ok ? { ok: true } : { ok: false, message: (result as { ok: false; message: string }).message };
      })),
    ]).catch(console.error);
    showToast(t('useSpecimenBlockManagement.toast.printingCassetteLabelsForAccession', { count: total, accession: caseData.accession.fullAccession }), 'info', { containsPhi: true });
  }, [caseData, batchPrintBlocked, showToast, attemptPrintedLabel, t]);

  // Real feature, per direct follow-up: "I think I would expect to
  // reprint a slide label but that print icon is for the cassette...
  // perhaps we need a larger modal window to manage reprints at the
  // Req/Container/Cassette and slide level." Same real pattern as the
  // cassette functions immediately above — single and batch share one
  // real implementation, respects the same lab-wide batchPrintBlocked
  // guardrail (a slide label is the same kind of physical, per-item
  // print job as a cassette one, so the same on-demand-only policy
  // applies equally here).
  const printSlideForStain = useCallback((specimenLabel: string, blockLabel: string, level: string, stainName: string) => {
    if (!caseData) return;
    const slideId = slideIdentifier(caseData.accession.fullAccession, specimenLabel, blockLabel, level);
    dispatchSlideLabel({
      fullAccession: caseData.accession.fullAccession,
      specimenLabel, blockLabel, level, stainName, slideId,
    }).catch(console.error);
    // Real, purely additive — see attemptPrintedLabel's own doc
    // comment. Never affects the dispatchSlideLabel engrave-stub call
    // above.
    attemptPrintedLabel('slide', async (printer, gtin, _cassetteLabelLayout) => {
      const result = await printSlideLabel({
        fullAccession: caseData.accession.fullAccession, specimenLabel, blockLabel, level, stainName, slideId,
      }, printer, gtin);
      return result.ok ? { ok: true } : { ok: false, message: (result as { ok: false; message: string }).message };
    }).catch(console.error);
    showToast(t('useSpecimenBlockManagement.toast.printingSlide', { slideId }), 'info', { containsPhi: true });
  }, [caseData, showToast, attemptPrintedLabel, t]);

  const handleBatchPrintSlides = useCallback(() => {
    if (!caseData) return;
    if (batchPrintBlocked) {
      showToast(t('useSpecimenBlockManagement.toast.batchPrintSlideDisabled'), 'warning');
      return;
    }
    const requests = getAllSlideLabelRequests(caseData);
    if (requests.length === 0) {
      showToast(t('useSpecimenBlockManagement.toast.noSlidesToPrint'));
      return;
    }
    Promise.all(requests.map(r => dispatchSlideLabel(r))).catch(console.error);
    // Real, purely additive — same real gap-fix as
    // handleBatchPrintCassettes immediately above; see that function's
    // own comment.
    Promise.all(requests.map(r => attemptPrintedLabel('slide', async (printer, gtin, _cassetteLabelLayout) => {
      const result = await printSlideLabel(r, printer, gtin);
      return result.ok ? { ok: true } : { ok: false, message: (result as { ok: false; message: string }).message };
    }))).catch(console.error);
    showToast(t('useSpecimenBlockManagement.toast.printingSlideLabelsForAccession', { count: requests.length, accession: caseData.accession.fullAccession }), 'info', { containsPhi: true });
  }, [caseData, batchPrintBlocked, showToast, attemptPrintedLabel, t]);

  useEffect(() => {
    const onPrintCurrent = () => handlePrintCurrentCassette();
    const onBatchPrint = () => handleBatchPrintCassettes();
    window.addEventListener('PATHSCRIBE_PRINT_CURRENT_CASSETTE', onPrintCurrent);
    window.addEventListener('PATHSCRIBE_BATCH_PRINT_CASE_LABELS', onBatchPrint);
    return () => {
      window.removeEventListener('PATHSCRIBE_PRINT_CURRENT_CASSETTE', onPrintCurrent);
      window.removeEventListener('PATHSCRIBE_BATCH_PRINT_CASE_LABELS', onBatchPrint);
    };
  }, [handlePrintCurrentCassette, handleBatchPrintCassettes]);

  // Real fix, per direct follow-up: "Phase 3 — the sibling-
  // propagation confirmation system from a few turns back is still
  // sitting there... it should come out." That system existed to
  // keep N per-specimen HistologyBlock records (tied together by a
  // sharedCassetteId string tag) from drifting out of sync — the
  // real architectural fix (Case.matrixBlocks[], a single tracked
  // asset) made that propagation logic structurally unnecessary, not
  // just unused. Confirmed directly before removing: no seed/mock
  // data anywhere in this app still carries a real sharedCassetteId,
  // so this is a clean removal, not a silent behavior change for any
  // real, persisted case. Back to a direct, single-block update —
  // exactly what this function did before that system existed.
  const handleAdvanceFocusedBlockStatus = useCallback(async () => {
    if (!caseData?.id || !focusedBlockEntry) return;
    const nextStatus: Record<string, BlockStatus> = { Pending: 'Grossed', Grossed: 'Embedded' };
    const newStatus = nextStatus[focusedBlockEntry.block.status];
    if (!newStatus) return; // Embedded/Exhausted are terminal or exception states — not voice-advanceable
    const patchedSpecimens = (caseData.specimens ?? []).map((sp: Specimen) => ({
      ...sp,
      blocks: (sp.blocks ?? []).map((b: HistologyBlock) => b.id === focusedBlockEntry.block.id ? { ...b, status: newStatus } : b),
    }));
    try {
      await caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
      setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);
      markDirty('blockStatus');
    } catch (e) {
      if (handleConcurrencyConflict(e, setConcurrencyConflict)) return;
      console.error('[Grossing] Failed to advance block status:', e);
    }
  }, [caseData, focusedBlockEntry, markDirty, knownVersionRef, setCaseData, setConcurrencyConflict]);

  // Real, per the Protocol-Driven Workflow Infrastructure story's Part
  // 2c — migrated from the old, simple triageConfirmedAt/By stamp
  // (Specimen.ts's own doc comment on the field this superseded) to
  // the new, real SpecimenTriage record. The voice command's own real
  // "confirm triage" convenience is preserved exactly: one action
  // still confirms the whole specimen's triage at once — it just now
  // does so by marking every real checklistItems entry confirmed
  // (rather than a single flat stamp), which is what actually
  // satisfies handleReleaseGrossingBlocks's own real gate below. A
  // real no-op (returns early) when the focused specimen has no
  // SpecimenTriage at all — nothing to confirm.
  const handleConfirmTriage = useCallback(async () => {
    if (!caseData?.id || !focusedBlockEntry) return;
    const specimen = (caseData.specimens ?? []).find((sp: Specimen) => sp.id === focusedBlockEntry.specimenId);
    if (!specimen?.triage) return;
    const nowIso = new Date().toISOString();
    const patchedSpecimens = (caseData.specimens ?? []).map((sp: Specimen) =>
      sp.id !== focusedBlockEntry.specimenId || !sp.triage ? sp : {
        ...sp,
        triage: {
          ...sp.triage,
          checklistItems: sp.triage.checklistItems.map(ci => ({ ...ci, confirmed: true })),
          completedAt: nowIso,
          completedBy: signingUser?.id ?? 'unknown',
        },
      }
    );
    try {
      await caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
      setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);
      markDirty('triageConfirmation');
    } catch (e) {
      if (handleConcurrencyConflict(e, setConcurrencyConflict)) return;
      console.error('[Grossing] Failed to confirm triage:', e);
    }
  }, [caseData, focusedBlockEntry, signingUser, markDirty, knownVersionRef, setCaseData, setConcurrencyConflict]);

  // Real, per the Protocol-Driven Workflow Infrastructure story's Part
  // 2c override workflow (per direct instruction: "ensure the
  // overrideReason field is fast and seamless to fill out... so techs
  // aren't completely stonewalled during edge cases or urgent
  // processing"). A real, required, non-empty reason — never a silent
  // bypass. Sets completedAt/completedBy alongside overrideReason
  // (same real "resolved, one way or another" shape the normal
  // checklist-completion path already produces), so a caller checking
  // "is triage resolved" never needs to check two different fields.
  const handleOverrideTriage = useCallback(async (specimenId: string, reason: string) => {
    if (!caseData?.id || !reason.trim()) return;
    const nowIso = new Date().toISOString();
    const patchedSpecimens = (caseData.specimens ?? []).map((sp: Specimen) =>
      sp.id !== specimenId || !sp.triage ? sp : {
        ...sp,
        triage: { ...sp.triage, overrideReason: reason.trim(), completedAt: nowIso, completedBy: signingUser?.id ?? 'unknown' },
      }
    );
    try {
      await caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
      setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);
      markDirty('triageOverride');
    } catch (e) {
      if (handleConcurrencyConflict(e, setConcurrencyConflict)) return;
      console.error('[Grossing] Failed to override triage:', e);
    }
  }, [caseData, signingUser, markDirty, knownVersionRef, setCaseData, setConcurrencyConflict]);

  // Real, per the Protocol-Driven Workflow Infrastructure story's Part
  // 2c — one real, checkable line item (per direct instruction: "each
  // item checkable individually"). Distinct from handleConfirmTriage
  // above (confirms every item at once, for the voice command) — this
  // is the real, granular Grossing Screen checklist UI's own action.
  const handleConfirmTriageChecklistItem = useCallback(async (specimenId: string, itemIndex: number, confirmed: boolean) => {
    if (!caseData?.id) return;
    const patchedSpecimens = (caseData.specimens ?? []).map((sp: Specimen) => {
      if (sp.id !== specimenId || !sp.triage) return sp;
      const checklistItems = sp.triage.checklistItems.map((ci, i) => i === itemIndex ? { ...ci, confirmed } : ci);
      const allConfirmed = checklistItems.every(ci => ci.confirmed);
      return {
        ...sp,
        triage: {
          ...sp.triage,
          checklistItems,
          completedAt: allConfirmed ? new Date().toISOString() : undefined,
          completedBy: allConfirmed ? (signingUser?.id ?? 'unknown') : undefined,
        },
      };
    });
    try {
      await caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
      setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);
      markDirty('triageChecklist');
    } catch (e) {
      if (handleConcurrencyConflict(e, setConcurrencyConflict)) return;
      console.error('[Grossing] Failed to update triage checklist item:', e);
    }
  }, [caseData, signingUser, markDirty, knownVersionRef, setCaseData, setConcurrencyConflict]);

  // ── Generic block update — the manual Block/Stain editor ────────────────────
  // Distinct from handleAdvanceFocusedBlockStatus above, which only ever
  // cycles the *focused* block one status forward for voice commands.
  // This applies any change (status, priority override, stains) to any
  // specific block by id, for the actual visual editor at the bench —
  // there was no way to hand-edit a block at all before this, only
  // auto-generation at accession time and one-step voice advancement.
  const handleUpdateBlock = useCallback(async (specimenId: string, blockId: string, changes: Partial<HistologyBlock>) => {
    if (!caseData?.id) return;
    // Real fix, per direct follow-up: "what will happen if two
    // transaction happen at the same time?" Reads caseDataRef.current
    // (the genuinely latest specimens) rather than the caseData
    // parameter this callback closed over — the same stale-snapshot
    // risk as this hook's own two-phase optimistic block flow (see
    // caseDataRef's own top-level comment), and a real one here
    // specifically: the new optimistic stain flow calls onUpdateBlock
    // twice from the same, already-running handler (once immediately,
    // once ~400ms later once the real request resolves) — the second
    // call must not silently revert whatever changed on the case,
    // including the first call's own update, in between.
    const currentSpecimens = caseDataRef.current?.specimens ?? caseData.specimens ?? [];

    // Real feature, per direct follow-up: "Is the discrepancy being
    // tracked in the Quality Assurance Module?" It wasn't — only a
    // computed badge on the Material tree, no real QA record. Fires
    // exactly once, at the real moment a genuine mismatch is
    // confirmed (this call is specifically the embedding-confirmation
    // one — see BlockStainEditorModal.tsx's own embedCountPrompt),
    // raising a real, tracked SpecimenDeficiency through the same,
    // existing, ISO 15189-aligned engine every other real deficiency
    // in this app already uses — not a second, parallel QA mechanism.
    // Fire-and-forget: a QA logging failure must never block the real,
    // physical embedding transition itself from completing.
    if (changes.pieceCountAtEmbedding != null) {
      const sp = currentSpecimens.find((s: Specimen) => s.id === specimenId);
      const block = sp?.blocks?.find((b: HistologyBlock) => b.id === blockId);
      if (block && typeof block.pieceCount === 'number' && block.pieceCount !== changes.pieceCountAtEmbedding) {
        specimenDeficiencyService.raise({
          caseId: caseData.id,
          specimenId,
          specimenLabel: sp?.label,
          deficiencyTypeId: 'def-tissue-discrepancy',
          comment: `Block ${sp?.label ?? ''}${block.label}: ${block.pieceCount} piece${block.pieceCount === 1 ? '' : 's'} recorded at grossing, ${changes.pieceCountAtEmbedding} observed at embedding.`,
          raisedBy: signingUser?.id ?? 'unknown',
        }).catch(err => console.error('[Grossing] Failed to raise Tissue Discrepancy deficiency:', err));
      }
    }

    // Real feature, per direct follow-up: "Audit Trail Tracking: Log
    // the exact moment the foreign 2D barcode was scanned and bound
    // to the internal CaseID to maintain strict chain-of-custody
    // compliance." Real bug caught before this ever ran: the UI
    // commits externalId and externalIdSource as two SEPARATE field
    // edits (one onBlur per input), never together in one `changes`
    // object — a naive "both present in changes" check would never
    // fire. This instead compares the real, merged pre/post state
    // (falling back to the record's own existing value for whichever
    // field this particular call doesn't touch) and fires exactly
    // once: the moment the pair genuinely becomes complete, or the
    // id itself changes on an already-complete pair — never on a
    // partial edit, and never twice for the same real binding,
    // regardless of which field the tech happened to fill in first.
    if (changes.externalId !== undefined || changes.externalIdSource !== undefined) {
      const sp = currentSpecimens.find((s: Specimen) => s.id === specimenId);
      const block = sp?.blocks?.find((b: HistologyBlock) => b.id === blockId);
      if (block) {
        const mergedExternalId = changes.externalId !== undefined ? changes.externalId : block.externalId;
        const mergedExternalIdSource = changes.externalIdSource !== undefined ? changes.externalIdSource : block.externalIdSource;
        const wasComplete = !!block.externalId && !!block.externalIdSource;
        const isNowComplete = !!mergedExternalId && !!mergedExternalIdSource;
        if (isNowComplete && (!wasComplete || mergedExternalId !== block.externalId)) {
          mockAuditService.logEvent({
            type: 'system',
            event: 'Foreign ID Bound',
            detail: `Block ${sp?.label ?? ''}${block.label} bound to foreign id "${mergedExternalId}" (source: ${mergedExternalIdSource}).`,
            user: signingUser?.id ?? 'unknown',
            caseId: caseData.id,
            confidence: null,
          }).catch(err => console.error('[Grossing] Failed to log Foreign ID Bound audit entry:', err));
        }
      }
    }

    const patchedSpecimens = currentSpecimens.map((sp: Specimen) => ({
      ...sp,
      blocks: (sp.blocks ?? []).map((b: HistologyBlock) => b.id === blockId ? { ...b, ...changes } : b),
    }));
    try {
      await caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
      setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);
      markDirty('blockEdit');
    } catch (e) {
      if (handleConcurrencyConflict(e, setConcurrencyConflict)) return;
      console.error('[Grossing] Failed to update block:', e);
    }
  }, [caseData, markDirty, knownVersionRef, setCaseData, setConcurrencyConflict, signingUser]);

  // Real feature, per direct confirmation: "what happens is when the
  // wrong piece gets into the wrong block" — corrects a genuine
  // mis-assignment error, not withdrawal of an unfulfilled order.
  // Grounded explicitly in CAP ANP.11600, CLIA 493.1105, and ISO
  // 15189:2012 5.8 per direct confirmation of the required workflow:
  // create → cancel with a required reason → automatically removed
  // from active workflow → audit trail retained permanently.
  //
  // Sets status to 'Cancelled' rather than deleting the record, so
  // the mistake and its correction stay visible as real history —
  // same "keep the record, change its state" posture as Biopsy
  // Array's own unlink behavior. Sends a real LIS order (unlike
  // handleUpdateBlock above, which has no LIS side-effect at all) —
  // cancelling tells the lab not to process this block, a genuine
  // physical-world action. Also clears any Biopsy Array membership —
  // a cancelled block no longer represents valid tissue at that
  // position, so it shouldn't still occupy a slot in the array
  // diagram.
  //
  // Cascade-cancels every stain order still in a non-terminal state
  // (anything short of Coverslipped/Ready for Review/QC Failed) —
  // this IS the concrete "what downstream actions were prevented"
  // record the spec calls for: each affected stain's own status
  // becoming 'Cancelled' documents exactly what processing this
  // stopped. A stain that already finished (coverslipped, reviewed,
  // or already failed QC) is real, completed lab work — cancelling
  // the block doesn't retroactively undo work that already happened.
  const handleCancelBlock = useCallback(async (specimenId: string, blockId: string, reason: string) => {
    if (!caseData?.id || !reason.trim()) return;
    const specimens = caseData.specimens ?? [];
    const sp = specimens.find((s: Specimen) => s.id === specimenId);
    const block = sp?.blocks?.find(b => b.id === blockId);
    if (!sp || !block) return;

    showToast(t('useSpecimenBlockManagement.toast.sendingCancellationToLis'));
    const result = await sendMaterialOrderToLis({ kind: 'cancel', specimenId, label: block.label });
    if (!result.ok) {
      showToast(t('useSpecimenBlockManagement.toast.lisNoAckCancellation'), 'warning');
      return;
    }

    // PS-71 (Batch 458): the change lives in blockCaseChanges.cancelBlockChange
    // and is re-applied to the newest case on a conflict (was: re-saved
    // without a version, overwriting the other person's change).
    const change = cancelBlockChange({ specimenId, blockId, reason, cancelledBy: signingUser?.id ?? 'unknown', cancelledAt: new Date().toISOString() });
    const firstUpdates = change(caseData);
    if (!firstUpdates) return;
    setCaseData(prev => prev ? ({ ...prev, ...firstUpdates } as typeof prev) : prev);
    const saved = await persistBlockChange(caseData.id, firstUpdates, change, { specimens }, '[Grossing] Failed to save block cancellation:');
    if (saved === 'notSaved') return;
    if (saved === 'merged') showToast(t('useSpecimenBlockManagement.toast.unsavedChangesCancellation'), 'warning');
    markDirty('blocks');
    showToast(t('useSpecimenBlockManagement.toast.blockCancelled', { label: `${sp.label}${block.label}` }));
  }, [caseData, signingUser, sendMaterialOrderToLis, markDirty, showToast, setCaseData, persistBlockChange, t]);

  // Real feature, per direct confirmation: "Create Spare Slide —
  // Generates a new slide ID, links to block, no stain assigned
  // yet." Deliberately NO LIS call — a spare documents a slide that
  // was ALREADY physically cut (a tech, already at the microtome
  // for other reasons, opportunistically cuts an extra unstained
  // section "just in case," per direct confirmation: "They just
  // pickup the unstained slide and stain it"). Nothing new happens
  // in the physical world at creation time, so there is nothing for
  // the LIS to be told yet — that happens at handleOrderRestain
  // below, which is the real trigger.
  const handleCreateSpareSlide = useCallback(async (specimenId: string, blockId: string) => {
    if (!caseData?.id) return;
    const specimens = caseData.specimens ?? [];
    const sp = specimens.find((s: Specimen) => s.id === specimenId);
    const block = sp?.blocks?.find(b => b.id === blockId);
    if (!sp || !block) return;

    const newSpare: StainOrder = {
      id: `stain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      stainName: UNSTAINED_LABEL,
      // Real feature, per direct confirmation: the physical cutting
      // already happened — that's the whole point of a spare (a
      // tech, already at the microtome, opportunistically cuts an
      // extra section "just in case"). 'Cut & Placed' is the
      // correct, honest status: cut and on a slide, just not yet
      // stained. Not 'Pending Cut', which would incorrectly say the
      // cutting itself hasn't happened.
      status: 'Cut & Placed',
    };
    const patchedSpecimens = specimens.map((s: Specimen) =>
      s.id !== specimenId ? s : {
        ...s,
        blocks: (s.blocks ?? []).map((b: HistologyBlock) =>
          b.id === blockId ? { ...b, stains: [...b.stains, newSpare] } : b
        ),
      }
    );
    setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);
    try {
      await caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
    } catch (e) {
      if (handleConcurrencyConflict(e, setConcurrencyConflict)) return;
      console.error('[Grossing] Failed to create spare slide:', e);
      return;
    }
    markDirty('blocks');
    showToast(t('useSpecimenBlockManagement.toast.spareSlideAdded', { label: `${sp.label}${block.label}` }));
  }, [caseData, markDirty, showToast, knownVersionRef, setCaseData, setConcurrencyConflict, t]);

  // Real feature, per direct confirmation: "Order Restain — Converts
  // spare → staining workflow. Captures reason... Logs who ordered
  // it." "Never delete restains... not be merged with or overwrite
  // the original slide." THIS is the real physical-world trigger —
  // unlike handleCreateSpareSlide above, this sends a real LIS
  // order, since it's the moment the lab is actually told which
  // stain to apply.
  //
  // Real feature, per direct confirmation: "we need a stain order
  // called Unstained which is the only stain that can technically be
  // restained on the same label." Enforced here, in one place,
  // rather than relying on every caller to pass the right mode: the
  // target slide's OWN current stainName decides what happens —
  //   - UNSTAINED_LABEL: a real, physical spare, cut and never
  //     stained — converts in place (same slide id). This is the
  //     efficient path: "saves them from a recut later," per direct
  //     confirmation.
  //   - any real stain name: already went through real staining —
  //     converting it would overwrite completed lab work, which is
  //     exactly what must never happen. A genuinely new StainOrder is
  //     created instead, restainOfSlideId pointing back at the
  //     original — which is never touched.
  const handleOrderRestain = useCallback(async (
    specimenId: string,
    blockId: string,
    params: { targetSlideId: string; stainName: string; reason: string },
  ) => {
    if (!caseData?.id || !params.stainName.trim() || !params.reason.trim()) return;
    const specimens = caseData.specimens ?? [];
    const sp = specimens.find((s: Specimen) => s.id === specimenId);
    const block = sp?.blocks?.find(b => b.id === blockId);
    const targetSlide = block?.stains.find(st => st.id === params.targetSlideId);
    if (!sp || !block || !targetSlide) return;
    const isConvertingSpare = targetSlide.stainName === UNSTAINED_LABEL;

    showToast(t('useSpecimenBlockManagement.toast.sendingRestainToLis'));
    const result = await sendMaterialOrderToLis({ kind: 'restain', specimenId, label: `${block.label}: ${params.stainName}` });
    if (!result.ok) {
      showToast(t('useSpecimenBlockManagement.toast.lisNoAckRestain'), 'warning');
      return;
    }

    // PS-71 (Batch 458): blockCaseChanges.orderRestainChange, re-applied
    // to the newest case on a conflict (was: re-saved without a version).
    // The target slide's own current stain still decides convert-in-place
    // vs a new linked slide, in whichever case the change is applied to.
    const change = orderRestainChange({
      specimenId, blockId, targetSlideId: params.targetSlideId, stainName: params.stainName, reason: params.reason,
      orderedBy: signingUser?.id ?? 'unknown', orderedAt: new Date().toISOString(),
      newSlideId: `stain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, unstainedLabel: UNSTAINED_LABEL,
    });
    const firstUpdates = change(caseData);
    if (!firstUpdates) return;
    setCaseData(prev => prev ? ({ ...prev, ...firstUpdates } as typeof prev) : prev);
    const saved = await persistBlockChange(caseData.id, firstUpdates, change, { specimens }, '[Grossing] Failed to save restain order:');
    if (saved === 'notSaved') return;
    if (saved === 'merged') showToast(t('useSpecimenBlockManagement.toast.unsavedChangesRestain'), 'warning');
    markDirty('blocks');
    showToast(
      isConvertingSpare
        ? t('useSpecimenBlockManagement.toast.restainOrderedSpare')
        : t('useSpecimenBlockManagement.toast.restainOrderedNewSlide', { stainName: params.stainName.trim() })
    );
  }, [caseData, signingUser, sendMaterialOrderToLis, markDirty, showToast, setCaseData, persistBlockChange, t]);

  // Real replacement for Add Orders' old "Blocks/Recut" tab — appends
  // an actual HistologyBlock to specimen.blocks (what the Material tree
  // reads from), not the old cassette_key/total_cassettes free-text
  // fields on the grossing report, which the tree never read and would
  // have made a new block invisible in the tree that triggered adding it.
  const handleAddBlock = useCallback(async (specimenId: string) => {
    if (!caseData) return;
    const specimens = caseData.specimens ?? [];
    const sp = specimens.find((s: Specimen) => s.id === specimenId);
    if (!sp) return;

    // Real feature, per direct research: "Barcode Scan Verification...
    // to close the loop." Soft guardrail only — see this hook's own
    // useCassetteScanVerification import and that file's header
    // comment for why this warns rather than blocks. A real,
    // unverified prior cassette doesn't stop a new one from being
    // added; it's flagged so the accessioner knows to go back and
    // scan it.
    if (hasUnverifiedPendingCassette(printSettings?.requireScanVerificationBeforeNextBlock ?? false) && pendingVerification) {
      showToast(t('useSpecimenBlockManagement.toast.cassetteReminderUnscanned', { label: `${pendingVerification.specimenLabel}${pendingVerification.blockLabel}` }), 'warning');
    }

    const existingBlocks = sp.blocks ?? [];
    const nextNumber = existingBlocks.length + 1;
    const blockLabel = String(nextNumber);
    const newBlockId = `blk-${specimenId}-${Date.now().toString(36)}`;
    const fullAccession = caseData.accession?.fullAccession;

    // Real feature, per direct follow-up describing the real
    // grossing-station workflow: "Context & Protocol Resolution...
    // Required cassette media attributes." Real, first production
    // wiring of resolveBlockCassetteColor.ts — same real pattern as
    // handleAddDecant's own resolveDecantCassetteColor call.
    const specimenProtocolId = await resolveProtocolIdForSpecimen(sp.specimenDictionaryEntryId);
    const cassetteColorId = await resolveBlockCassetteColor({ protocolId: specimenProtocolId, priority: caseData.order?.priority });

    // Real feature, per direct follow-up on the Hybrid Request-Driven
    // Workflow spec: "Optimistic / 'Pending' State: When a pathologist
    // adds an IHC or Recut in PathScribe, render it immediately in the
    // Material tree with a clear visual badge." Previously this
    // awaited the (simulated) LIS round-trip BEFORE the block ever
    // appeared at all — pessimistic, and increasingly sluggish-feeling
    // the longer a real LIS's actual latency is. Now appears
    // immediately as 'pending', confirmed or flagged 'rejected' in
    // place once the real request resolves — never silently removed
    // on rejection, per the spec's own "flag the item with a clear
    // alert" instruction.
    const newBlock: HistologyBlock = {
      id: newBlockId,
      label: blockLabel,
      status: 'Grossed',
      // Real feature, per direct confirmation: every new block
      // defaults to a real, pending H&E stain order — the universal,
      // standard first stain for any new tissue block in real
      // practice, not something a PA should have to add manually
      // every single time.
      stains: [{
        id: `stain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, stainName: 'H&E', status: 'Pending Cut',
        // Real feature, per direct follow-up on unique material
        // identification — see HistologyBlock.displayId's own doc
        // comment for the full reasoning.
        displayId: fullAccession ? slideIdentifier(fullAccession, sp.label, blockLabel, 'L1') : undefined,
      }],
      lisRequestStatus: 'pending',
      displayId: fullAccession ? cassetteIdentifier(fullAccession, sp.label, blockLabel) : undefined,
      cassetteColorId,
    };

    // ── Phase 1: optimistic add, visible immediately as 'pending' ──
    const optimisticSpecimens = specimens.map((s: Specimen) =>
      s.id === specimenId ? { ...s, blocks: [...existingBlocks, newBlock] } : s
    );
    setCaseData({ ...caseData, specimens: optimisticSpecimens, updatedAt: new Date().toISOString() });
    // PS-71 (Batch 458): on a conflict the new block is appended to the
    // newest case and saved with its version (was: re-saved without a
    // version, overwriting the other person's change). If it can't be
    // saved, the optimistic block is taken back out and the LIS is never
    // asked for it.
    const addChange = appendBlockChange(specimenId, newBlock);
    const phase1 = await persistBlockChange(caseData.id, { specimens: optimisticSpecimens }, addChange, { specimens }, '[Grossing] Failed to save optimistic block add:');
    if (phase1 === 'notSaved') return;
    markDirty('blocks');
    showToast(t('useSpecimenBlockManagement.toast.blockRequestedAwaitingLis', { label: `${sp.label}${nextNumber}` }));
    if (phase1 === 'merged') {
      showToast(t('useSpecimenBlockManagement.toast.unsavedChangesNewBlock'), 'warning');
    }

    // ── Phase 2: real request, confirm or flag the SAME block in place ──
    const result = await sendMaterialOrderToLis({ kind: 'block_recut', specimenId, label: newBlock.label });
    const finalStatus: 'confirmed' | 'rejected' = result.ok ? 'confirmed' : 'rejected';

    // Functional update — the pathologist may have made other,
    // unrelated edits while this request was in flight; only this
    // one block's own lisRequestStatus should change here, nothing
    // else about the current state gets clobbered.
    const statusChange = setBlockLisStatusChange(specimenId, newBlockId, finalStatus);
    setCaseData(prev => {
      if (!prev) return prev;
      const patched = statusChange(prev);
      return patched ? ({ ...prev, ...patched, updatedAt: new Date().toISOString() } as typeof prev) : prev;
    });
    // Real fix: persist from caseDataRef.current (the genuinely
    // latest specimens at this exact moment), not the Phase-1-era
    // optimisticSpecimens closure — see this hook's own top-level
    // comment on caseDataRef for the real data-loss bug this avoids.
    // PS-71 (Batch 458): on a conflict the LIS answer is re-applied to the
    // newest saved case and saved with its version (was: re-saved without
    // a version). The LIS has already answered, so if it still can't be
    // saved the screen keeps showing the answer and the user is told.
    const phase1Case = { ...caseData, specimens: optimisticSpecimens } as Case;
    const phase2First = (caseDataRef.current && statusChange(caseDataRef.current)) || statusChange(phase1Case);
    if (phase2First) {
      await persistBlockChange(caseData.id, phase2First, statusChange, null, '[Grossing] Failed to persist LIS confirmation status:');
    }

    if (!result.ok) {
      showToast(t('useSpecimenBlockManagement.toast.lisRejectedBlockRecut', { label: `${sp.label}${nextNumber}` }), 'warning');
      return;
    }
    showToast(t('useSpecimenBlockManagement.toast.blockConfirmedByLis', { label: `${sp.label}${nextNumber}` }));

    // Real feature, per direct research: "Single-Click / Triggered
    // Printing: When a Pathologist Assistant grosses Specimen A and
    // generates cassettes A1, A2, and A3, triggering the print action
    // sends jobs sequentially as each cassette/specimen is logged."
    // Fires only for on_demand (the real, researched default) — batch
    // mode defers all printing to an explicit, separate bulk action,
    // not built here. Genuinely fire-and-forget: a real dispatch
    // failure here must never block or roll back a block that's
    // already been successfully created and saved above.
    if (printSettings?.defaultPrintBehavior === 'on_demand') {
      const newCassetteId = cassetteIdentifier(caseData.accession.fullAccession, sp.label, newBlock.label);
      dispatchCassetteLabel({
        fullAccession: caseData.accession.fullAccession,
        specimenLabel: sp.label,
        blockLabel: newBlock.label,
        cassetteId: newCassetteId,
      }).catch(console.error);
      registerPendingVerification({ cassetteId: newCassetteId, blockLabel: newBlock.label, specimenLabel: sp.label });
    }

    // Real fix, item #28: adding a block never navigated the editor to
    // it - setFocusedBlockIndex already exists and is what the block
    // editor modal reads to know which block to show, it just wasn't
    // being called here. Same flatten order allBlocks itself uses
    // (specimen order, then block order within each specimen), so the
    // computed index is guaranteed to match what allBlocks recomputes
    // to once caseData updates above.
    let flatIndex = 0;
    for (const s of optimisticSpecimens) {
      const idx = (s.blocks ?? []).findIndex((b: HistologyBlock) => b.id === newBlock.id);
      if (idx >= 0) { flatIndex += idx; break; }
      flatIndex += (s.blocks ?? []).length;
    }
    setFocusedBlockIndex(flatIndex);
  }, [caseData, sendMaterialOrderToLis, markDirty, showToast, setCaseData, printSettings, hasUnverifiedPendingCassette, pendingVerification, registerPendingVerification, persistBlockChange, t]);

  // Real feature, per direct follow-up describing the real grossing-
  // station workflow: "Execution Release... Upon confirmation... PA
  // can accept them as-is, adjust the block count... or override the
  // resolved color." This is the real "Release & Print" action for a
  // batch of real, hydrated (cassetteColorId already resolved by
  // hydrateGrossingBlocks.ts), still-'Pending' placeholder blocks —
  // flips each to 'Grossed' and calls the SAME real printCassetteForBlock
  // this hook already exposes for an ordinary, one-at-a-time block
  // (both the engrave stub and, when a station is print-configured,
  // the real printed path) — no second, competing print mechanism.
  //
  // Real, deliberate scope note: these blocks were already created at
  // Accession (generateDefaultMaterial) — this action never sends a
  // new LIS block/recut order, since nothing new is being requested
  // here, only a real, physical release of what the LIS already knows
  // about.
  const handleReleaseGrossingBlocks = useCallback(async (specimenId: string, blockIds: string[]) => {
    if (!caseData?.id || blockIds.length === 0) return;
    const specimens = caseData.specimens ?? [];
    const sp = specimens.find((s: Specimen) => s.id === specimenId);
    if (!sp) return;
    // Real, per the Protocol-Driven Workflow Infrastructure story's
    // Part 2c explicit guardrail (per direct instruction): a specimen
    // with a real, still-open SpecimenTriage record — not every
    // checklist item confirmed, and no override reason recorded —
    // never releases. Real, hard stop server-side, not just a
    // disabled button (GrossingReleasePanel.tsx's own disabled state
    // is the primary UX; this is the real, enforced backstop that
    // can't be bypassed by calling this function directly).
    if (isTriagePending(sp.triage)) {
      showToast(t('useSpecimenBlockManagement.toast.cannotReleaseTriageIncomplete'), 'warning');
      return;
    }
    const blockIdSet = new Set(blockIds);
    const blocksToRelease = (sp.blocks ?? []).filter(b => blockIdSet.has(b.id) && b.status === 'Pending');
    if (blocksToRelease.length === 0) return;

    // PS-71 (Batch 458): blockCaseChanges.releasePendingBlocksChange,
    // re-applied to the newest case on a conflict (was: re-saved without
    // a version). Nothing is printed unless the release was saved.
    const change = releasePendingBlocksChange(specimenId, blockIds);
    const firstUpdates = change(caseData);
    if (!firstUpdates) return;
    setCaseData({ ...caseData, ...firstUpdates, updatedAt: new Date().toISOString() });
    const saved = await persistBlockChange(caseData.id, firstUpdates, change, { specimens }, '[Grossing] Failed to persist block release:');
    if (saved === 'notSaved') return;
    markDirty('blocks');
    showToast(t('useSpecimenBlockManagement.toast.releasingCassettesForPrinting', { count: blocksToRelease.length }));

    for (const b of blocksToRelease) {
      printCassetteForBlock(sp.label, b.label);
    }
  }, [caseData, markDirty, showToast, setCaseData, printCassetteForBlock, persistBlockChange, t]);

  // Real, deliberate sibling to handleReleaseGrossingBlocks — a real
  // 'Pending' placeholder the PA decides isn't actually needed (the
  // gross exam found fewer real pieces than the protocol's own
  // default assumed) is removed outright, never soft-cancelled — it
  // was never physically created, so there's no real, physical
  // cassette to record a cancellation reason against (unlike
  // handleCancelBlock, which is for a real, already-grossed block).
  const handleRemovePendingBlock = useCallback(async (specimenId: string, blockId: string) => {
    if (!caseData?.id) return;
    const specimens = caseData.specimens ?? [];
    const sp = specimens.find((s: Specimen) => s.id === specimenId);
    const block = sp?.blocks?.find(b => b.id === blockId);
    if (!sp || !block || block.status !== 'Pending') return;

    // PS-71 (Batch 458): blockCaseChanges.removePendingBlockChange,
    // re-applied to the newest case on a conflict (was: re-saved without
    // a version). A placeholder someone else released meanwhile is kept.
    const change = removePendingBlockChange(specimenId, blockId);
    const firstUpdates = change(caseData);
    if (!firstUpdates) return;
    setCaseData({ ...caseData, ...firstUpdates, updatedAt: new Date().toISOString() });
    const saved = await persistBlockChange(caseData.id, firstUpdates, change, { specimens }, '[Grossing] Failed to persist placeholder removal:');
    if (saved === 'notSaved') return;
    markDirty('blocks');
    showToast(t('useSpecimenBlockManagement.toast.removedUnreleasedBlock', { label: `${sp.label}${block.label}` }));
  }, [caseData, markDirty, showToast, setCaseData, persistBlockChange, t]);

  // Real feature, per direct follow-up: "Decant has no creation flow
  // at all — the ID scheme is ready for something that doesn't exist
  // yet." Confirmed directly before building: Decant (types/case/
  // Material.ts) has no lisRequestStatus field at all, unlike
  // HistologyBlock — cytology material never goes through the same
  // real LIS order/confirm round-trip a block/recut does, so this is
  // deliberately the simpler, single-phase shape (optimistic add,
  // persist, done) rather than copying handleAddBlock's own two-phase
  // LIS-confirmation flow wholesale for a real workflow this material
  // type doesn't have.
  //
  // Batch 452 (Pete, Oct 4 2026): decant changes go through the case's
  // material store (useCaseMaterialStore → services/material/): shown at
  // once, published as MATERIAL_DECANTED so the billing panel recalculates,
  // saved atomically on the case's current version, and rolled back (with
  // the billing panel) if the save fails. The old path forced a second save
  // without a version after a conflict, overwriting the other person's edit.
  const materialStore = useCaseMaterialStore(caseData, setCaseData as never, knownVersionRef);

  const reportDecantOutcome = useCallback((result: DispatchOutcome, actionName: string) => {
    if (result.ok === true) return true;
    const outcome = result as Extract<DispatchOutcome, { ok: false }>;
    if (outcome.error === 'conflict' && caseData?.id) {
      handleConcurrencyConflict(new ConcurrencyConflictError(caseData.id, knownVersionRef.current, outcome.currentVersion ?? knownVersionRef.current), setConcurrencyConflict, { actionName });
    } else if (outcome.error !== 'superseded') {
      showToast(t(`useSpecimenBlockManagement.toast.decantNotSaved.${decantRefusalKey(outcome.error)}`), 'error');
    }
    return false;
  }, [caseData?.id, knownVersionRef, setConcurrencyConflict, showToast, t]);

  const handleAddDecant = useCallback(async (specimenId: string, decantType: Decant['decantType'], parentDecantId?: string) => {
    if (!caseData || !materialStore) return;
    const specimens = materialStore.getState().specimens as Specimen[];
    const sp = specimens.find((s: Specimen) => s.id === specimenId);
    if (!sp) return;

    const decantLabel = nextDecantLabel(sp.decants);
    const newDecantId = `dcnt-${specimenId}-${Date.now().toString(36)}`;
    const fullAccession = caseData.accession?.fullAccession;

    // Real feature, per direct follow-up: "Additional Requirements for
    // Batch Management: cell blocks... Dedicated Hopper Assignment."
    // evaluateCassetteRouting.ts resolves the cassette colour (Green/Mesh
    // for a cell block) when the decant is created.
    const cassetteColorId = await resolveDecantCassetteColor(decantType, { priority: caseData.order?.priority });

    const newDecant: Decant = {
      id: newDecantId,
      label: decantLabel,
      decantType,
      ...(parentDecantId ? { parentDecantId } : {}),
      stains: [],
      createdAt: new Date().toISOString(),
      createdBy: signingUser?.name,
      // See Decant.displayId's doc comment; same shape as HistologyBlock.displayId.
      displayId: fullAccession ? decantIdentifier(fullAccession, sp.label, decantLabel) : undefined,
      cassetteColorId,
    };

    const outcome = await materialStore.dispatch({ kind: 'add', specimenId, decant: newDecant });
    if (!reportDecantOutcome(outcome, 'add decant')) return;
    markDirty('decants');
    showToast(t('useSpecimenBlockManagement.toast.decantAdded', { label: `${sp.label}${decantLabel}` }));
  }, [caseData, materialStore, markDirty, showToast, signingUser, t, reportDecantOutcome]);

  // Batch 452: removing a decant (none could be removed before). Needs
  // case:decant:delete, checked in the save (caseMaterialService.ts); a
  // decant others were split from can't be removed until they are.
  const handleDeleteDecant = useCallback(async (decantId: string) => {
    if (!materialStore) return;
    const outcome = await materialStore.dispatch({ kind: 'delete', decantId });
    if (!reportDecantOutcome(outcome, 'delete decant')) return;
    markDirty('decants');
    showToast(t('useSpecimenBlockManagement.toast.decantRemoved'));
  }, [materialStore, markDirty, showToast, t, reportDecantOutcome]);

  // Real feature, per direct follow-up: "decant-level linking UI. In
  // the same UI we add specimens, blocks stains, protocols?" Real,
  // genuine gap found while answering that question — handleAddDecant
  // (above) existed and worked, but nothing could ever UPDATE a real
  // decant afterward: no stains, no foreign id, nothing. Mirrors
  // handleUpdateBlock's own exact structure immediately below in this
  // file, simplified — a real Decant has no status/pieceCount
  // lifecycle of its own to guard (see Decant's own type definition,
  // types/case/Material.ts), just its own real stains[] and the same
  // real Foreign ID Bound audit logging.
  const handleUpdateDecant = useCallback(async (specimenId: string, decantId: string, changes: Partial<Decant>) => {
    if (!caseData?.id) return;
    const currentSpecimens = caseDataRef.current?.specimens ?? caseData.specimens ?? [];

    // Same real, merged pre/post-state check as handleUpdateBlock's
    // own identical fix — see that comment for the full reasoning on
    // why a naive "both fields present in one changes object" check
    // isn't enough on its own.
    if (changes.externalId !== undefined || changes.externalIdSource !== undefined) {
      const sp = currentSpecimens.find((s: Specimen) => s.id === specimenId);
      const decant = sp?.decants?.find((d: Decant) => d.id === decantId);
      if (decant) {
        const mergedExternalId = changes.externalId !== undefined ? changes.externalId : decant.externalId;
        const mergedExternalIdSource = changes.externalIdSource !== undefined ? changes.externalIdSource : decant.externalIdSource;
        const wasComplete = !!decant.externalId && !!decant.externalIdSource;
        const isNowComplete = !!mergedExternalId && !!mergedExternalIdSource;
        if (isNowComplete && (!wasComplete || mergedExternalId !== decant.externalId)) {
          mockAuditService.logEvent({
            type: 'system',
            event: 'Foreign ID Bound',
            detail: `Decant ${sp?.label ?? ''}${decant.label} bound to foreign id "${mergedExternalId}" (source: ${mergedExternalIdSource}).`,
            user: signingUser?.id ?? 'unknown',
            caseId: caseData.id,
            confidence: null,
          }).catch(err => console.error('[Grossing] Failed to log Foreign ID Bound audit entry:', err));
        }
      }
    }

    // Batch 452: through the material store (optimistic, evented, rolled back on failure).
    if (!materialStore) return;
    const outcome = await materialStore.dispatch({ kind: 'update', decantId, patch: changes });
    if (reportDecantOutcome(outcome, 'update decant')) markDirty('decantEdit');
  }, [caseData, markDirty, signingUser, materialStore, reportDecantOutcome]);

  // Real feature, per direct confirmation: "I wanted to be able to
  // assign each core to a specific section of a single block... so
  // the Pathologist can always identify what section of the block
  // the core tissue was embedded into." A grossing activity — the PA
  // decides, while grossing, that several specimens' tissue is going
  // into one shared cassette rather than separate ones.
  //
  // Each specimen still gets its OWN HistologyBlock record (same
  // shape handleAddBlock above already creates) — this creates one
  // per selected specimen, all sharing the same new
  // sharedCassetteId, each with its own sequential positionInBlock.
  // Slides/stains keep working exactly as they already do, per
  // specimen — this only adds the shared-block linkage on top.
  // Real, architectural fix, per direct follow-up: "pulling shared
  // blocks out of individual Specimen.blocks arrays into a top-level
  // Case.matrixBlocks[] converts the matrix block into a first-class,
  // single-identity asset across the entire LIS pipeline rather than
  // maintaining fragmented, competing state records on each child
  // specimen." Builds exactly ONE real MatrixBlock (types/case/
  // MatrixBlock.ts) — not one HistologyBlock per participating
  // specimen tagged with a shared string, the prior design this
  // replaces. Each participating specimen gets a lightweight
  // matrixBlockIds reference, never its own competing copy of the
  // block's own real status/location.
  const handleCreateBiopsyArray = useCallback(async (specimenIds: string[], cassetteLabel: string) => {
    if (!caseData || specimenIds.length < 2) return;
    const specimens = caseData.specimens ?? [];
    const targetSpecimens = specimenIds
      .map(id => specimens.find((s: Specimen) => s.id === id))
      .filter((s): s is Specimen => !!s);
    if (targetSpecimens.length < 2) return;

    const fullAccession = caseData.accession?.fullAccession;
    const label = cassetteLabel.trim();
    const matrixBlockId = `mtx-${caseData.id}-${Date.now().toString(36)}`;

    const newMatrixBlock: MatrixBlock = {
      id: matrixBlockId,
      label,
      status: 'Grossed',
      participants: targetSpecimens.map((sp, i) => ({ specimenId: sp.id, positionInBlock: i + 1 })),
      // Real feature, per direct confirmation: same H&E default as
      // handleAddBlock's own ordinary blocks — every new matrix
      // block gets a real, pending H&E stain order, not an empty
      // one. Reuses StainOrder directly — see MatrixBlock.slides's
      // own doc comment for the full reasoning.
      slides: [{
        id: `stain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, stainName: 'H&E', status: 'Pending Cut',
        displayId: fullAccession ? `${matrixBlockIdentifier(fullAccession, label)}-L1` : undefined,
      }],
      createdAt: new Date().toISOString(),
      createdBy: signingUser?.id ?? 'unknown',
    };

    showToast(t('useSpecimenBlockManagement.toast.sendingBiopsyArrayRequestToLis'));
    // Same real-LIS-order posture as handleAddBlock — one order per
    // specimen, all referencing the same cassetteLabel so the LIS
    // side can see they're physically the same block.
    const results = await Promise.all(targetSpecimens.map(sp =>
      sendMaterialOrderToLis({ kind: 'block_recut', specimenId: sp.id, label: cassetteLabel })
    ));
    if (results.some(r => !r.ok)) {
      showToast(t('useSpecimenBlockManagement.toast.lisNoAckBiopsyArrayRequest'), 'warning');
      return;
    }

    // PS-71 (Batch 458): blockCaseChanges.createMatrixBlockChange, re-applied
    // to the newest case on a conflict (was: re-saved without a version,
    // overwriting the other person's change even though the LIS orders
    // had already been acknowledged).
    const change = createMatrixBlockChange(specimenIds, newMatrixBlock);
    const firstUpdates = change(caseData);
    if (!firstUpdates) return;
    setCaseData({ ...caseData, ...firstUpdates, updatedAt: new Date().toISOString() });
    const saved = await persistBlockChange(caseData.id, firstUpdates, change, { specimens, matrixBlocks: caseData.matrixBlocks }, '[Grossing] Failed to save Biopsy Array:');
    if (saved === 'notSaved') return;
    if (saved === 'merged') showToast(t('useSpecimenBlockManagement.toast.unsavedChangesBiopsyArray'), 'warning');
    markDirty('blocks');
    showToast(t('useSpecimenBlockManagement.toast.biopsyArrayCreated', { label: cassetteLabel, count: targetSpecimens.length }));

    // Real feature, per direct follow-up: "primary label printing for
    // matrix blocks." Same real, on-demand-only gating as
    // handleAddBlock's own identical ordinary-block dispatch just
    // above in this file — fires only when the lab's real, configured
    // default is on_demand; batch mode defers all printing to the
    // separate, explicit bulk action (handleBatchPrintCassettes).
    // Genuinely fire-and-forget: a real dispatch failure here must
    // never block or roll back a matrix block that's already been
    // successfully created and saved above.
    if (printSettings?.defaultPrintBehavior === 'on_demand') {
      const matrixCassetteId = matrixBlockIdentifier(fullAccession ?? caseData.id, label);
      dispatchMatrixCassetteLabel({
        fullAccession: fullAccession ?? caseData.id,
        specimenLabels: targetSpecimens.map(sp => sp.label),
        matrixBlockLabel: label,
        cassetteId: matrixCassetteId,
      }).catch(console.error);
      // Same real scan-verification loop as an ordinary block's own
      // dispatch — PendingCassetteVerification is keyed purely on
      // cassetteId, so it works unchanged here; specimenLabel left
      // empty since a matrix block has no single one, so the real
      // reminder toast reads as "Block C1's cassette..." rather than
      // a confusing concatenation of every participant's own label.
      registerPendingVerification({ cassetteId: matrixCassetteId, blockLabel: label, specimenLabel: '' });
    }
  }, [caseData, sendMaterialOrderToLis, markDirty, showToast, setCaseData, signingUser, printSettings, registerPendingVerification, persistBlockChange, t]);

  // Real feature, per direct confirmation: completes the Biopsy Array
  // feature with the edit capability flagged as the one real gap
  // after create-only shipped — "allowing edits of the Biopsy array."
  // Given the FULL desired specimen list (in the order positions
  // should be), diffs it against whichever blocks currently carry
  // this cassetteId across every specimen:
  //   - specimens no longer selected → unlinked (sharedCassetteId/
  //     positionInBlock cleared). The block record itself is kept,
  //     not deleted — nothing about the physical tissue changed, it's
  //     just no longer tracked as part of this shared cassette. It
  //     becomes an ordinary, standalone block, same as any block that
  //     was never part of an array.
  //   - specimens newly selected → get a real new block, same shape
  //     handleCreateBiopsyArray already creates, with a real LIS
  //     order (this is new physical tissue actually going into this
  //     cassette, same posture as create).
  //   - specimens still selected → keep their existing block, just
  //     renumbered to the new position if the order changed.
  // Fewer than 2 specimens in the new selection dissolves the whole
  // array (see handleDissolveBiopsyArray) — an array of 0 or 1 isn't
  // a real array.
  // Real feature, per direct confirmation: completes the Biopsy Array
  // feature with the edit capability flagged as the one real gap
  // after create-only shipped — "allowing edits of the Biopsy array."
  // Real, architectural fix, per direct follow-up: operates on the
  // one, real MatrixBlock record (Case.matrixBlocks[]) directly —
  // matrixBlockId (not a human-typed label) is now the real, stable
  // key. Given the FULL desired specimen list (in the order positions
  // should be), diffs it against the real block's own participants[]:
  //   - specimens no longer selected → their matrixBlockIds reference
  //     removed, AND a real, new, ordinary HistologyBlock created for
  //     them — nothing about the physical tissue changed, it's just
  //     no longer tracked as part of this shared cassette; the
  //     specimen still needs a real block of its own going forward.
  //   - specimens newly selected → get a real matrixBlockIds
  //     reference added, with a real LIS order (this is new physical
  //     tissue actually going into this cassette, same posture as
  //     create).
  //   - specimens still selected → participants[] renumbered to the
  //     new position if the order changed.
  // Fewer than 2 specimens in the new selection dissolves the whole
  // array (see handleDissolveBiopsyArray) — an array of 0 or 1 isn't
  // a real array.
  const handleUpdateBiopsyArray = useCallback(async (matrixBlockId: string, specimenIds: string[]) => {
    if (!caseData) return;
    if (specimenIds.length < 2) {
      await handleDissolveBiopsyArrayRef.current?.(matrixBlockId);
      return;
    }
    const specimens = caseData.specimens ?? [];
    const matrixBlocks = caseData.matrixBlocks ?? [];
    const matrixBlock = matrixBlocks.find(m => m.id === matrixBlockId);
    if (!matrixBlock) return;

    const currentlyLinkedIds = matrixBlock.participants.map(p => p.specimenId);
    const toAdd = specimenIds.filter(id => !currentlyLinkedIds.includes(id));

    if (toAdd.length > 0) {
      showToast(t('useSpecimenBlockManagement.toast.sendingBiopsyArrayUpdateToLis'));
      const targetSpecimens = toAdd.map(id => specimens.find(s => s.id === id)).filter((s): s is Specimen => !!s);
      const results = await Promise.all(targetSpecimens.map(sp =>
        sendMaterialOrderToLis({ kind: 'block_recut', specimenId: sp.id, label: matrixBlock.label })
      ));
      if (results.some(r => !r.ok)) {
        showToast(t('useSpecimenBlockManagement.toast.lisNoAckAddedSpecimens'), 'warning');
        return;
      }
    }

    // Real, honest posture matching the prior toRemove path: "nothing
    // about the physical tissue changed, it's just no longer tracked
    // as part of this shared cassette." A removed specimen gets a real,
    // new, ordinary HistologyBlock of its own (inheriting the matrix
    // block's status); added specimens get linked; participants[] is
    // renumbered from the full specimenIds order, keeping tissueType.
    // PS-71 (Batch 458): all of that is blockCaseChanges.
    // updateMatrixBlockParticipantsChange, re-applied to the newest case on
    // a conflict (was: re-saved without a version).
    const change = updateMatrixBlockParticipantsChange({ matrixBlockId, specimenIds, fullAccession: caseData.accession?.fullAccession });
    const firstUpdates = change(caseData);
    if (!firstUpdates) return;
    setCaseData({ ...caseData, ...firstUpdates, updatedAt: new Date().toISOString() });
    const saved = await persistBlockChange(caseData.id, firstUpdates, change, { specimens, matrixBlocks }, '[Grossing] Failed to save Biopsy Array update:');
    if (saved === 'notSaved') return;
    if (saved === 'merged') showToast(t('useSpecimenBlockManagement.toast.unsavedChangesBiopsyArrayUpdate'), 'warning');
    markDirty('blocks');
    showToast(t('useSpecimenBlockManagement.toast.biopsyArrayUpdated', { label: matrixBlock.label, count: specimenIds.length }));
  }, [caseData, sendMaterialOrderToLis, markDirty, showToast, setCaseData, persistBlockChange, t]);

  // Real feature: a direct, explicit "undo the whole array" action —
  // clearer than editing a selection down to zero. Every specimen
  // currently carrying this cassetteId gets unlinked; each block
  // record itself is kept as an ordinary, standalone block, same
  // "nothing physical changed, just the tracking" posture as removing
  // one specimen in handleUpdateBiopsyArray above.
  // Real feature: a direct, explicit "undo the whole array" action —
  // clearer than editing a selection down to zero. Real, architectural
  // fix, per direct follow-up: every real participant gets a real,
  // new, ordinary HistologyBlock of its own (same "nothing physical
  // changed, just the tracking" posture as handleUpdateBiopsyArray's
  // own toRemove path) and the real MatrixBlock record itself is
  // removed from Case.matrixBlocks — there's no more tagged block
  // record to simply unlink, since the shared cassette was never a
  // per-specimen record to begin with.
  const handleDissolveBiopsyArray = useCallback(async (matrixBlockId: string) => {
    if (!caseData) return;
    const specimens = caseData.specimens ?? [];
    const matrixBlocks = caseData.matrixBlocks ?? [];
    const matrixBlock = matrixBlocks.find(m => m.id === matrixBlockId);
    if (!matrixBlock) return;

    // PS-71 (Batch 458): blockCaseChanges.dissolveMatrixBlockChange (each
    // participant gets an ordinary block back, the matrix block is
    // removed), re-applied to the newest case on a conflict (was: re-saved
    // without a version).
    const change = dissolveMatrixBlockChange({ matrixBlockId, fullAccession: caseData.accession?.fullAccession });
    const firstUpdates = change(caseData);
    if (!firstUpdates) return;
    setCaseData({ ...caseData, ...firstUpdates, updatedAt: new Date().toISOString() });
    const saved = await persistBlockChange(caseData.id, firstUpdates, change, { specimens, matrixBlocks }, '[Grossing] Failed to save Biopsy Array dissolve:');
    if (saved === 'notSaved') return;
    if (saved === 'merged') showToast(t('useSpecimenBlockManagement.toast.unsavedChangesBiopsyArrayDissolve'), 'warning');
    markDirty('blocks');
    showToast(t('useSpecimenBlockManagement.toast.biopsyArrayDissolved', { label: matrixBlock.label }));
  }, [caseData, markDirty, showToast, setCaseData, persistBlockChange, t]);

  // Real, architectural fix, per direct follow-up: "the matrix block
  // itself is the tracked asset." The direct write-path for a real
  // MatrixBlock's own physical properties (status, piece tracking,
  // location) — the single-record analog of handleUpdateBlock above.
  // No sibling-propagation confirmation needed here at all (unlike
  // handleUpdateBlock's own real, live sibling-confirm logic for the
  // legacy sharedCassetteId model) — there's only ever one real
  // record to update, so drift between copies is structurally
  // impossible rather than something to detect and confirm around.
  const handleUpdateMatrixBlock = useCallback(async (matrixBlockId: string, changes: Partial<MatrixBlock>) => {
    if (!caseData?.id) return;
    const currentMatrixBlocks = caseDataRef.current?.matrixBlocks ?? caseData.matrixBlocks ?? [];

    // Real feature, per direct follow-up: "Audit Trail Tracking: Log
    // the exact moment the foreign 2D barcode was scanned and bound
    // to the internal CaseID." Same real, merged pre/post-state check
    // as handleUpdateBlock's own identical fix — see that comment for
    // the full reasoning on why a naive "both fields present in one
    // changes object" check would never fire.
    if (changes.externalId !== undefined || changes.externalIdSource !== undefined) {
      const matrixBlock = currentMatrixBlocks.find(m => m.id === matrixBlockId);
      if (matrixBlock) {
        const mergedExternalId = changes.externalId !== undefined ? changes.externalId : matrixBlock.externalId;
        const mergedExternalIdSource = changes.externalIdSource !== undefined ? changes.externalIdSource : matrixBlock.externalIdSource;
        const wasComplete = !!matrixBlock.externalId && !!matrixBlock.externalIdSource;
        const isNowComplete = !!mergedExternalId && !!mergedExternalIdSource;
        if (isNowComplete && (!wasComplete || mergedExternalId !== matrixBlock.externalId)) {
          mockAuditService.logEvent({
            type: 'system',
            event: 'Foreign ID Bound',
            detail: `Matrix Block ${matrixBlock.label} bound to foreign id "${mergedExternalId}" (source: ${mergedExternalIdSource}).`,
            user: signingUser?.id ?? 'unknown',
            caseId: caseData.id,
            confidence: null,
          }).catch(err => console.error('[Grossing] Failed to log Foreign ID Bound audit entry:', err));
        }
      }
    }

    const patchedMatrixBlocks = currentMatrixBlocks.map(m => m.id === matrixBlockId ? { ...m, ...changes } : m);
    try {
      await caseRouter.updateCase(caseData.id, { matrixBlocks: patchedMatrixBlocks }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
      setCaseData(prev => prev ? ({ ...prev, matrixBlocks: patchedMatrixBlocks } as typeof prev) : prev);
      markDirty('matrixBlockEdit');
    } catch (e) {
      if (handleConcurrencyConflict(e, setConcurrencyConflict)) return;
      console.error('[Grossing] Failed to update matrix block:', e);
    }
  }, [caseData, markDirty, knownVersionRef, setCaseData, setConcurrencyConflict, signingUser]);

  // Real, per direct billing-expert guidance (PS-93): the Array Mapper's
  // own targeted ancillary stain order — sends one real LIS order
  // (carrying the full, explicit targetSpecimenIds set, per direct
  // spec) and appends one new StainOrder to the matrix block's own
  // slides[], with targetSpecimenIds set from that exact same
  // explicit selection. This captures which cores the order was
  // targeted at — deliberately NOT the billing trigger itself; see
  // StainOrder.evaluatedSpecimenIds's own doc comment (types/case/
  // Specimen.ts) for why billing only fires once a pathologist
  // explicitly confirms evaluation at sign-out, and
  // computeMatrixStainBillingUnits (services/billing/codeMapTable.ts)
  // for that real calculation. Reuses handleUpdateMatrixBlock above
  // for the actual write rather than a second, separate mutation path.
  const handleOrderTargetedMatrixStain = useCallback(async (
    matrixBlockId: string,
    targetSpecimenIds: string[],
    stainName: string
  ): Promise<{ ok: boolean }> => {
    if (!caseData?.id || targetSpecimenIds.length === 0) return { ok: false };
    const currentMatrixBlocks = caseDataRef.current?.matrixBlocks ?? caseData.matrixBlocks ?? [];
    const matrixBlock = currentMatrixBlocks.find(m => m.id === matrixBlockId);
    if (!matrixBlock) return { ok: false };

    showToast(t('useSpecimenBlockManagement.toast.sendingStainOrderToLis', { stainName }));
    const result = await sendMaterialOrderToLis({
      kind: 'stain',
      specimenId: targetSpecimenIds[0],
      label: stainName,
      matrixBlockId,
      targetSpecimenIds,
    });
    if (!result.ok) {
      showToast(t('useSpecimenBlockManagement.toast.lisNoAckStainOrder', { stainName }), 'warning');
      return result;
    }

    const newStain: StainOrder = {
      id: `stain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      stainName,
      status: 'Pending Cut',
      targetSpecimenIds,
    };
    await handleUpdateMatrixBlock(matrixBlockId, { slides: [...matrixBlock.slides, newStain] });
    showToast(t('useSpecimenBlockManagement.toast.stainOrderedOnBlock', { stainName, label: matrixBlock.label, count: targetSpecimenIds.length }));
    return result;
  }, [caseData, sendMaterialOrderToLis, showToast, handleUpdateMatrixBlock, t]);

  // Real fix: handleUpdateBiopsyArray needs to call
  // handleDissolveBiopsyArray when the edited selection drops below 2
  // specimens, but both are useCallback-memoized in the same hook —
  // a direct reference would create a circular dependency between the
  // two useCallback declarations. A ref side-steps that cleanly:
  // always points at the latest handleDissolveBiopsyArray without
  // handleUpdateBiopsyArray needing it in its own dependency array.
  const handleDissolveBiopsyArrayRef = useRef(handleDissolveBiopsyArray);
  handleDissolveBiopsyArrayRef.current = handleDissolveBiopsyArray;

  return {
    allBlocks,
    allDecants,
    focusedBlockIndex, setFocusedBlockIndex,
    handlePrintCurrentCassette,
    printCassetteForBlock,
    printMatrixCassette,
    handleBatchPrintCassettes,
    printSlideForStain,
    handleBatchPrintSlides,
    batchPrintBlocked,
    focusedBlockEntry,
    handleAdvanceFocusedBlockStatus,
    handleConfirmTriage,
    handleOverrideTriage,
    handleConfirmTriageChecklistItem,
    handleUpdateBlock,
    handleCancelBlock,
    handleCreateSpareSlide,
    handleOrderRestain,
    handleAddBlock,
    handleReleaseGrossingBlocks,
    handleRemovePendingBlock,
    handleAddDecant,
    handleUpdateDecant,
    handleDeleteDecant,
    materialStore,
    // Real feature, per direct research on scan-verification guardrails
    // — real, inspectable state, so a future UI indicator (e.g. a real
    // "unscanned cassette" badge) can be built against this directly.
    pendingCassetteVerification: pendingVerification,
    handleCreateBiopsyArray,
    handleUpdateBiopsyArray,
    handleDissolveBiopsyArray,
    handleUpdateMatrixBlock,
    handleOrderTargetedMatrixStain,
  };
}
