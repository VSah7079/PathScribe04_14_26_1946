// src/pages/SlideDistributionStationPage/hooks/useSlideDistributionStation.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-286 (Slide Distribution Station) — third of the PS-284→
// 285→286→287→288 workstation-build sequence. Genuinely different
// shape from useMicrotomyWorkstation.ts/useEmbeddingStation.ts: those
// are single-work-item benches (one block/decant open at a time); this
// is a real continuous-scan QUEUE — a distribution tech scans one
// physical slide after another with no manual interface interaction
// between scans, and every queued slide stays independently actionable
// (assign, check out, flag) rather than replacing the previous one.
//
// Real, deliberate scope note on "Batch Container Recognition"
// ("scanning a rack/tray barcode auto-populates all child slides"):
// confirmed by direct investigation (see this folder's own README) —
// no real rack/tray-to-slide-membership data model exists anywhere in
// this app (HardwareContainer tracks staining racks bound to a whole
// Batch, not individual output slides; WsiScanBatch tracks scanner
// INPUT/OUTPUT, not a pre-scan physical tray). Rather than invent a
// fictional container model, this reuses real, existing data: scanning
// an individual slide barcode queues that one real StainOrder;
// scanning a block/cassette barcode queues every real StainOrder
// already cut from that block — an honest, real form of batch
// recognition bounded by what this app's own data actually models.
//
// Real, deliberate reuse of the exact real print-dispatch chain PS-284
// already proved (station -> supportsPrinting + printer profile ->
// printSettingsService.get() -> printSlideLabel) for the spec's own
// "trigger a replacement label print" exception action.
//
// Batch 402 (PS-359): checkout, scanner routing, flagging an exception and
// reprinting a label check the organisation's Field Requirements (page
// "slideDistribution", services/fieldRequirements/slideDistributionChecks.ts)
// here, so the buttons and the voice commands are held to the same rule. A
// label reprint now needs a reason (Pete). Messages the page shows are
// returned as locale keys (slideDistribution.*), and the scan station comes
// from @/services rather than the mock directly.
//
// Batch 669 (ws-8): every change goes through `commit`, which saves with services/workstationSave/runCaseAction.ts
// (via hooks/useWorkstationSave.ts): retried on a conflict, and a save that still fails shows "Not saved"
// (`saveError`) and reloads the queued slides from the stored case, instead of leaving the change on screen as
// saved. A label reprint is only printed once its reason was saved.
// ─────────────────────────────────────────────────────────────────────────────

import { slideLevelOf, stainAtLevel } from '@/services/material/slideLevels';
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveScanStation } from '@/hooks/useEffectiveScanStation';
import {
  printerProfileService, printSettingsService, userService, subspecialtyService, scanStationService, equipmentService,
  slideCheckoutMissing, scannerLoadMissing, slideExceptionMissing, slideReprintMissing,
} from '@/services';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { useWorkstationSave } from '@/hooks/useWorkstationSave';
import { replaceSpecimenById, type SpecimenOpResult } from '@/services/workstationSave/runCaseAction';
import { printSlideLabel } from '@/utils/labels/printCassetteSlideLabel';
import { resolveMaterialFromScan } from '@/utils/resolveMaterialFromScan';
import { matrixBlockAsSpecimenView, matrixBlockFromSpecimenView } from '@/utils/microtomyOperations';
import { recordStationScan } from '@/services/stationScans/recordStationScan';
import { benchParentItemId } from '@/services/material/materialLineage';
import { blockTypeOf, piecesOf, slideSizeOf, slideFitsHardware } from '@/utils/blockPieceRules';
import type { ItemEndStateMaterial } from '@/services/itemEndStates/IItemEndStateService';
import type { MatrixBlock } from '@/types/case/MatrixBlock';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';
import { DEFAULT_SLIDE_LABEL_LAYOUT, type SlideLabelLayoutConfig } from '@/services/printSettings/IPrintSettingsService';
import type { StaffUser } from '@/services/users/IUserService';
import type { Subspecialty } from '@/services/subspecialties/ISubspecialtyService';
import type { Equipment } from '@/services/equipment/IEquipmentService';
import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock, StainOrder } from '@/types/case/Specimen';
import {
  assignPhysicalSlide, assignScannerSlide, flagSlideException, resolveSlideException, recordLabelReprintRequest,
  resolveSplitDestinationWarning,
} from '@/utils/slideDistributionOperations';
import type { PhysicalAssignment, ScannerAssignment, SlideExceptionReason, SlideLabelReprintReason, SplitDestinationWarning } from '@/utils/slideDistributionOperations';

/** A message for the page to show: a locale key and its values. */
export interface SlideDistributionMessage { key: string; values?: Record<string, string> }

/** The outcome of an action (flat: strictNullChecks is off). */
export interface SlideDistributionActionResult {
  ok: boolean;
  /** Field Requirements still unmet (field ids), when that is why it stopped. */
  missing?: string[];
  /** A message to show, when something else stopped it. */
  message?: SlideDistributionMessage;
  /** A printer's own error text, shown as given. */
  printerMessage?: string;
  /** Batch 669: the change was not saved ("Not saved" is showing on the page, and the slides were reloaded). */
  notSaved?: boolean;
}

export interface SlideQueueItem {
  queueId: string;
  caseData: Case;
  /** For a matrix block's slide, the matrix block's one-block view (label ''). */
  specimen: Specimen;
  block: HistologyBlock;
  stain: StainOrder;
  /** Batch 729 (spec §11.6): set for a slide cut from a matrix block. */
  matrixBlock?: MatrixBlock;
}

/** The queued slide again, from another copy of the case (null when it is gone). */
function queueItemIn(caseData: Case, q: SlideQueueItem): SlideQueueItem | null {
  if (q.matrixBlock) {
    const mb = (caseData.matrixBlocks ?? []).find(m => m.id === q.matrixBlock!.id);
    if (!mb) return null;
    const view = matrixBlockAsSpecimenView(mb);
    const block = (view.blocks ?? [])[0];
    const stain = block?.stains?.find(s => s.id === q.stain.id);
    return block && stain ? { ...q, caseData, specimen: view, block, stain, matrixBlock: mb } : null;
  }
  const specimen = (caseData.specimens ?? []).find(sp => sp.id === q.specimen.id);
  const block = specimen?.blocks?.find(b => b.id === q.block.id);
  const stain = block?.stains?.find(s => s.id === q.stain.id);
  return specimen && block && stain ? { ...q, caseData, specimen, block, stain } : null;
}

export interface ScanException {
  id: string;
  rawScan: string;
  reason: 'Unreadable Barcode' | 'Unassigned Accession';
  timestamp: string;
}

const notInQueue: SlideDistributionActionResult = { ok: false, message: { key: 'slideDistribution.errors.notInQueue' } };
const failed: SlideDistributionActionResult = { ok: false, message: { key: 'slideDistribution.destination.assignFailed' } };
const notSaved: SlideDistributionActionResult = { ok: false, notSaved: true };

function levelLabelFor(stains: StainOrder[], stainId: string): string {
  const idx = stains.findIndex(s => s.id === stainId);
  return slideLevelOf(stains[idx] ?? {}, Math.max(idx, 0));
}

export function useSlideDistributionStation() {
  const { user } = useAuth();
  const { effectiveStationId } = useEffectiveScanStation();

  const [queue, setQueue] = useState<SlideQueueItem[]>([]);
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<SlideDistributionMessage | null>(null);
  const requirements = useFieldRequirements('slideDistribution');
  const [scanExceptions, setScanExceptions] = useState<ScanException[]>([]);
  const [pathologists, setPathologists] = useState<StaffUser[]>([]);
  const [subspecialties, setSubspecialties] = useState<Subspecialty[]>([]);
  // Batch 434: the slide scanners in the Equipment register (the Digital destination picks one).
  const [scanners, setScanners] = useState<Equipment[]>([]);
  const { saveError, saveChange, saveCaseFields } = useWorkstationSave();

  const actor = { id: user?.id ?? 'unknown', name: user?.name ?? user?.id ?? 'unknown' };

  const loadDirectories = useCallback(async () => {
    const [usersRes, subsRes, scannersRes] = await Promise.all([userService.getAll(), subspecialtyService.getAll(), equipmentService.getActive('slide_scanner')]);
    if (usersRes.ok) setPathologists(usersRes.data.filter(u => u.roles.includes('Pathologist') && u.status === 'Active'));
    if (subsRes.ok) setSubspecialties(subsRes.data.filter(s => s.active));
    if (scannersRes.ok) setScanners(scannersRes.data);
  }, []);

  /** Real, per the spec's own "Automatic Routing Logic: pre-populates
   *  default attending/primary reading service for Physical Checkout
   *  from the case's existing LIS assignment." Pure read of the real,
   *  existing case-level fields — never a new, separate assignment
   *  concept. */
  const resolveDefaultRouting = useCallback((caseData: Case): { pathologistId?: string; pathologistName?: string; subspecialtyId?: string } => {
    const subspecialtyId = caseData.subspecialtyId;
    const assignedTo = (caseData as unknown as { assignedTo?: string }).assignedTo;
    if (!assignedTo) return { subspecialtyId };
    const match = pathologists.find(p => p.id === assignedTo);
    return { pathologistId: assignedTo, pathologistName: match ? `${match.firstName} ${match.lastName}` : undefined, subspecialtyId };
  }, [pathologists]);

  const queueId = (caseId: string, blockId: string, stainId: string) => `${caseId}::${blockId}::${stainId}`;

  const enqueue = useCallback((caseData: Case, specimen: Specimen, block: HistologyBlock, stain: StainOrder, matrixBlock?: MatrixBlock) => {
    const id = queueId(caseData.id, block.id, stain.id);
    setQueue(prev => (prev.some(q => q.queueId === id) ? prev : [...prev, { queueId: id, caseData, specimen, block, stain, ...(matrixBlock ? { matrixBlock } : {}) }]));
    return id;
  }, []);

  /** Real, per this file's own header — a slide-barcode scan queues
   *  one real StainOrder; a block/cassette-barcode scan queues every
   *  real StainOrder already cut from that block (the real, honest
   *  scope for "Batch Container Recognition" — see header). Batch 729
   *  (spec §11.6): a matrix block or matrix slide is accepted the same way,
   *  through the matrix block's one-block view. Specimen and decant
   *  scans are still not handled here. */
  const resolveScan = useCallback(async (rawScanValue: string): Promise<SlideDistributionActionResult> => {
    setScanError(null);
    if (!rawScanValue.trim()) return { ok: false };
    const fail = (message: SlideDistributionMessage): SlideDistributionActionResult => { setScanError(message); return { ok: false, message }; };
    const resolved = await resolveMaterialFromScan(rawScanValue);
    if (!resolved) {
      const message: SlideDistributionMessage = { key: 'slideDistribution.scanErrors.notResolved' };
      setScanError(message);
      setScanExceptions(prev => [...prev, { id: `exc-${Date.now().toString(36)}`, rawScan: rawScanValue, reason: 'Unreadable Barcode', timestamp: new Date().toISOString() }]);
      return { ok: false, message };
    }
    const { caseData, specimenLetter, target } = resolved;
    // Batch 729 (spec §11.6): a matrix block's slides, before the specimen lookup (a matrix block has no specimen letter).
    if (target.level === 'matrix_block' || target.level === 'matrix_slide') {
      const mb = (caseData.matrixBlocks ?? []).find(m => m.id === target.matrixBlockId);
      if (!mb) return fail({ key: 'slideDistribution.scanErrors.blockNotFound', values: { block: rawScanValue.trim() } });
      const view = matrixBlockAsSpecimenView(mb);
      const vBlock = (view.blocks ?? [])[0];
      if (target.level === 'matrix_block') {
        const stains = vBlock.stains ?? [];
        if (stains.length === 0) return fail({ key: 'slideDistribution.scanErrors.noSlides', values: { block: mb.label } });
        let first = '';
        stains.forEach((stain, i) => { const id = enqueue(caseData, view, vBlock, stain, mb); if (i === 0) first = id; });
        setActiveQueueId(first);
        return { ok: true };
      }
      const mStain = stainAtLevel(vBlock.stains, target.slideLevel);
      if (!mStain) return fail({ key: 'slideDistribution.scanErrors.slideNotFound', values: { slide: `${mb.label}-${target.slideLevel}` } });
      setActiveQueueId(enqueue(caseData, view, vBlock, mStain, mb));
      return { ok: true };
    }
    const specimen = (caseData.specimens ?? []).find(sp => sp.label === specimenLetter);
    if (!specimen) {
      const message: SlideDistributionMessage = { key: 'slideDistribution.scanErrors.specimenNotFound' };
      setScanError(message);
      setScanExceptions(prev => [...prev, { id: `exc-${Date.now().toString(36)}`, rawScan: rawScanValue, reason: 'Unassigned Accession', timestamp: new Date().toISOString() }]);
      return { ok: false, message };
    }
    if (target.level !== 'block' && target.level !== 'slide') return fail({ key: 'slideDistribution.scanErrors.unsupportedTarget' });
    const block = (specimen.blocks ?? []).find(b => b.label === target.blockNumber);
    if (!block) return fail({ key: 'slideDistribution.scanErrors.blockNotFound', values: { block: `${specimen.label}${target.blockNumber}` } });
    if (target.level === 'block') {
      const stains = block.stains ?? [];
      if (stains.length === 0) return fail({ key: 'slideDistribution.scanErrors.noSlides', values: { block: `${specimen.label}${block.label}` } });
      let firstId = '';
      stains.forEach((stain, i) => { const id = enqueue(caseData, specimen, block, stain); if (i === 0) firstId = id; });
      setActiveQueueId(firstId);
      return { ok: true };
    }
    // target.level === 'slide'
    const stain = stainAtLevel(block.stains, target.slideLevel);
    if (!stain) return fail({ key: 'slideDistribution.scanErrors.slideNotFound', values: { slide: `${specimen.label}${block.label}-${target.slideLevel}` } });
    const id = enqueue(caseData, specimen, block, stain);
    setActiveQueueId(id);
    return { ok: true };
  }, [enqueue]);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(q => q.queueId !== id));
    setActiveQueueId(prev => (prev === id ? null : prev));
  }, []);

  /** The queued slides of `caseData` taken from that copy of the case (an item whose slide is gone is left as it is). */
  const refreshQueueFrom = useCallback((caseData: Case) => {
    setQueue(prev => prev.map(q => (q.caseData.id !== caseData.id ? q : queueItemIn(caseData, q) ?? q)));
  }, []);

  /** Batch 669 (ws-8): applies `op` to the queued slide's specimen, shows the result at once and saves it (retried on a
   *  conflict, the operation re-applied to the newest copy). This station's queue can span several cases, so every
   *  other queued slide of the same case is refreshed too. Returns null when the operation refuses; `saved: false`
   *  when the save failed ("Not saved" is showing and the queue was reloaded from the stored case). */
  const commit = useCallback(async (item: SlideQueueItem, op: (specimen: Specimen) => SpecimenOpResult): Promise<{ saved: boolean; specimen: Specimen } | null> => {
    const local = op(item.specimen);
    if (!local.ok) return null;
    const mbId = item.matrixBlock?.id;
    // Batch 729: a matrix block's slides are saved on Case.matrixBlocks (the view's slides written back).
    const withMatrix = (c: Case, view: Specimen) => (c.matrixBlocks ?? []).map(m => (m.id === mbId ? matrixBlockFromSpecimenView(m, view) : m));
    refreshQueueFrom(mbId
      ? { ...item.caseData, matrixBlocks: withMatrix(item.caseData, local.specimen) }
      : { ...item.caseData, specimens: replaceSpecimenById(item.caseData.specimens, local.specimen) });
    const outcome = mbId
      ? await saveCaseFields(item.caseData.id, current => {
        const mb = (current.matrixBlocks ?? []).find(m => m.id === mbId);
        const res = mb ? op(matrixBlockAsSpecimenView(mb)) : null;
        return res && res.ok ? { matrixBlocks: withMatrix(current, res.specimen) } : null;
      })
      : await saveChange(item.caseData.id, current => {
        const sp = (current.specimens ?? []).find(x => x.id === item.specimen.id);
        const res = sp ? op(sp) : null;
        return res && res.ok ? replaceSpecimenById(current.specimens, res.specimen) : null;
      });
    if (outcome.status === 'saved') {
      refreshQueueFrom(outcome.caseData);
      const again = queueItemIn(outcome.caseData, item);
      return { saved: true, specimen: again?.specimen ?? local.specimen };
    }
    // Not saved: show the stored case, so the tech can redo the change.
    if (outcome.latest) refreshQueueFrom(outcome.latest);
    else refreshQueueFrom(item.caseData);
    return { saved: false, specimen: item.specimen };
  }, [saveChange, saveCaseFields, refreshQueueFrom]);

  /** Batch 729 (spec §7.1): a slide sent on (to a pathologist or a scanner) is "completed" at this station. */
  const recordDistributed = useCallback((item: SlideQueueItem) => {
    const fullAccession = item.caseData.accession?.fullAccession ?? item.caseData.id;
    const level = levelLabelFor(item.block.stains, item.stain.id);
    recordStationScan({
      stationId: effectiveStationId, itemId: item.stain.displayId ?? `${fullAccession}-${item.specimen.label}${item.block.label}-${level}`,
      materialType: item.matrixBlock ? 'matrix_slide' : 'slide', caseAccession: fullAccession,
      userId: actor.id, userName: actor.name, action: 'completed', result: 'ok',
      // Batch 731 (spec §10.4): the block the slide was cut from.
      parentItemId: benchParentItemId(fullAccession, { specimenLabel: item.specimen.label, label: item.block.label, matrixLabel: item.matrixBlock?.label }),
    });
  }, [effectiveStationId, actor.id, actor.name]);

  /** Batch 732 (spec §11): the queued slide's block type, the slide's size, and the block's pieces (the ones the slide
   *  was ordered for, when it names them). */
  const pieceViewFor = useCallback((queueId: string | null) => {
    const item = queue.find(q => q.queueId === queueId);
    if (!item) return null;
    const blockType = item.matrixBlock ? 'matrix' as const : blockTypeOf(item.block);
    const all = item.matrixBlock ? piecesOf(item.matrixBlock, item.caseData.specimens ?? []) : piecesOf(item.block);
    const pieces = item.stain.pieceIds?.length ? all.filter(p => item.stain.pieceIds!.includes(p.id)) : all;
    return { blockType, slideSize: slideSizeOf(item.stain, blockType), pieces };
  }, [queue]);

  /** Batch 731 (spec §10.5): the queued slide, for its end state (ItemEndStatePanel). */
  const endStateItemFor = useCallback((queueId: string | null): { itemId: string; materialType: ItemEndStateMaterial; caseAccession: string } | null => {
    const item = queue.find(q => q.queueId === queueId);
    if (!item) return null;
    const caseAccession = item.caseData.accession?.fullAccession ?? item.caseData.id;
    const level = levelLabelFor(item.block.stains, item.stain.id);
    return { itemId: item.stain.displayId ?? `${caseAccession}-${item.specimen.label}${item.block.label}-${level}`, materialType: item.matrixBlock ? 'matrix_slide' : 'slide', caseAccession };
  }, [queue]);

  const handleAssignPhysical = useCallback(async (id: string, assignment: PhysicalAssignment): Promise<SlideDistributionActionResult> => {
    const item = queue.find(q => q.queueId === id);
    if (!item) return notInQueue;
    const missing = slideCheckoutMissing(assignment, requirements);
    if (missing.length > 0) return { ok: false, missing };
    // Real, per this codebase's own established gotcha (see
    // services/reports/README.md et al.): strictNullChecks: false
    // means a discriminated union doesn't reliably narrow on
    // `if (!result.ok)` — handled with an explicit cast instead.
    const saved = await commit(item, sp => assignPhysicalSlide(sp, item.block.id, item.stain.id, assignment, actor.id));
    if (!saved) return failed;
    if (saved.saved) recordDistributed(item);
    return saved.saved ? { ok: true } : notSaved;
  }, [queue, commit, actor.id, requirements, recordDistributed]);

  const handleAssignScanner = useCallback(async (id: string, assignment: ScannerAssignment): Promise<SlideDistributionActionResult> => {
    const item = queue.find(q => q.queueId === id);
    if (!item) return notInQueue;
    const missing = scannerLoadMissing(assignment, requirements);
    if (missing.length > 0) return { ok: false, missing };
    // Batch 732 (spec §11.1): a large-format slide goes only to a scanner marked as taking large-format slides.
    const scanner = scanners.find(sc => sc.id === assignment.scannerInstrumentId);
    const size = slideSizeOf(item.stain, item.matrixBlock ? 'matrix' : blockTypeOf(item.block));
    if (scanner && !slideFitsHardware(size, scanner)) return { ok: false, message: { key: 'slideDistribution.errors.scannerNotLargeFormat', values: { scanner: scanner.name } } };
    const saved = await commit(item, sp => assignScannerSlide(sp, item.block.id, item.stain.id, assignment, actor.id));
    if (!saved) return failed;
    if (saved.saved) recordDistributed(item);
    return saved.saved ? { ok: true } : notSaved;
  }, [queue, commit, actor.id, requirements, recordDistributed, scanners]);

  const handleFlagException = useCallback(async (id: string, reason: SlideExceptionReason, note?: string): Promise<SlideDistributionActionResult> => {
    const item = queue.find(q => q.queueId === id);
    if (!item) return notInQueue;
    const missing = slideExceptionMissing(note, requirements);
    if (missing.length > 0) return { ok: false, missing };
    const saved = await commit(item, sp => flagSlideException(sp, item.block.id, item.stain.id, reason, actor.id, note?.trim() || undefined));
    if (!saved) return { ok: false };
    return saved.saved ? { ok: true } : notSaved;
  }, [queue, commit, actor.id, requirements]);

  const handleResolveException = useCallback(async (id: string) => {
    const item = queue.find(q => q.queueId === id);
    if (!item) return;
    await commit(item, sp => resolveSlideException(sp, item.block.id, item.stain.id, actor.id));
  }, [queue, commit, actor.id]);

  const getPrinterContext = useCallback(async (): Promise<{ printer: PrinterProfile; gtin: string; layout: SlideLabelLayoutConfig } | { error: string }> => {
    if (!effectiveStationId) return { error: 'slideDistribution.errors.noStation' };
    const stationRes = await scanStationService.getById(effectiveStationId);
    if (!stationRes.ok) return { error: 'slideDistribution.errors.stationNotFound' };
    if (!stationRes.data.supportsPrinting || !stationRes.data.cassetteSlidePrinterProfileId) {
      return { error: 'slideDistribution.errors.notConfigured' };
    }
    const printerRes = await printerProfileService.getById(stationRes.data.cassetteSlidePrinterProfileId);
    if (!printerRes.ok || !printerRes.data) return { error: 'slideDistribution.errors.profileMissing' };
    const settingsRes = await printSettingsService.get();
    const gtin = settingsRes.ok ? settingsRes.data.gs1Gtin : '';
    // Batch 669 (ws-14): the configured slide label layout travels with the printer, as on the Microtome workstation.
    const layout = settingsRes.ok ? settingsRes.data.slideLabelLayout ?? DEFAULT_SLIDE_LABEL_LAYOUT : DEFAULT_SLIDE_LABEL_LAYOUT;
    return { printer: printerRes.data, gtin, layout };
  }, [effectiveStationId]);

  /** Real, per the spec's own "trigger a replacement label print"
   *  exception action — records the real, audited request
   *  (recordLabelReprintRequest) then dispatches the actual print
   *  through the identical real GS1/ZPL path PS-284's Microtome
   *  Workstation already proved. */
  const handleRequestReprint = useCallback(async (id: string, reason: SlideLabelReprintReason | ''): Promise<SlideDistributionActionResult> => {
    const item = queue.find(q => q.queueId === id);
    if (!item) return notInQueue;
    const missing = slideReprintMissing(reason, requirements);
    if (missing.length > 0) return { ok: false, missing };
    const recorded = await commit(item, sp => recordLabelReprintRequest(sp, item.block.id, item.stain.id, actor.id, reason as SlideLabelReprintReason));
    if (!recorded) return { ok: false, missing: ['reprintReason'] };
    // The reason is saved before a replacement label is printed; nothing is printed for an unsaved change.
    if (!recorded.saved) return notSaved;
    const specimen = recorded.specimen;
    const block = specimen.blocks?.find(b => b.id === item.block.id);
    const stain = block?.stains.find(s => s.id === item.stain.id);
    if (!block || !stain) return notInQueue;

    const ctx = await getPrinterContext();
    if ('error' in ctx) return { ok: false, message: { key: ctx.error } };
    const fullAccession = item.caseData.accession?.fullAccession ?? item.caseData.id;
    const level = levelLabelFor(block.stains, stain.id);
    const slideId = stain.displayId ?? `${specimen.label}${block.label}-${level}`;
    const result = await printSlideLabel(
      { fullAccession, specimenLabel: specimen.label, blockLabel: block.label, level, stainName: stain.stainName, slideId, slideDesignation: item.caseData.labelStyle?.slide },
      ctx.printer, ctx.gtin, ctx.layout,
    );
    return result.ok ? { ok: true } : { ok: false, printerMessage: (result as { ok: false; message: string }).message };
  }, [queue, commit, getPrinterContext, actor.id, requirements]);

  const splitDestinationWarningFor = useCallback((id: string): SplitDestinationWarning | null => {
    const item = queue.find(q => q.queueId === id);
    if (!item) return null;
    return resolveSplitDestinationWarning(item.specimen, item.block.id);
  }, [queue]);

  return {
    endStateItemFor, pieceViewFor,
    queue, activeQueueId, setActiveQueueId, scanError, saveError, scanExceptions, resolveScan, removeFromQueue, requirements,
    pathologists, subspecialties, scanners, loadDirectories, resolveDefaultRouting,
    handleAssignPhysical, handleAssignScanner, handleFlagException, handleResolveException, handleRequestReprint,
    splitDestinationWarningFor, effectiveStationId, actor,
  };
}
