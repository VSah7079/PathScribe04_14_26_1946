// src/pages/EmbeddingStationPage/hooks/useEmbeddingStation.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-285 (Embedding Station) — the ticket's own "sibling,
// bench-focused workstation" to PS-284's Microtomy Workstation. Same
// real optimistic-update + real persistence shape as
// useMicrotomyWorkstation.ts (wraps embeddingOperations.ts's pure
// functions), plus the exact same real cassette-print dispatch chain
// (station -> printer profile -> gtin/layout from printSettingsService
// -> printCassetteLabel) already proven there and, before that, in
// useSpecimenBlockManagement.ts's own attemptPrintedLabel.
//
// Real, deliberate scope cut, matching PS-284's own stated precedent:
// this resolves a scanned/selected ordinary HistologyBlock only — a
// shared MatrixBlock (cassette spanning multiple specimens) is not yet
// supported here. Kept consistent with PS-284's identical cut rather
// than solved once, ad hoc, in whichever ticket happens to touch it
// first.
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
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveScanStation } from '@/hooks/useEffectiveScanStation';
import { caseRouter } from '@/services/cases/CaseRouter';
import {
  printerProfileService, printSettingsService, scanStationService, specimenDeficiencyService, specimenDictionaryService,
  embeddingCommentMissing, embeddingConfirmMissing, embeddingReprintMissing, parseObservedPieceCount,
} from '@/services';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
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
  specimen: Specimen;
  block: HistologyBlock;
}

export function useEmbeddingStation() {
  const { user } = useAuth();
  const { effectiveStationId } = useEffectiveScanStation();

  const [workItem, setWorkItem] = useState<EmbeddingWorkItem | null>(null);
  const [scanError, setScanError] = useState<EmbeddingMessage | null>(null);
  const requirements = useFieldRequirements('embedding');
  const [dictionaryType, setDictionaryType] = useState<{ type?: string; procedure?: string }>({});
  const versionRef = useRef(0);

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
    // Batch 460: the target is checked first, so a matrix block (no specimen
    // letter) gets "not supported here" rather than "specimen not found".
    if (target.level !== 'block' && target.level !== 'slide') return fail({ key: 'embeddingStation.scanErrors.unsupportedTarget' });
    const specimen = (caseData.specimens ?? []).find(sp => sp.label === specimenLetter);
    if (!specimen) return fail({ key: 'embeddingStation.scanErrors.specimenNotFound' });
    const block = (specimen.blocks ?? []).find(b => b.label === target.blockNumber);
    if (!block) return fail({ key: 'embeddingStation.scanErrors.blockNotFound', values: { block: `${specimen.label}${target.blockNumber}` } });
    versionRef.current = (caseData as unknown as { version?: number }).version ?? 0;
    setWorkItem({ caseData, specimen, block });
    void loadDictionaryType(specimen.specimenDictionaryEntryId);
    return { ok: true };
  }, [loadDictionaryType]);

  const clearWorkItem = useCallback(() => {
    setWorkItem(null);
    setScanError(null);
    setDictionaryType({});
  }, []);

  const persist = useCallback(async (caseData: Case, updatedSpecimen: Specimen): Promise<Specimen> => {
    const updatedSpecimens = (caseData.specimens ?? []).map(sp => sp.id === updatedSpecimen.id ? updatedSpecimen : sp);
    const updatedCaseData = { ...caseData, specimens: updatedSpecimens };
    setWorkItem(prev => {
      if (!prev) return prev;
      const block = updatedSpecimen.blocks?.find(b => b.id === prev.block.id);
      return block ? { caseData: updatedCaseData, specimen: updatedSpecimen, block } : prev;
    });
    try {
      await caseRouter.updateCase(caseData.id, { specimens: updatedSpecimens }, versionRef.current);
      versionRef.current += 1;
    } catch (e) {
      // Real, honest simplification, same posture as
      // useMicrotomyWorkstation.ts's own persist — this bench page is
      // scoped to one physical block at a time; a genuine write
      // collision is logged, not silently hidden, but doesn't block
      // the tech's own next action.
      console.error('[EmbeddingStation] Failed to persist:', e);
    }
    return updatedSpecimen;
  }, []);

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
    const orientation = orientationInstructions ?? block.orientationInstructions ?? '';
    const missing = embeddingConfirmMissing({ observedCount: observedCountText, moldSize: block.moldSize, orientationInstructions: orientation }, requirements);
    if (missing.length > 0) return { ok: false, missing };
    const observedCount = parseObservedPieceCount(observedCountText);
    // The observed count is a locked-required field, so the check above
    // already refuses an unreadable count; this keeps that explicit.
    if (observedCount === null) return { ok: false, missing: ['observedPieceCount'] };
    const expected = block.pieceCount;
    let specimen = workItem.specimen;
    if (orientationInstructions !== undefined && orientationInstructions !== (block.orientationInstructions ?? '')) {
      const withOrientation = setMoldAndOrientation(specimen, block.id, { orientationInstructions });
      if (withOrientation.ok) specimen = withOrientation.specimen;
    }
    const result = confirmPieceCount(specimen, block.id, observedCount);
    if (!result.ok) return { ok: false };
    await persist(workItem.caseData, result.specimen);
    if (typeof expected === 'number' && expected !== observedCount) {
      specimenDeficiencyService.raise({
        caseId: workItem.caseData.id,
        specimenId: workItem.specimen.id,
        specimenLabel: workItem.specimen.label,
        deficiencyTypeId: 'def-tissue-discrepancy',
        comment: `Block ${workItem.specimen.label}${workItem.block.label}: ${expected} piece${expected === 1 ? '' : 's'} recorded at grossing, ${observedCount} observed at embedding.`,
        raisedBy: actor.id,
      }).catch(err => console.error('[EmbeddingStation] Failed to raise Tissue Discrepancy deficiency:', err));
    }
    return { ok: true };
  }, [workItem, persist, actor.id, requirements]);

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
    const result = flagEmbeddingDiscrepancy(workItem.specimen, workItem.block.id, reason, actor.id);
    if (!result.ok) return;
    await persist(workItem.caseData, result.specimen);
    specimenDeficiencyService.raise({
      caseId: workItem.caseData.id,
      specimenId: workItem.specimen.id,
      specimenLabel: workItem.specimen.label,
      deficiencyTypeId: 'def-tissue-discrepancy',
      comment: `Block ${workItem.specimen.label}${workItem.block.label}: flagged at embedding — ${reason}.`,
      raisedBy: actor.id,
    }).catch(err => console.error('[EmbeddingStation] Failed to raise Tissue Discrepancy deficiency:', err));
  }, [workItem, persist, actor.id]);

  const handleSetMoldAndOrientation = useCallback(async (changes: { moldSize?: EmbeddingMoldSize; orientationInstructions?: string }) => {
    if (!workItem) return;
    const result = setMoldAndOrientation(workItem.specimen, workItem.block.id, changes);
    if (result.ok) await persist(workItem.caseData, result.specimen);
  }, [workItem, persist]);

  /** Real, per the spec's own "High-Contrast Visual Alerts: Tiny/
   *  Fragile, Decal Required" toggle badges — reuses the identical
   *  real setBlockAlertFlags PS-284 already built (see this file's
   *  own import comment) rather than a second, parallel toggle. */
  const handleSetAlertFlags = useCallback(async (flags: { tinyTissue?: boolean; fragile?: boolean; requiresDecal?: boolean }) => {
    if (!workItem) return;
    const result = setBlockAlertFlags(workItem.specimen, workItem.block.id, flags);
    if (result.ok) await persist(workItem.caseData, result.specimen);
  }, [workItem, persist]);

  /** Real, per the spec's own "Multi-Cassette / Split-Block Tracking...
   *  to ensure all related cassettes are embedded together." Groups
   *  the current work item's block with one or more sibling block ids
   *  already on this specimen (a tech picks the related cassette(s)
   *  from this specimen's own block list) — never creates a new block,
   *  see groupSplitBlocks's own doc comment. */
  const handleGroupSplitBlocks = useCallback(async (siblingBlockIds: string[]) => {
    if (!workItem) return;
    const result = groupSplitBlocks(workItem.specimen, [workItem.block.id, ...siblingBlockIds]);
    if (result.ok) await persist(workItem.caseData, result.specimen);
  }, [workItem, persist]);

  const splitBlockGroupStatus = workItem ? resolveSplitBlockGroupStatus(workItem.specimen, workItem.block.id) : null;

  const handleAddComment = useCallback(async (text: string): Promise<EmbeddingActionResult> => {
    if (!workItem) return { ok: false };
    const missing = embeddingCommentMissing(text, requirements);
    if (missing.length > 0) return { ok: false, missing };
    const result = addEmbeddingBlockComment(workItem.specimen, workItem.block.id, text, actor.id, actor.name);
    if (!result.ok) return { ok: false };
    await persist(workItem.caseData, result.specimen);
    return { ok: true };
  }, [workItem, persist, actor, requirements]);

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
    const recorded = recordCassetteReprint(workItem.specimen, workItem.block.id, reason as CassetteReprintReason, actor.id);
    if (!recorded.ok) return { ok: false, message: { key: 'embeddingStation.hardware.noBlock' } };
    const specimen = await persist(workItem.caseData, recorded.specimen);
    const block = specimen.blocks?.find(b => b.id === workItem.block.id);
    if (!block) return { ok: false, message: { key: 'embeddingStation.hardware.noBlock' } };

    const ctx = await getPrinterContext();
    if ('error' in ctx) return { ok: false, message: { key: ctx.error } };
    const fullAccession = workItem.caseData.accession?.fullAccession ?? workItem.caseData.id;
    const patientName = `${workItem.caseData.patient.givenNames ?? ''} ${workItem.caseData.patient.familyNames ?? ''}`.trim();
    const result = await printCassetteLabel(
      { fullAccession, specimenLabel: specimen.label, blockLabel: block.label, cassetteId: `${fullAccession}-${specimen.label}${block.label}`, patientName, tissueDescription: block.tissueDescription },
      ctx.printer, ctx.gtin, ctx.layout,
    );
    return result.ok ? { ok: true } : { ok: false, printerMessage: (result as { ok: false; message: string }).message };
  }, [workItem, persist, getPrinterContext, actor.id, requirements]);

  const alertBadges = workItem ? resolveEmbeddingAlertBadges(workItem.block, dictionaryType.type, dictionaryType.procedure) : [];

  return {
    workItem, scanError, resolveScan, clearWorkItem, requirements,
    alertBadges, splitBlockGroupStatus,
    handleConfirmPieceCount, handleFlagDiscrepancy, handleSetMoldAndOrientation, handleSetAlertFlags, handleGroupSplitBlocks,
    handleAddComment, handleReprintCassette,
    effectiveStationId, actor,
  };
}
