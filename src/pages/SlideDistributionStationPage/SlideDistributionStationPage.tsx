// src/pages/SlideDistributionStationPage/SlideDistributionStationPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-286 — "Slide Distribution Station: a continuous-scan
// checkout/digital scanner ingestion workstation." Third of the
// PS-284→285→286→287→288 workstation-build sequence, the post-staining
// step: routing each finished, physical slide either to a pathologist
// (physical checkout) or a digital scanner (WSI ingestion). Same real
// bench-scoped, NOT case-scoped route posture as its two siblings —
// see useSlideDistributionStation.ts's own header for why this one is
// architecturally a continuous QUEUE rather than one work item at a
// time.
//
// Real, per direct visual-consistency guidance carried through the
// whole series: same header/back-button pattern, same dark palette —
// see pathscribe.css's own ps-slidedist-* block.
//
// Real, deliberate scope cuts, stated plainly (also documented in this
// folder's own README): no MatrixBlock-level slides, no physical
// foot-pedal integration yet — tracked as the next real item after
// PS-288 per direct instruction — and "Batch Container Recognition" is
// scoped to real, existing data (scanning a block queues every real
// slide already cut from it) rather than a fabricated rack/tray
// container model that doesn't exist anywhere in this app today.
//
// Batch 402 (PS-359): Field Requirements (page "slideDistribution"). The page
// has its own voice context (SLIDE_DISTRIBUTION: "confirm checkout", "confirm
// scanner"); both confirms, the exception note and the label reprint (now a
// reason, then Reprint: SlideLabelReprintModal) star what is required, say
// what is still missing and stay off until it is filled. The hook checks the
// same rules. Messages come back as locale keys.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { actionRegistryService } from '@/services';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import { formatList } from '@/utils/formatList';
import { useSlideDistributionStation } from './hooks/useSlideDistributionStation';
import QueuePanel from './components/QueuePanel';
import ScanCenterPanel from './components/ScanCenterPanel';
import DestinationControlPanel from './components/DestinationControlPanel';
import SlideLabelReprintModal from './components/SlideLabelReprintModal';
import type { DestinationMode } from './components/DestinationControlPanel';
import type { SlideExceptionReason, SlideLabelReprintReason } from '@/utils/slideDistributionOperations';
import type { SlideDistributionActionResult } from './hooks/useSlideDistributionStation';
// Batch 726 (Lab Workflow & Batch spec, Decision 1): carriers at this workstation.
import { useStationCarrier } from '@/hooks/useStationCarrier';
import StationCarrierPanel from '@/components/Workstation/StationCarrierPanel';
import { StationScanField } from '@/components/Workstation/StationScanField';
import ScanTrailPanel from '@/components/Workstation/ScanTrailPanel';
import ExhaustedBlockBanner from '@/components/Workstation/ExhaustedBlockBanner';
import ItemEndStatePanel from '@/components/Workstation/ItemEndStatePanel';
import BlockPieceMapPanel from '@/components/Workstation/BlockPieceMapPanel';
import '../../pathscribe.css';

const SlideDistributionStationPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t('slideDistribution.pageTitle'), '/workstations/slide-distribution'); }, [pushCrumb, t]);

  const w = useSlideDistributionStation();
  const carrier = useStationCarrier('slideDistribution');
  const [mode, setMode] = useState<DestinationMode>('physical');
  const [assignFeedback, setAssignFeedback] = useState<string | null>(null);
  const [reprintFeedback, setReprintFeedback] = useState<string | null>(null);
  const [pendingReprint, setPendingReprint] = useState(false);

  // Batch 402: this page has its own voice/keyboard context ("confirm checkout", "confirm scanner").
  useEffect(() => {
    actionRegistryService.setCurrentContext(VOICE_CONTEXT.SLIDE_DISTRIBUTION);
    return () => { actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); };
  }, []);

  /** The text for a refused action: what is still required, a message, or the printer's own words. */
  const describeFailure = useCallback((result: SlideDistributionActionResult, fallbackKey: string): string => {
    if (result.missing?.length) {
      return t('fieldRequirements.stillRequired', { fields: formatList(result.missing.map(id => t(`fieldRequirements.fields.slideDistribution.${id}`)), i18n.language) });
    }
    if (result.printerMessage) return result.printerMessage;
    if (result.message) return t(result.message.key, result.message.values);
    return t(fallbackKey);
  }, [t, i18n.language]);

  useEffect(() => { w.loadDirectories(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Real, same real global-scan-event pattern as the other two
  // workstations' own listener — continuous scanning here means every
  // scan (whether the input has focus or not) should add to the queue
  // with no manual interface interaction in between, exactly as the
  // spec's own "Single Input Line" requirement states.
  useEffect(() => {
    const listener = (e: Event) => {
      const scanEvent = (e as CustomEvent<{ raw: string }>).detail;
      if (!scanEvent?.raw || scanEvent.raw.trim().toUpperCase().startsWith('STATION:')) return;
      void carrier.route(scanEvent.raw, w.resolveScan);
    };
    window.addEventListener('PATHSCRIBE_SCAN', listener);
    return () => window.removeEventListener('PATHSCRIBE_SCAN', listener);
  }, [w, carrier]);

  // Touch spec T1 (Batch 735): the shared scan field (no on-screen keyboard, focus kept) hands the scan in here.
  const handleScan = useCallback(async (raw: string) => { await carrier.route(raw, w.resolveScan); }, [w, carrier]);

  const activeItem = w.queue.find(q => q.queueId === w.activeQueueId);
  const endStateItem = w.endStateItemFor(w.activeQueueId);
  const pieceView = w.pieceViewFor(w.activeQueueId);
  const splitWarning = w.activeQueueId ? w.splitDestinationWarningFor(w.activeQueueId) : null;
  const defaultRouting = activeItem ? w.resolveDefaultRouting(activeItem.caseData) : {};

  const carrierOrScannerId = !activeItem
    ? '—'
    : activeItem.stain.distributionDestination === 'physical'
      ? (activeItem.stain.physicalLocation?.courierBagId ?? activeItem.stain.physicalLocation?.trayNumber ?? activeItem.stain.physicalLocation?.slideFolderId ?? '—')
      : (activeItem.stain.scannerAssignment?.scannerInstrumentId ?? '—');

  const handleAssignPhysical = useCallback(async (assignment: Parameters<typeof w.handleAssignPhysical>[1]) => {
    if (!w.activeQueueId) return;
    setAssignFeedback(null);
    const result = await w.handleAssignPhysical(w.activeQueueId, assignment);
    if (!result.ok && !result.notSaved) setAssignFeedback(describeFailure(result, 'slideDistribution.destination.assignFailed'));
  }, [w, describeFailure]);

  const handleAssignScanner = useCallback(async (assignment: Parameters<typeof w.handleAssignScanner>[1]) => {
    if (!w.activeQueueId) return;
    setAssignFeedback(null);
    const result = await w.handleAssignScanner(w.activeQueueId, assignment);
    if (!result.ok && !result.notSaved) setAssignFeedback(describeFailure(result, 'slideDistribution.destination.assignFailed'));
  }, [w, describeFailure]);

  const handleFlagException = useCallback((reason: SlideExceptionReason, note: string) => {
    if (!w.activeQueueId) return;
    void w.handleFlagException(w.activeQueueId, reason, note);
  }, [w]);

  const handleResolveException = useCallback(() => {
    if (!w.activeQueueId) return;
    w.handleResolveException(w.activeQueueId);
  }, [w]);

  const handleConfirmReprint = useCallback(async (reason: SlideLabelReprintReason) => {
    setPendingReprint(false);
    if (!w.activeQueueId) return;
    setReprintFeedback(null);
    const result = await w.handleRequestReprint(w.activeQueueId, reason);
    if (!result.ok && !result.notSaved) setReprintFeedback(describeFailure(result, 'slideDistribution.activeSlide.reprintFailed'));
  }, [w, describeFailure]);

  return (
    <div className="ps-slidedist-page">
      <div className="ps-slidedist-header">
        <button className="ps-btn-secondary" onClick={() => navigate('/worklist')}>{t('common.back')}</button>
        <h1 className="ps-slidedist-title">📬 {t('slideDistribution.pageTitle')}</h1>
      </div>

      <StationCarrierPanel carrier={carrier} />
      {/* Batch 729 (spec §7.4): the active slide's case scan trail. */}
      {activeItem && <ScanTrailPanel caseAccession={activeItem.caseData.accession?.fullAccession ?? activeItem.caseData.id} />}
      {/* Batch 731 (spec §10.6, §10.5): the slide's block when it is exhausted, and the slide's end state. */}
      {activeItem && <ExhaustedBlockBanner specimen={activeItem.specimen} block={activeItem.block} />}
      {endStateItem && <ItemEndStatePanel {...endStateItem} stationId={w.effectiveStationId} />}
      {/* Batch 732 (spec §11): the slide's size and its block's pieces. */}
      {pieceView && <BlockPieceMapPanel blockType={pieceView.blockType} slideSize={pieceView.slideSize} pieces={pieceView.pieces} />}

      <div className="ps-slidedist-context-bar">
        <span>{t('slideDistribution.context.queueCount')} <strong>{w.queue.length}</strong></span>
        <span>{t('slideDistribution.context.mode')} <strong>{t(`slideDistribution.destination.${mode}`)}</strong></span>
        <span>{t('slideDistribution.context.carrierOrScanner')} <strong>{carrierOrScannerId}</strong></span>
        <span>{t('slideDistribution.context.tech')} <strong>{w.actor.name}</strong></span>
      </div>

      <div className="ps-slidedist-panel ps-mb-16">
        <p className="ps-slidedist-panel-title">{t('slideDistribution.scanPrompt')}</p>
        <StationScanField onScan={handleScan} placeholder={t('slideDistribution.scanPlaceholder') ?? ''} submitLabel={t('slideDistribution.scanSubmit')} />
        {w.scanError && <div className="ps-slidedist-scan-error">{t(w.scanError.key, w.scanError.values)}</div>}
      </div>

      {w.saveError && <div className="ps-workstation-save-error" role="alert">{w.saveError}</div>}

      <div className="ps-slidedist-layout">
        <QueuePanel queue={w.queue} activeQueueId={w.activeQueueId} onSelect={w.setActiveQueueId} onRemove={w.removeFromQueue} />

        <ScanCenterPanel
          queue={w.queue}
          activeItem={activeItem}
          activeQueueId={w.activeQueueId}
          onSelect={w.setActiveQueueId}
          splitWarning={splitWarning}
          scanExceptions={w.scanExceptions}
          onFlagException={handleFlagException}
          onResolveException={handleResolveException}
          onRequestReprint={() => { setReprintFeedback(null); setPendingReprint(true); }}
          reprintFeedback={reprintFeedback}
          requirements={w.requirements}
        />

        <DestinationControlPanel
          activeItem={activeItem}
          pathologists={w.pathologists}
          subspecialties={w.subspecialties}
          scanners={w.scanners}
          defaultRouting={defaultRouting}
          onAssignPhysical={handleAssignPhysical}
          onAssignScanner={handleAssignScanner}
          feedback={assignFeedback}
          mode={mode}
          onModeChange={setMode}
          requirements={w.requirements}
        />
      </div>

      {pendingReprint && (
        <SlideLabelReprintModal
          requirements={w.requirements}
          onReprint={reason => { void handleConfirmReprint(reason); }}
          onCancel={() => setPendingReprint(false)}
        />
      )}
    </div>
  );
};

export default SlideDistributionStationPage;
