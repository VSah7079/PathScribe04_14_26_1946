// src/hooks/useGlobalMaterialScanTracking.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real fix, per direct follow-up: "the tracking event should occur no
// matter what page your on in pathscribe, just need access to the
// NavBar Scan." Confirmed directly: the original
// useMaterialScanTracking.ts (SynopticReportPage/hooks/) only listened
// while a specific case's own Synoptic page was mounted, and only
// ever matched against THAT case's own, currently-loaded data — a
// tech scanning a cassette while on the Worklist, Search, or any
// other page would have been silently ignored, even though
// ScannerProvider's own PATHSCRIBE_SCAN event is already genuinely
// global (window-level, mounted once at the app root alongside
// AuthProvider/SystemConfigProvider/etc. in App.tsx).
//
// This is that real, global replacement — mounted once, app-wide
// (see components/MaterialScanTrackingBridge.tsx), with no
// currently-open-case dependency at all. Parses the real accession
// out of the scanned value, looks up THAT specific case via
// caseRouter (regardless of what's on screen), and only proceeds if
// it genuinely resolves — an unrelated scan (an accession-only
// barcode, a different app's barcode entirely) is silently ignored,
// same real safety posture the original had.
//
// Real fix, per direct follow-up: "Phase 3 — the sibling-propagation
// confirmation system from a few turns back is still sitting there...
// it should come out." That system existed to keep sibling
// specimens sharing one physical cassette (tagged via the legacy
// HistologyBlock.sharedCassetteId) from silently missing their own
// location event. The real architectural fix (Case.matrixBlocks[], a
// single tracked asset per real cassette) made that propagation logic
// structurally unnecessary — a matrix block scan will resolve to one,
// real, shared record directly once the scan/location consumers are
// migrated (real, separate, later work), not N per-specimen copies
// needing a sibling check. Confirmed directly before removing: no
// seed/mock data anywhere in this app still carries a real
// sharedCassetteId, so this is a clean removal. Back to a direct,
// single-target write — exactly what this hook did before that
// system existed.
// ─────────────────────────────────────────────────────────────────────────────

import { slideLevelOf } from '@/services/material/slideLevels';
import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router';
import { processMaterialLocationEvent } from '@/services/hl7/processMaterialLocationEvent';
import { dispatchMaterialScanEvent } from '@/utils/dispatchMaterialScanEvent';
import { dispatchScanSlideLabel, type ScanLabelStation, type ScanSlideLabelDeps } from '@/utils/labels/dispatchScanSlideLabel';
import { hydrateGrossingBlocks } from '@/utils/hydrateGrossingBlocks';
import { resolveMaterialFromScan } from '@/utils/resolveMaterialFromScan';
import type { ResolvedScanTarget } from '@/utils/resolveMaterialFromScan';

import { caseRouter } from '@/services/cases/CaseRouter';
import { updateCaseWithRetryOrThrow } from '@/services/cases/caseWrite';

import { slideIdentifier, matrixSlideIdentifier } from '@/types/labels/LabelData';
import { useCurrentScanStation } from './useCurrentScanStation';
import { useAuth } from '@/contexts/AuthContext';
import type { ScanEvent } from '@/contexts/ScannerProvider';
import type { Case } from '@/types/case/Case';
import { scanStationService, auditService } from '@/services';
import { readSessionProfile } from '@/services/auth/sessionProfile';
import { scanEventOrganisation } from '@/services/scanStations/scanEventOrganisation';

/** Real, event-carried notification that a specific case's material
 *  was just updated by a scan — listened for by SynopticReportPage.tsx
 *  so a page currently viewing that exact case refreshes live, without
 *  this hook needing to know or care whether such a page even exists. */
export const MATERIAL_SCAN_UPDATED_EVENT = 'PATHSCRIBE_MATERIAL_SCAN_UPDATED';

type ScanLabelOutcomes = { id: string; outcome: Awaited<ReturnType<typeof dispatchScanSlideLabel>> }[];

/** Batch 652: a slide that got no label stays Pending Cut; say why in the console so support can see it. */
function logUnproduced(outcomes: ScanLabelOutcomes, where: string): void {
  for (const o of outcomes) {
    if (!o.outcome.produced) console.warn(`[Microtome] No label produced for a slide of ${where}: ${o.outcome.reason ?? 'unknown reason'}`);
  }
}

/** Audit text (literal English, per the audit-log rule) for the labels produced at the scan. */
function scanLabelAuditDetail(outcomes: ScanLabelOutcomes, where: string): string {
  const printed = outcomes.filter(o => o.outcome.printed).length;
  const engraved = outcomes.filter(o => o.outcome.engraved).length;
  const left = outcomes.filter(o => !o.outcome.produced).length;
  const parts = [
    printed > 0 ? `${printed} slide label${printed === 1 ? '' : 's'} printed` : '',
    engraved > 0 ? `${engraved} slide${engraved === 1 ? '' : 's'} engraved` : '',
  ].filter(Boolean).join(', ');
  return `${parts || 'Slide labels already produced'} for ${where} at the microtome.${left > 0 ? ` ${left} left pending (no label produced).` : ''}`;
}

/** Real feature, per direct follow-up: "slide engravers are common as
 *  well. In that workflow, the user scans the block at microtome and
 *  the labels get generated dynamically." Confirmed directly:
 *  'Microtomy / Sectioning' is a real, already-established
 *  ScanStation.workflowStage value (scanStationService.ts's own
 *  seed data). Only ever fires for a block-level or matrix_block-
 *  level scan at a station on that real stage — a slide-level scan
 *  (the slide already exists) has nothing pending to generate.
 *
 *  Real, deliberate re-fetch of the case rather than reusing the
 *  caller's own, already-resolved snapshot — handleRealScan's own
 *  processMaterialLocationEvent call just wrote a real, new
 *  locationHistory entry onto this exact same block/matrix block
 *  moments earlier; building this update from the stale, pre-write
 *  snapshot would silently overwrite it. Never throws — a real
 *  dispatch/write failure here must never block the tech's own
 *  physical scan from having already happened.
 */
export async function processMicrotomyScan(
  fullAccession: string,
  specimenLetter: string | undefined,
  target: ResolvedScanTarget,
  workflowStage: string | undefined,
  userId: string,
  // Batch 652: the station that was scanned at decides how the label is produced (engraver, printer, or both). Without
  // one, the older engraver-only behaviour applies (callers in the app always pass it).
  station: ScanLabelStation = { supportsEngraving: true, supportsPrinting: false },
  labelDeps?: ScanSlideLabelDeps,
): Promise<void> {
  if (workflowStage !== 'Microtomy / Sectioning') return;
  if (target.level !== 'block' && target.level !== 'matrix_block') return;

  try {
    const caseData = await caseRouter.getCase(fullAccession);
    if (!caseData) return;

    if (target.level === 'block') {
      const specimen = (caseData.specimens ?? []).find(sp => sp.label === specimenLetter);
      const block = specimen?.blocks?.find(b => b.label === target.blockNumber);
      if (!specimen || !block) return;
      const pendingIndexes = (block.stains ?? [])
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => s.status === 'Pending Cut');
      if (pendingIndexes.length === 0) return;

      // Batch 652: only slides whose label was really engraved or printed are marked below; the rest stay Pending Cut.
      const outcomes = await Promise.all(pendingIndexes.map(async ({ s, i }) => {
        const level = slideLevelOf(s, i);
        const slideId = slideIdentifier(fullAccession, specimen.label, block.label, level);
        const outcome = await dispatchScanSlideLabel({ fullAccession, specimenLabel: specimen.label, blockLabel: block.label, level, stainName: s.stainName, slideId }, station, labelDeps);
        return { id: s.id, outcome };
      }));
      const produced = outcomes.filter(o => o.outcome.produced);
      logUnproduced(outcomes, `${specimen.label}${block.label}`);
      if (produced.length === 0) return;

      // PS-71 (Batch 458): marked on the newest copy of the case and saved
      // with its version (updateCaseWithRetryOrThrow), so a concurrent
      // change elsewhere on the case is kept. Only the slides whose labels
      // were just engraved are marked (by id), never a slide added since.
      const engraved = new Set(produced.map(o => o.id));
      await updateCaseWithRetryOrThrow(caseData.id, current => ({
        specimens: (current.specimens ?? []).map((sp: Case['specimens'][number]) => sp.id !== specimen.id ? sp : {
          ...sp,
          blocks: (sp.blocks ?? []).map(b => b.id !== block.id ? b : {
            ...b,
            stains: (b.stains ?? []).map(s => s.status === 'Pending Cut' && engraved.has(s.id) ? { ...s, status: 'Cut & Placed' as const } : s),
          }),
        }),
      }), caseRouter);
      auditService.logEvent({
        type: 'system', event: 'Slides Engraved at Microtome',
        detail: scanLabelAuditDetail(outcomes, `${specimen.label}${block.label}`),
        user: userId, caseId: caseData.id, confidence: null,
      }).catch(() => {});
    } else {
      const matrixBlockId = target.matrixBlockId;
      const matrixBlock = (caseData.matrixBlocks ?? []).find(m => m.id === matrixBlockId);
      if (!matrixBlock) return;
      const pendingIndexes = (matrixBlock.slides ?? [])
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => s.status === 'Pending Cut');
      if (pendingIndexes.length === 0) return;

      const outcomes = await Promise.all(pendingIndexes.map(async ({ s, i }) => {
        const level = slideLevelOf(s, i);
        const slideId = matrixSlideIdentifier(fullAccession, matrixBlock.label, level);
        const outcome = await dispatchScanSlideLabel({ fullAccession, specimenLabel: matrixBlock.label, blockLabel: matrixBlock.label, level, stainName: s.stainName, slideId }, station, labelDeps);
        return { id: s.id, outcome };
      }));
      const produced = outcomes.filter(o => o.outcome.produced);
      logUnproduced(outcomes, `matrix block ${matrixBlock.label}`);
      if (produced.length === 0) return;

      // PS-71 (Batch 458): same as the block branch above, on matrixBlocks.
      const engraved = new Set(produced.map(o => o.id));
      await updateCaseWithRetryOrThrow(caseData.id, current => ({
        matrixBlocks: (current.matrixBlocks ?? []).map(m => m.id !== matrixBlockId ? m : {
          ...m,
          slides: (m.slides ?? []).map(s => s.status === 'Pending Cut' && engraved.has(s.id) ? { ...s, status: 'Cut & Placed' as const } : s),
        }),
      }), caseRouter);
      auditService.logEvent({
        type: 'system', event: 'Slides Engraved at Microtome',
        detail: scanLabelAuditDetail(outcomes, `matrix block ${matrixBlock.label}`),
        user: userId, caseId: caseData.id, confidence: null,
      }).catch(() => {});
    }
  } catch (e) {
    console.error('[Microtome] Failed to process dynamic slide generation:', e);
  }
}

/** Real feature, per direct follow-up describing the real grossing-
 *  station workflow: "Scanning the container at grossing means
 *  resolving and releasing those pre-created default blocks into
 *  physical assets... the container scan on the SynopticReportPage
 *  acts as the resolution and execution bridge." Same real, gated
 *  structure as processMicrotomyScan above — only fires for a real,
 *  specimen-level scan at a station on the real 'Grossing' stage
 *  (a block/slide-level scan has no real placeholder blocks of its
 *  own to hydrate).
 *
 *  Deliberately ONLY hydrates (resolves + persists cassetteColorId
 *  onto each real, still-'Pending' block) — never prints anything
 *  itself. Per direct confirmation, the real Execution Release
 *  (print/engrave dispatch) only happens on the PA's own explicit
 *  confirm action in the real Grossing panel, never silently as a
 *  side effect of the scan alone. Never throws — a real hydration
 *  failure must never block the tech's own physical scan from having
 *  already happened. */
async function processGrossingScan(
  fullAccession: string,
  specimenLetter: string | undefined,
  target: ResolvedScanTarget,
  workflowStage: string | undefined,
  userId: string,
): Promise<void> {
  if (workflowStage !== 'Grossing') return;
  if (target.level !== 'specimen') return;

  try {
    const caseData = await caseRouter.getCase(fullAccession);
    if (!caseData) return;
    const specimen = (caseData.specimens ?? []).find(sp => sp.label === specimenLetter);
    if (!specimen) return;

    const hydrated = await hydrateGrossingBlocks(caseData.id, specimen.id);
    if (hydrated.length === 0) return;

    auditService.logEvent({
      type: 'system', event: 'Grossing Blocks Hydrated',
      detail: `${hydrated.length} real block${hydrated.length === 1 ? '' : 's'} resolved (cassette color) for specimen ${specimenLetter} at grossing — ready for PA release.`,
      user: userId, caseId: caseData.id, confidence: null,
    }).catch(() => {});

    // Real, deliberate follow-up event — the location-event refresh
    // handleRealScan itself already fired (immediately, before this
    // function's own async hydration work here could possibly have
    // finished) is genuinely too early to reflect the real,
    // newly-hydrated cassetteColorId. Same real MATERIAL_SCAN_UPDATED_EVENT,
    // fired again once hydration has actually, genuinely persisted —
    // SynopticReportPage.tsx's own existing listener already handles
    // this generically (re-fetch + toast), no new listener needed.
    window.dispatchEvent(new CustomEvent(MATERIAL_SCAN_UPDATED_EVENT, {
      // Batch 445: the count travels as a number; the report page words
      // the toast in the user's language.
      detail: { caseId: caseData.id, targetDescription: specimenLetter, stationName: 'Grossing', resolvedCassettes: hydrated.length },
    }));
  } catch (e) {
    console.error('[Grossing] Failed to hydrate placeholder blocks:', e);
  }
}

export function useGlobalMaterialScanTracking() {
  const { stationId } = useCurrentScanStation();
  const { user } = useAuth();
  const location = useLocation();

  const handleRealScan = useCallback(async (scanEvent: ScanEvent) => {
    // Real, explicit guard — per direct follow-up adding a genuinely
    // separate station-switch scan kind (useGlobalStationSwitch.ts):
    // a "STATION:" prefixed value would almost certainly fail to
    // resolve to a real case anyway (case accessions don't start with
    // that literal text), but checking explicitly here is clearer and
    // more robust than relying on that as an implicit side effect.
    if (scanEvent.raw?.trim().toUpperCase().startsWith('STATION:')) return;

    // Real, confirmed bug fix, found via live testing: DisposalQueuePage.tsx
    // (services/retentionPolicy/disposeItemByScan.ts) and this hook both
    // listen to the same real, global PATHSCRIBE_SCAN event, and both
    // independently read-modify-write the SAME case record via
    // caseRouter.updateCase — a genuine race where whichever write lands
    // second silently overwrote the other's change with its own, stale
    // snapshot (confirmed directly: a real scan on the disposal queue
    // correctly showed "disposed" in the UI, yet the underlying
    // disposedAt field was missing afterward — this hook's own,
    // unrelated location-tracking write had clobbered it). Same real
    // guard pattern ScannerProvider.tsx already uses for its own
    // route-specific scan-meaning conflict on '/accession' — a scan on
    // the disposal queue means "dispose this," not "record a new
    // location," and the two must never both act on the same scan.
    if (location.pathname.startsWith('/batch-management/disposal')) return;
    // Batch 645: a Lockbox Drop-Off scan means "receive this container", whatever has focus; no default action or tracking may also run.
    if (location.pathname.startsWith('/lockbox-drop-off')) return;

    // Real, shared resolution — see resolveMaterialFromScan.ts's own
    // header for why this used to be two independently-maintained
    // copies (this hook's own, and the new Batch Management module's)
    // and is now one, real, shared implementation.
    const resolved = await resolveMaterialFromScan(scanEvent.raw);
    if (!resolved) return; // Real, deliberate silent ignore — not a real, resolvable case+material scan at all.
    const { caseData, fullAccession, specimenLetter, target } = resolved;

    if (!stationId) return; // Real, silent no-op — same as the toast-driven version, but a global listener with no case-specific page open has nowhere sensible to show that toast; the station selector itself (Material tab) still explains this when a tech does check.
    const stationResult = await scanStationService.getById(stationId);
    if (!stationResult.ok) return;
    const station = stationResult.data;

    // Batch 654: the organisation is the signed-in person's, never a value fixed in the code.
    const org = scanEventOrganisation(readSessionProfile());
    await processMaterialLocationEvent({
      messageId: `local-scan-${Date.now()}`,
      timestamp: new Date().toISOString(),
      organisationId: org.organisationId,
      accessionNumber: fullAccession,
      specimenLetter,
      target,
      location: station.name,
      workflowStage: station.workflowStage,
      observedAt: new Date().toISOString(),
      reportedBy: user?.id ?? 'unknown',
      sourceSystem: 'PathScribe (local scan)',
    });

    // The outbound event is sent only when the organisation is known: it is never invented.
    if (org.known) await dispatchMaterialScanEvent({
      messageId: `scan-${Date.now()}`,
      timestamp: new Date().toISOString(),
      organisationId: org.organisationId,
      accessionNumber: fullAccession,
      specimenLetter,
      target,
      rawScanValue: scanEvent.raw,
      stationId: station.id,
      stationName: station.name,
      workflowStage: station.workflowStage,
      scannedByUserId: user?.id ?? 'unknown',
    });

    // Real feature, per direct follow-up: "slide engravers are common
    // as well... the user scans the block at microtome and the labels
    // get generated dynamically." Fire-and-forget, same posture as
    // the other real dispatches above — a slow/failed engrave dispatch
    // must never block the location event that already, correctly
    // applied.
    processMicrotomyScan(fullAccession, specimenLetter, target, station.workflowStage, user?.id ?? 'unknown', station).catch(() => {});
    processGrossingScan(fullAccession, specimenLetter, target, station.workflowStage, user?.id ?? 'unknown').catch(() => {});

    const targetDescription = target.level === 'matrix_block'
      ? (caseData.matrixBlocks ?? []).find(m => m.id === target.matrixBlockId)?.label ?? target.matrixBlockId
      : target.level === 'matrix_slide'
        ? `${(caseData.matrixBlocks ?? []).find(m => m.id === target.matrixBlockId)?.label ?? target.matrixBlockId}-${target.slideLevel}`
        : target.level === 'specimen'
          ? `${specimenLetter}`
          : target.level === 'decant'
            ? `${specimenLetter}${target.decantLabel}`
            : target.level === 'decant_slide'
              ? `${specimenLetter}${target.decantLabel}-${target.slideLevel}`
              : target.level === 'block'
                ? `${specimenLetter}${target.blockNumber}`
                : `${specimenLetter}${target.blockNumber}-${target.slideLevel}`;

    window.dispatchEvent(new CustomEvent(MATERIAL_SCAN_UPDATED_EVENT, {
      detail: { caseId: caseData.id, targetDescription, stationName: station.name },
    }));
  }, [stationId, user?.id, location.pathname]);

  useEffect(() => {
    const listener = (e: Event) => {
      const scanEvent = (e as CustomEvent<ScanEvent>).detail;
      if (scanEvent) handleRealScan(scanEvent);
    };
    window.addEventListener('PATHSCRIBE_SCAN', listener);
    return () => window.removeEventListener('PATHSCRIBE_SCAN', listener);
  }, [handleRealScan]);
}
