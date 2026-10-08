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
// ─────────────────────────────────────────────────────────────────────────────

import { slideLevelOf, stainAtLevel } from '@/services/material/slideLevels';
import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveScanStation } from '@/hooks/useEffectiveScanStation';
import { caseRouter } from '@/services/cases/CaseRouter';
import {
  printerProfileService, printSettingsService, userService, subspecialtyService, scanStationService, equipmentService,
  slideCheckoutMissing, scannerLoadMissing, slideExceptionMissing, slideReprintMissing,
} from '@/services';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { printSlideLabel } from '@/utils/labels/printCassetteSlideLabel';
import { resolveMaterialFromScan } from '@/utils/resolveMaterialFromScan';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';
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
}

export interface SlideQueueItem {
  queueId: string;
  caseData: Case;
  specimen: Specimen;
  block: HistologyBlock;
  stain: StainOrder;
}

export interface ScanException {
  id: string;
  rawScan: string;
  reason: 'Unreadable Barcode' | 'Unassigned Accession';
  timestamp: string;
}

const notInQueue: SlideDistributionActionResult = { ok: false, message: { key: 'slideDistribution.errors.notInQueue' } };
const failed: SlideDistributionActionResult = { ok: false, message: { key: 'slideDistribution.destination.assignFailed' } };

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
  const versionsRef = useRef<Map<string, number>>(new Map());

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

  const enqueue = useCallback((caseData: Case, specimen: Specimen, block: HistologyBlock, stain: StainOrder) => {
    const id = queueId(caseData.id, block.id, stain.id);
    setQueue(prev => (prev.some(q => q.queueId === id) ? prev : [...prev, { queueId: id, caseData, specimen, block, stain }]));
    return id;
  }, []);

  /** Real, per this file's own header — a slide-barcode scan queues
   *  one real StainOrder; a block/cassette-barcode scan queues every
   *  real StainOrder already cut from that block (the real, honest
   *  scope for "Batch Container Recognition" — see header). Other scan
   *  targets (matrix_*, specimen, decant*) aren't supported here yet,
   *  same documented-scope-cut posture as PS-285's own block/slide-only
   *  resolution. */
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

  /** Real, same real persistence shape as useEmbeddingStation.ts's own
   *  persist — but this station's queue can span MULTIPLE cases at
   *  once (a tech works through a continuous scan stream, not one case
   *  at a time), so this also refreshes every other queued item that
   *  shares the same real, just-updated Specimen object, and tracks a
   *  real per-case version counter rather than a single shared one. */
  const persist = useCallback(async (caseData: Case, updatedSpecimen: Specimen): Promise<Specimen> => {
    const updatedSpecimens = (caseData.specimens ?? []).map(sp => sp.id === updatedSpecimen.id ? updatedSpecimen : sp);
    const updatedCaseData = { ...caseData, specimens: updatedSpecimens };
    setQueue(prev => prev.map(q => {
      if (q.caseData.id !== caseData.id || q.specimen.id !== updatedSpecimen.id) return q;
      const block = updatedSpecimen.blocks?.find(b => b.id === q.block.id);
      const stain = block?.stains?.find(s => s.id === q.stain.id);
      return block && stain ? { ...q, caseData: updatedCaseData, specimen: updatedSpecimen, block, stain } : q;
    }));
    try {
      const version = versionsRef.current.get(caseData.id) ?? (caseData as unknown as { version?: number }).version ?? 0;
      await caseRouter.updateCase(caseData.id, { specimens: updatedSpecimens }, version);
      versionsRef.current.set(caseData.id, version + 1);
    } catch (e) {
      // Real, honest simplification, same posture as the other two
      // workstations' own persist — logged, not silently hidden, but
      // doesn't block the tech's own next scan.
      console.error('[SlideDistributionStation] Failed to persist:', e);
    }
    return updatedSpecimen;
  }, []);

  const handleAssignPhysical = useCallback(async (id: string, assignment: PhysicalAssignment): Promise<SlideDistributionActionResult> => {
    const item = queue.find(q => q.queueId === id);
    if (!item) return notInQueue;
    const missing = slideCheckoutMissing(assignment, requirements);
    if (missing.length > 0) return { ok: false, missing };
    // Real, per this codebase's own established gotcha (see
    // services/reports/README.md et al.): strictNullChecks: false
    // means a discriminated union doesn't reliably narrow on
    // `if (!result.ok)` — handled with an explicit cast instead.
    const result = assignPhysicalSlide(item.specimen, item.block.id, item.stain.id, assignment, actor.id);
    if (!result.ok) return failed;
    await persist(item.caseData, result.specimen);
    return { ok: true };
  }, [queue, persist, actor.id, requirements]);

  const handleAssignScanner = useCallback(async (id: string, assignment: ScannerAssignment): Promise<SlideDistributionActionResult> => {
    const item = queue.find(q => q.queueId === id);
    if (!item) return notInQueue;
    const missing = scannerLoadMissing(assignment, requirements);
    if (missing.length > 0) return { ok: false, missing };
    const result = assignScannerSlide(item.specimen, item.block.id, item.stain.id, assignment, actor.id);
    if (!result.ok) return failed;
    await persist(item.caseData, result.specimen);
    return { ok: true };
  }, [queue, persist, actor.id, requirements]);

  const handleFlagException = useCallback(async (id: string, reason: SlideExceptionReason, note?: string): Promise<SlideDistributionActionResult> => {
    const item = queue.find(q => q.queueId === id);
    if (!item) return notInQueue;
    const missing = slideExceptionMissing(note, requirements);
    if (missing.length > 0) return { ok: false, missing };
    const result = flagSlideException(item.specimen, item.block.id, item.stain.id, reason, actor.id, note?.trim() || undefined);
    if (!result.ok) return { ok: false };
    await persist(item.caseData, result.specimen);
    return { ok: true };
  }, [queue, persist, actor.id, requirements]);

  const handleResolveException = useCallback(async (id: string) => {
    const item = queue.find(q => q.queueId === id);
    if (!item) return;
    const result = resolveSlideException(item.specimen, item.block.id, item.stain.id, actor.id);
    if (result.ok) await persist(item.caseData, result.specimen);
  }, [queue, persist, actor.id]);

  const getPrinterContext = useCallback(async (): Promise<{ printer: PrinterProfile; gtin: string } | { error: string }> => {
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
    return { printer: printerRes.data, gtin };
  }, [effectiveStationId]);

  /** Real, per the spec's own "trigger a replacement label print"
   *  exception action — records the real, audited request
   *  (recordLabelReprintRequest) then dispatches the actual print
   *  through the identical real GS1/ZPL path PS-284's Microtomy
   *  Workstation already proved. */
  const handleRequestReprint = useCallback(async (id: string, reason: SlideLabelReprintReason | ''): Promise<SlideDistributionActionResult> => {
    const item = queue.find(q => q.queueId === id);
    if (!item) return notInQueue;
    const missing = slideReprintMissing(reason, requirements);
    if (missing.length > 0) return { ok: false, missing };
    const recorded = recordLabelReprintRequest(item.specimen, item.block.id, item.stain.id, actor.id, reason as SlideLabelReprintReason);
    if (!recorded.ok) return { ok: false, missing: ['reprintReason'] };
    const specimen = await persist(item.caseData, recorded.specimen);
    const block = specimen.blocks?.find(b => b.id === item.block.id);
    const stain = block?.stains.find(s => s.id === item.stain.id);
    if (!block || !stain) return notInQueue;

    const ctx = await getPrinterContext();
    if ('error' in ctx) return { ok: false, message: { key: ctx.error } };
    const fullAccession = item.caseData.accession?.fullAccession ?? item.caseData.id;
    const level = levelLabelFor(block.stains, stain.id);
    const slideId = stain.displayId ?? `${specimen.label}${block.label}-${level}`;
    const result = await printSlideLabel(
      { fullAccession, specimenLabel: specimen.label, blockLabel: block.label, level, stainName: stain.stainName, slideId },
      ctx.printer, ctx.gtin,
    );
    return result.ok ? { ok: true } : { ok: false, printerMessage: (result as { ok: false; message: string }).message };
  }, [queue, persist, getPrinterContext, actor.id, requirements]);

  const splitDestinationWarningFor = useCallback((id: string): SplitDestinationWarning | null => {
    const item = queue.find(q => q.queueId === id);
    if (!item) return null;
    return resolveSplitDestinationWarning(item.specimen, item.block.id);
  }, [queue]);

  return {
    queue, activeQueueId, setActiveQueueId, scanError, scanExceptions, resolveScan, removeFromQueue, requirements,
    pathologists, subspecialties, scanners, loadDirectories, resolveDefaultRouting,
    handleAssignPhysical, handleAssignScanner, handleFlagException, handleResolveException, handleRequestReprint,
    splitDestinationWarningFor, effectiveStationId, actor,
  };
}
