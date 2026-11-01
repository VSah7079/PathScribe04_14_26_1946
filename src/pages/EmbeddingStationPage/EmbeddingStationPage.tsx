// src/pages/EmbeddingStationPage/EmbeddingStationPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-285 — "Embedding Station: a dedicated, bench-scoped
// workstation for cassette scan/verify, mold selection, and
// discrepancy flagging." Sibling workstation to PS-284's Microtome
// Workstation — reached by scanning a cassette barcode at a real
// 'Embedding' ScanStation, deliberately NOT a case-scoped route like
// GrossingScreenPage/SynopticReportPage, for the identical reason
// MicrotomyWorkstationPage.tsx states: an embedding tech works
// cassette-by-cassette across many cases in a single shift.
//
// Real, per direct follow-up asking to keep this visually consistent
// with the rest of the workstation series rather than a new visual
// language: same header/back-button convention, same ps-overlay/
// ps-modal-dark modal pattern, same dark palette — see
// pathscribe.css's own ps-embedding-* block, styled to match
// ps-microtomy-*/ps-grossing-* directly.
//
// Real, deliberate scope cut, stated plainly (also documented in this
// folder's own README): no MatrixBlock support yet (see
// useEmbeddingStation.ts's own header), and the cassette label preview
// is a real, proportionally-scaled schematic, not a pixel-exact
// DataMatrix render — identical honest posture to
// HardwarePrintPanel.tsx's own slide preview.
//
// **Real fix, per direct follow-up ("these foot pedals are ubiquitous
// and we must support them"):** the physical foot-pedal integration
// this file's own header used to disclaim as out of reach ("same real
// hardware-reach limit as every other workstation in this app") was
// independently re-verified and found incorrect — the same real,
// already-working useFootPedal.ts hook (Gamepad API + keyboard-
// emulation capture, built for SynopticReportPage.tsx's own dictation
// controls) reaches real, physical foot pedals from the browser
// today, no native agent required. PS-285's own named "hands-free
// triggers for piece-count confirmation" is now wired below via that
// same hook — Pedal 1 (see FootPedalConfig.ts's own doc
// comment). Its sibling, "advancing to next queued cassette," is
// deliberately NOT wired — this page is a real, scan-to-open, single-
// cassette workspace with no real queue/next-item navigation to
// advance (confirmed directly, not assumed); wiring a pedal to a
// feature that doesn't exist yet would be dishonest.
//
// Batch 401 (PS-359): Field Requirements (page "embedding"). The page has its
// own voice context (EMBEDDING: "confirm count", "add comment"); Confirm, the
// comment drawer and the reprint dialog (CassetteReprintModal) each star what
// is required, say what is still missing, and stay off until it is filled; the
// hook checks the same rules, so the foot pedal is held to them too.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { formatDate } from '@/utils/formatDate';
import { blockStatusLabelKey, hasOpenEmbeddingDiscrepancy } from '@/utils/embeddingOperations';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { printSettingsService, printerProfileService, actionRegistryService } from '@/services';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import { DEFAULT_CASSETTE_LABEL_LAYOUT } from '@/services/printSettings/IPrintSettingsService';
import type { CassetteLabelLayoutConfig } from '@/services/printSettings/IPrintSettingsService';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';
import { scanStationService } from '@/services';
import type { CassetteReprintReason } from '@/types/case/Specimen';
import { useFootPedal } from '@/hooks/useFootPedal';
import { useEmbeddingStation } from './hooks/useEmbeddingStation';
import EmbeddingCenterPanel from './components/EmbeddingCenterPanel';
import CassettePrintPanel from './components/CassettePrintPanel';
import CommentDrawer from './components/CommentDrawer';
import CassetteReprintModal from './components/CassetteReprintModal';
// Batch 726 (Lab Workflow & Batch spec, Decision 1): carriers at this workstation.
import { useStationCarrier } from '@/hooks/useStationCarrier';
import StationCarrierPanel from '@/components/Workstation/StationCarrierPanel';
import { StationScanField } from '@/components/Workstation/StationScanField';
import ScanTrailPanel from '@/components/Workstation/ScanTrailPanel';
import ExhaustedBlockBanner from '@/components/Workstation/ExhaustedBlockBanner';
import BlockPieceMapPanel from '@/components/Workstation/BlockPieceMapPanel';
import '../../pathscribe.css';

const EmbeddingStationPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t('embeddingStation.pageTitle'), '/workstations/embedding'); }, [pushCrumb, t]);

  const w = useEmbeddingStation();
  const carrier = useStationCarrier('embedding');

  // Batch 401: this page has its own voice/keyboard context ("confirm count", "add comment").
  useEffect(() => {
    actionRegistryService.setCurrentContext(VOICE_CONTEXT.EMBEDDING);
    return () => { actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); };
  }, []);

  // Real, per PS-285's own named "hands-free triggers for piece-count
  // confirmation" — Pedal 1, same real hook/binding already working
  // for SynopticReportPage.tsx's dictation controls. Mirrors the
  // on-screen "✅ Confirm" button's own default behavior
  // (EmbeddingCenterPanel.tsx's observedCount state initializes to
  // the expected, grossing-recorded count) — a bare pedal press
  // confirms "yes, this matches," the common case; a genuine
  // discrepancy still requires the on-screen numeric field + Confirm,
  // since a pedal has no way to type a different count. Real,
  // explicit guard: only fires with an open work item, a known
  // expected count, and a block not already sealed — a stray press
  // after the block is already 'Embedded' must never silently
  // re-confirm and overwrite the real, already-recorded count.
  useFootPedal({
    actions: {
      pedal1_pushToTalk: () => {
        const block = w.workItem?.block;
        if (!block || block.pieceCount == null || block.status === 'Embedded' || hasOpenEmbeddingDiscrepancy(block)) return;
        // Batch 401: the hook checks Field Requirements, so a pedal press
        // can't confirm a block the organisation still needs a mold size or
        // orientation for; the panel shows what is still required.
        void w.handleConfirmPieceCount(block.pieceCount);
      },
    },
  });

  const [labelLayout, setLabelLayout] = useState<CassetteLabelLayoutConfig>(DEFAULT_CASSETTE_LABEL_LAYOUT);
  const [printer, setPrinter] = useState<PrinterProfile | null>(null);
  const [printerError, setPrinterError] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [pendingReprint, setPendingReprint] = useState(false);
  const [reprintInFlight, setReprintInFlight] = useState(false);
  const [reprintFeedback, setReprintFeedback] = useState<string | null>(null);

  useEffect(() => {
    printSettingsService.get().then(res => { if (res.ok) setLabelLayout(res.data.cassetteLabelLayout); });
  }, []);

  useEffect(() => {
    if (!w.effectiveStationId) { setPrinter(null); setPrinterError(t('embeddingStation.hardware.noStation')); return; }
    scanStationService.getById(w.effectiveStationId).then(async stationRes => {
      if (!stationRes.ok || !stationRes.data.supportsPrinting || !stationRes.data.cassetteSlidePrinterProfileId) {
        setPrinter(null); setPrinterError(t('embeddingStation.hardware.notConfigured'));
        return;
      }
      const printerRes = await printerProfileService.getById(stationRes.data.cassetteSlidePrinterProfileId);
      if (printerRes.ok && printerRes.data) { setPrinter(printerRes.data); setPrinterError(null); }
      else { setPrinter(null); setPrinterError(t('embeddingStation.hardware.profileMissing')); }
    });
  }, [w.effectiveStationId, t]);

  // Real, same real global-scan-event pattern as
  // MicrotomyWorkstationPage.tsx's own listener — a real barcode wedge
  // scanner just types into whatever has focus, so this additionally
  // picks up PATHSCRIBE_SCAN even when the scan input isn't focused.
  // Same 'STATION:' guard every other real listener here uses.
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

  const handleToggleAlertFlag = useCallback((flag: 'tinyTissue' | 'fragile' | 'requiresDecal') => {
    if (!w.workItem) return;
    // Real, same real per-block boolean toggle as
    // MicrotomyWorkstationPage.tsx's own handleSetAlertFlags — this
    // page reuses the identical real, stored fields
    // (tinyTissue/fragile/requiresDecal), never a second copy.
    w.handleSetAlertFlags({ [flag]: !w.workItem.block[flag] });
  }, [w]);

  const handleConfirmReprint = useCallback(async (reason: CassetteReprintReason) => {
    setPendingReprint(false);
    setReprintInFlight(true);
    setReprintFeedback(null);
    const result = await w.handleReprintCassette(reason);
    setReprintInFlight(false);
    if (result.ok) return;
    setReprintFeedback(result.printerMessage
      ?? (result.message ? t(result.message.key, result.message.values) : t('embeddingStation.hardware.reprintFailed')));
  }, [w, t]);

  return (
    <div className="ps-embedding-page">
      <div className="ps-embedding-header">
        <button className="ps-btn-secondary" onClick={() => navigate('/worklist')}>{t('common.back')}</button>
        <h1 className="ps-embedding-title">🧊 {t('embeddingStation.pageTitle')}</h1>
      </div>

      <StationCarrierPanel carrier={carrier} />
      {/* Batch 729 (spec §7.4): the case's station scan trail. */}
      {w.workItem && <ScanTrailPanel caseAccession={w.workItem.caseData.accession?.fullAccession ?? w.workItem.caseData.id} />}

      {!w.workItem ? (
        <div className="ps-embedding-panel">
          <p className="ps-embedding-panel-title">{t('embeddingStation.scanPrompt')}</p>
          <StationScanField onScan={handleScan} placeholder={t('embeddingStation.scanPlaceholder') ?? ''} submitLabel={t('embeddingStation.scanSubmit')} />
          {w.scanError && <div className="ps-embedding-scan-error">{t(w.scanError.key, w.scanError.values)}</div>}
        </div>
      ) : (
        <>
          <div className="ps-embedding-context-bar">
            <span>{t('embeddingStation.context.accession')} <strong data-phi="accession">{w.workItem.caseData.accession?.fullAccession ?? w.workItem.caseData.id}</strong></span>
            <span>{t('embeddingStation.context.patient')} <strong data-phi="name">{`${w.workItem.caseData.patient?.givenNames ?? ''} ${w.workItem.caseData.patient?.familyNames ?? ''}`.trim() || '—'}</strong></span>
            <span>{t('embeddingStation.context.dob')} <strong data-phi="dob">{formatDate(w.workItem.caseData.patient?.dateOfBirth, i18n.language)}</strong></span>
            <span>
              {t('embeddingStation.context.specimenBlock')}{' '}
              <strong>{w.workItem.specimen.label}{w.workItem.block.label}</strong>
            </span>
            {w.matrixSpecimens !== null
              ? <span>{t('embeddingStation.context.matrixBlockOf', { specimens: w.matrixSpecimens || '—' })}</span>
              : <span>{t('embeddingStation.context.specimenType')} <strong>{w.workItem.specimen.description ?? '—'}</strong></span>}
            <span className="ps-ml-auto"><StationScanField compact onScan={handleScan} placeholder={t('embeddingStation.scanPlaceholder') ?? ''} submitLabel={t('embeddingStation.scanSubmit')} /></span>
            <button type="button" className="ps-embedding-row-btn" onClick={() => w.clearWorkItem()}>
              {t('embeddingStation.context.scanNext')}
            </button>
          </div>

          {w.saveError && <div className="ps-workstation-save-error" role="alert">{w.saveError}</div>}
          {/* Batch 731 (spec §10.6): an exhausted block's warning; mark it re-embedded to release the orders waiting for it. */}
          <ExhaustedBlockBanner specimen={w.workItem.specimen} block={w.workItem.block} onReembedded={w.workItem.matrixBlock ? undefined : w.handleReembedded} />
          {/* Batch 732 (spec §11): block type, slide size and piece map. */}
          {w.pieceView && <BlockPieceMapPanel blockType={w.pieceView.blockType} slideSize={w.pieceView.slideSize} pieces={w.pieceView.pieces} />}
          {w.discrepancyNotice && (w.discrepancyNotice.kind === 'failed'
            ? <div className="ps-workstation-save-error" role="alert">{t(w.discrepancyNotice.key, w.discrepancyNotice.values)}</div>
            : <div className="ps-embedding-split-banner ps-embedding-split-banner--complete" role="status">{t(w.discrepancyNotice.key, w.discrepancyNotice.values)}</div>)}

          <div className="ps-embedding-layout">
            {/* Left: Specimen block summary */}
            <div className="ps-embedding-panel">
              <p className="ps-embedding-panel-title">{t('embeddingStation.specimenSummary.title')}</p>
              <ul className="ps-embedding-comment-list">
                {(w.workItem.specimen.blocks ?? []).map(b => (
                  <li key={b.id} className="ps-embedding-comment-item">
                    <strong>{w.workItem!.specimen.label}{b.label}</strong> — {t(blockStatusLabelKey(b.status))}
                    {b.id === w.workItem!.block.id && <span> ({t('embeddingStation.specimenSummary.current')})</span>}
                  </li>
                ))}
              </ul>
            </div>

            {/* Center: Piece Count / Mold & Orientation / Discrepancy / Split-Block */}
            <EmbeddingCenterPanel
              key={w.workItem.block.id}
              requirements={w.requirements}
              specimen={w.workItem.specimen}
              block={w.workItem.block}
              alertBadges={w.alertBadges}
              splitBlockGroupStatus={w.splitBlockGroupStatus}
              onToggleAlertFlag={handleToggleAlertFlag}
              onConfirmPieceCount={(count, orientation) => { void w.handleConfirmPieceCount(count, orientation); }}
              flaggerName={w.flaggerName}
              onFlagDiscrepancy={w.handleFlagDiscrepancy}
              onClearDiscrepancy={() => { void w.handleClearDiscrepancy(); }}
              onSetMoldAndOrientation={w.handleSetMoldAndOrientation}
              onGroupSplitBlocks={w.handleGroupSplitBlocks}
              onOpenComments={() => setCommentsOpen(true)}
            />

            {/* Right: Hardware & Print Control */}
            <CassettePrintPanel
              printer={printer}
              printerError={printerError}
              labelLayout={labelLayout}
              specimenLabel={w.workItem.specimen.label}
              blockLabel={w.workItem.block.label}
              cassetteReprintCount={w.workItem.block.cassetteReprintCount}
              lastCassetteReprintReason={w.workItem.block.lastCassetteReprintReason}
              onRequestReprint={() => { setReprintFeedback(null); setPendingReprint(true); }}
              reprintInFlight={reprintInFlight}
              reprintFeedback={reprintFeedback}
            />
          </div>
        </>
      )}

      {pendingReprint && (
        <CassetteReprintModal
          requirements={w.requirements}
          onReprint={reason => { void handleConfirmReprint(reason); }}
          onCancel={() => setPendingReprint(false)}
        />
      )}

      {commentsOpen && w.workItem && (
        <CommentDrawer
          title={t('embeddingStation.context.blockComments')}
          comments={w.workItem.block.comments ?? []}
          onClose={() => setCommentsOpen(false)}
          onSubmit={text => { void w.handleAddComment(text); }}
          requirements={w.requirements}
        />
      )}
    </div>
  );
};

export default EmbeddingStationPage;
