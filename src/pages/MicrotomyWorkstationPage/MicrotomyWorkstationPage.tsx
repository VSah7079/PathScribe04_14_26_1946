// src/pages/MicrotomyWorkstationPage/MicrotomyWorkstationPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-284 — "Microtomy Workstation: real-time on-demand/batch
// slide printing & etching UI." A dedicated, bench-scoped page
// (reached by scanning a block/decant barcode at a real 'Microtomy /
// Sectioning' ScanStation, or a direct block selection) — deliberately
// NOT a case-scoped route like GrossingScreenPage/SynopticReportPage,
// since a microtome tech works block-by-block across many cases in a
// single shift, not one case at a time.
//
// Real, per direct follow-up asking to keep this visually consistent
// with GrossingScreenPage/SynopticReportPage rather than a new visual
// language: same header/back-button convention, same ps-overlay/
// ps-modal-dark modal pattern, same dark palette — see
// pathscribe.css's own ps-microtomy-* block, styled to match
// ps-grossing-* directly.
//
// Scope: the "1:1 visual canvas" label preview is a proportionally
// scaled schematic, not a pixel-exact DataMatrix render. Superseded
// (Batch 460): this header used to say shared cassettes (MatrixBlock)
// weren't supported; a scanned matrix block is now worked here like any
// block, with its participating specimens and cores shown on the left.
// Batch 460 also adds billing at the bench (MicrotomyBillingPanel).
//
// **Real fix, per direct follow-up ("these foot pedals are ubiquitous
// and we must support them"):** the physical foot-pedal integration
// this file's own header used to disclaim as out of reach ("no
// browser API reaches a generic USB pedal without a native agent")
// was independently re-verified and found incorrect — the Gamepad API
// (HID-class pedals) plus keyboard-emulation capture
// (useFootPedal.ts, built for SynopticReportPage.tsx's own dictation
// controls) already reaches real, physical foot pedals from the
// browser today, no native agent required. PS-284's own named
// "Print/Etch Next... physical foot pedal integration" trigger is now
// wired below via that same, already-working hook — Pedal 2 (see
// FootPedalConfig.ts's own doc comment).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { printSettingsService, actionRegistryService, microtomyCancelMissing } from '@/services';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { DEFAULT_SLIDE_LABEL_LAYOUT } from '@/services/printSettings/IPrintSettingsService';
import type { SlideLabelLayoutConfig } from '@/services/printSettings/IPrintSettingsService';
import { resolveSlideLabelFitWarnings } from '@/utils/labels/resolveSlideLabelFitWarnings';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';
import { scanStationService } from '@/services';
import { printerProfileService } from '@/services';
import type { StainOrder } from '@/types/case/Specimen';
import { useFootPedal } from '@/hooks/useFootPedal';
import { useMicrotomyWorkstation } from './hooks/useMicrotomyWorkstation';
import { useMicrotomyBilling } from './hooks/useMicrotomyBilling';
import MicrotomyBillingPanel from './components/MicrotomyBillingPanel';
import SlideGridPanel from './components/SlideGridPanel';
import HardwarePrintPanel from './components/HardwarePrintPanel';
import CytologyPanel from './components/CytologyPanel';
import CommentDrawer from './components/CommentDrawer';
import BlockExhaustedControl from './components/BlockExhaustedControl';
import ExhaustedBlockBanner from '@/components/Workstation/ExhaustedBlockBanner';
import ItemEndStatePanel from '@/components/Workstation/ItemEndStatePanel';
import BlockPieceMapPanel from '@/components/Workstation/BlockPieceMapPanel';
import BatchProgressModal from './components/BatchProgressModal';
import UndoToast from './components/UndoToast';
import { computeNextUnprintedStain, MICROTOMY_CANCEL_REASONS, MICROTOMY_REASON_KEYS } from '@/utils/microtomyOperations';
// Batch 726 (Lab Workflow & Batch spec, Decision 1): carriers at this workstation.
import { useStationCarrier } from '@/hooks/useStationCarrier';
import StationCarrierPanel from '@/components/Workstation/StationCarrierPanel';
import { StationScanField } from '@/components/Workstation/StationScanField';
import ScanTrailPanel from '@/components/Workstation/ScanTrailPanel';
import './MicrotomyWorkstationPage.css';
import '../../pathscribe.css';

const MicrotomyWorkstationPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const microtomyRequirements = useFieldRequirements('microtomy');
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t('microtomyWorkstation.pageTitle'), '/workstations/microtomy'); }, [pushCrumb, t]);

  const w = useMicrotomyWorkstation();
  const carrier = useStationCarrier('microtomy');
  const billing = useMicrotomyBilling(w.workItem, w.stainTypes, w.adoptSavedCase);

  // Batch 388: this page has its own voice/keyboard context ("add comment", "add stain").
  useEffect(() => {
    actionRegistryService.setCurrentContext(VOICE_CONTEXT.MICROTOMY);
    return () => { actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); };
  }, []);
  const [labelLayout, setLabelLayout] = useState<SlideLabelLayoutConfig>(DEFAULT_SLIDE_LABEL_LAYOUT);
  const [printer, setPrinter] = useState<PrinterProfile | null>(null);
  const [printerError, setPrinterError] = useState<string | null>(null);
  const [commentTarget, setCommentTarget] = useState<{ scope: 'block'; } | { scope: 'stain'; stain: StainOrder } | null>(null);

  useEffect(() => { w.loadStainTypes(); w.loadDefaultPrintMode(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Real, per PS-284's own named "Print/Etch Next... physical foot
  // pedal integration" trigger — Pedal 2, same real hook/binding
  // already working for SynopticReportPage.tsx's dictation controls.
  // w.handlePrintNext() already no-ops safely with no open work item
  // or no real unprinted slide left (see its own doc comment in
  // useMicrotomyWorkstation.ts), so no extra guard is needed here.
  useFootPedal({ actions: { pedal2_nextField: () => { w.handlePrintNext(); } } });

  useEffect(() => {
    printSettingsService.get().then(res => { if (res.ok) setLabelLayout(res.data.slideLabelLayout); });
  }, []);

  useEffect(() => {
    if (!w.effectiveStationId) { setPrinter(null); setPrinterError(t('microtomyWorkstation.hardware.noStation')); return; }
    scanStationService.getById(w.effectiveStationId).then(async stationRes => {
      if (!stationRes.ok || !stationRes.data.supportsPrinting || !stationRes.data.cassetteSlidePrinterProfileId) {
        setPrinter(null); setPrinterError(t('microtomyWorkstation.hardware.notConfigured'));
        return;
      }
      const printerRes = await printerProfileService.getById(stationRes.data.cassetteSlidePrinterProfileId);
      if (printerRes.ok && printerRes.data) { setPrinter(printerRes.data); setPrinterError(null); }
      else { setPrinter(null); setPrinterError(t('microtomyWorkstation.hardware.profileMissing')); }
    });
  }, [w.effectiveStationId, t]);

  // Real, per this app's own established scan pattern (useGlobalMaterialScanTracking.ts
  // et al.) — a real barcode wedge scanner just types into whatever
  // has focus, which the manual form above already handles; this
  // listener additionally handles the global PATHSCRIBE_SCAN event so
  // a scan is picked up even when the scan input isn't focused (e.g.
  // right after finishing a prior block, before a tech clicks back
  // into the field). Same 'STATION:' guard every other real listener
  // here uses — a station-switch barcode is never also a material scan.
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

  // Real, per removeMicrotomyStain's own doc comment: an unprinted
  // slide is removed immediately; a printed one instead sets
  // w.pendingRemoval, and the reason modal below handles the rest.
  const handleRemoveClick = useCallback((stainId: string) => { w.requestRemoveStain(stainId); }, [w]);

  const fitWarnings = resolveSlideLabelFitWarnings(labelLayout);

  const stains = !w.workItem ? [] : w.workItem.kind === 'block' ? w.workItem.block.stains : w.workItem.decant.stains;
  const nextUnprinted = computeNextUnprintedStain(stains);
  const previewStain = w.printMode === 'on_demand' ? nextUnprinted : stains.find(s => w.batchSelection.has(s.id));

  const commentComments = !commentTarget
    ? []
    : commentTarget.scope === 'block' && w.workItem?.kind === 'block'
      ? (w.workItem.block.comments ?? [])
      : commentTarget.scope === 'stain'
        ? (commentTarget.stain.comments ?? [])
        : [];

  return (
    <div className="ps-microtomy-page">
      <div className="ps-microtomy-header">
        <button className="ps-btn-secondary" onClick={() => navigate('/worklist')}>{t('common.back')}</button>
        <h1 className="ps-microtomy-title">🔬 {t('microtomyWorkstation.pageTitle')}</h1>
      </div>

      <StationCarrierPanel carrier={carrier} outputCandidates={stains.filter(s => s.printStatus === 'Printed').map(s => s.displayId).filter((id): id is string => !!id)} />
      {/* Batch 729 (spec §7.4): the case's station scan trail. */}
      {w.workItem && <ScanTrailPanel caseAccession={w.workItem.caseData.accession?.fullAccession ?? w.workItem.caseData.id} />}

      {!w.workItem ? (
        <div className="ps-microtomy-panel">
          <p className="ps-microtomy-panel-title">{t('microtomyWorkstation.scanPrompt')}</p>
          <StationScanField onScan={handleScan} placeholder={t('microtomyWorkstation.scanPlaceholder') ?? ''} submitLabel={t('microtomyWorkstation.scanSubmit')} />
          {w.scanError && <div className="ps-microtomy-scan-error">{w.scanError}</div>}
        </div>
      ) : (
        <>
          <div className="ps-microtomy-context-bar">
            <span>{t('microtomyWorkstation.context.accession')} <strong data-phi="accession">{w.workItem.caseData.accession?.fullAccession ?? w.workItem.caseData.id}</strong></span>
            <span>{t('microtomyWorkstation.context.patient')} <strong data-phi="name">{`${w.workItem.caseData.patient?.givenNames ?? ''} ${w.workItem.caseData.patient?.familyNames ?? ''}`.trim() || '—'}</strong></span>
            <span>{t('microtomyWorkstation.context.dob')} <strong data-phi="dob">{w.workItem.caseData.patient?.dateOfBirth ? formatDate(w.workItem.caseData.patient.dateOfBirth, i18n.language) : '—'}</strong></span>
            <span>
              {t('microtomyWorkstation.context.specimenBlock')}{' '}
              <strong>{w.workItem.specimen.label}{w.workItem.kind === 'block' ? w.workItem.block.label : w.workItem.decant.label}</strong>
            </span>
            <span>{t('microtomyWorkstation.context.specimenType')} <strong>{w.workItem.specimen.description ?? '—'}</strong></span>
            <span className="ps-ml-auto"><StationScanField compact onScan={handleScan} placeholder={t('microtomyWorkstation.scanPlaceholder') ?? ''} submitLabel={t('microtomyWorkstation.scanSubmit')} /></span>
            <button type="button" className="ps-microtomy-row-btn" onClick={() => w.clearWorkItem()}>
              {t('microtomyWorkstation.context.scanNext')}
            </button>
          </div>
          {/* Batch 729 (spec §7.5): the case's other blocks still waiting to be cut, inline (no window). */}
          {w.blocksStillWaiting.length > 0 && (
            <p className="ps-microtomy-waiting-note" role="status">
              {t('microtomyWorkstation.blocksStillWaiting', { count: w.blocksStillWaiting.length, blocks: w.blocksStillWaiting.join(', ') })}
            </p>
          )}

          {w.saveError && <div className="ps-microtomy-save-error" role="alert">{w.saveError}</div>}
          {w.printNotice && <div className="ps-microtomy-save-error" role="alert">{w.printNotice}</div>}
          <div className="ps-microtomy-layout">
            {/* Left: Work Item Context */}
            <div>
              {w.workItem.kind === 'block' && (() => {
                const block = w.workItem.block;
                const alertFlags = ['tinyTissue', 'fragile', 'requiresDecal'] as const;
                return (
                  <div className="ps-microtomy-panel ps-mb-14">
                    <p className="ps-microtomy-panel-title">{t('microtomyWorkstation.context.title')}</p>
                    <div className="ps-microtomy-alert-badges">
                      {alertFlags.map(flag => (
                        <button
                          key={flag} type="button"
                          className={`ps-microtomy-alert-badge${block[flag] ? '' : ' ps-microtomy-alert-badge--off'}`}
                          onClick={() => w.handleSetAlertFlags({ [flag]: !block[flag] } as Record<typeof flag, boolean>)}
                        >
                          {t(`microtomyWorkstation.context.flag.${flag}`)}
                        </button>
                      ))}
                    </div>
                    {/* Batch 731 (spec §10.6): what remains of an exhausted block, and orders waiting for re-embedding. */}
                    <ExhaustedBlockBanner specimen={w.workItem.specimen} block={block} />
                    <BlockExhaustedControl block={block} onFlag={w.handleFlagBlockExhausted} />
                    {/* Batch 732 (spec §11): block type, slide size and piece map; a piece can be marked used up. */}
                    {w.pieceView && <BlockPieceMapPanel blockType={w.pieceView.blockType} slideSize={w.pieceView.slideSize} pieces={w.pieceView.pieces} onMarkExhausted={w.pieceView.canMark ? w.handleMarkPieceExhausted : undefined} />}
                    {w.workItem.matrixBlock && (
                      <>
                        <div className="ps-microtomy-context-field">{t('microtomyWorkstation.context.matrixCores')}</div>
                        <ul className="ps-microtomy-matrix-list">
                          {[...w.workItem.matrixBlock.participants].sort((a, b) => a.positionInBlock - b.positionInBlock).map(p => (
                            <li key={p.specimenId}>
                              <strong>{t('microtomyWorkstation.context.matrixPosition', { n: p.positionInBlock })}</strong>
                              {t('microtomyWorkstation.context.matrixSpecimen', { label: (w.workItem!.caseData.specimens ?? []).find(sp => sp.id === p.specimenId)?.label ?? '—' })}
                              {p.tissueType ? ` · ${p.tissueType}` : ''}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    <div className="ps-microtomy-context-field">{t('microtomyWorkstation.context.status')}<strong>{block.status}</strong></div>
                    <div className="ps-microtomy-context-field">{t('microtomyWorkstation.context.pieceCount')}<strong>{block.pieceCount ?? '—'}</strong></div>
                    {block.tissueDescription && (
                      <div className="ps-microtomy-context-field">{t('microtomyWorkstation.context.tissueDescription')}<strong>{block.tissueDescription}</strong></div>
                    )}
                    <button type="button" className="ps-microtomy-row-btn" onClick={() => setCommentTarget({ scope: 'block' })}>
                      💬 {t('microtomyWorkstation.context.blockComments')}{block.comments?.length ? ` (${block.comments.length})` : ''}
                    </button>
                    {/* Batch 731 (spec §10.5): the block's end state. */}
                    {w.endStateItem && <ItemEndStatePanel {...w.endStateItem} stationId={w.effectiveStationId} />}
                  </div>
                );
              })()}
              <div className="ps-microtomy-panel">
                <p className="ps-microtomy-panel-title">{t('microtomyWorkstation.context.priorHistory')}</p>
                <ul className="ps-microtomy-history-list">
                  {stains.filter(s => s.printedAt).sort((a, b) => (b.printedAt ?? '').localeCompare(a.printedAt ?? '')).map(s => (
                    <li key={s.id}>{s.stainName} — {formatDateTime(s.printedAt, i18n.language)}</li>
                  ))}
                  {stains.every(s => !s.printedAt) && <li>{t('microtomyWorkstation.context.noHistory')}</li>}
                </ul>
              </div>
              <MicrotomyBillingPanel
                caseData={w.workItem.caseData}
                preview={billing.preview}
                fullReview={billing.fullReview}
                onSetFullReview={billing.setFullReview}
                review={billing.review}
                selectedMaterialId={w.workItem.kind === 'block' ? (w.workItem.matrixBlock ? undefined : w.workItem.block.id) : w.workItem.decant.id}
              />
            </div>

            {/* Center: Interactive Slide Grid (+ Cytology panel for a decant) */}
            <div>
              {w.workItem.kind === 'decant' && (
                <CytologyPanel decant={w.workItem.decant} specimen={w.workItem.specimen} onUpdateFields={w.handleUpdateCytologyFields} onApplySuggestions={w.handleApplyPrepSuggestions} />
              )}
              <SlideGridPanel
                blockSlideSize={w.pieceView?.slideSize}
                stains={stains}
                stainTypes={w.stainTypes}
                printMode={w.printMode}
                batchSelection={w.batchSelection}
                onToggleSelect={id => w.setBatchSelection(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; })}
                onPrintOne={stain => w.handlePrintSelected([stain.id])}
                onReprint={w.handleReprint}
                onAddLevel={stain => w.handleAddLevelOfExistingStain(stain)}
                onRemove={handleRemoveClick}
                onAddStain={w.handleAddStain}
                onOpenComments={stain => setCommentTarget({ scope: 'stain', stain })}
                onReorder={w.handleReorder}
                supportsControlPairing={w.workItem.kind === 'block'}
                requirements={microtomyRequirements}
              />
            </div>

            {/* Right: Hardware & Print Control */}
            <HardwarePrintPanel
              printMode={w.printMode}
              onSetPrintMode={w.setPrintMode}
              nextStain={nextUnprinted}
              onPrintNext={w.handlePrintNext}
              batchSelectedCount={w.batchSelection.size}
              onPrintBatch={() => w.handlePrintSelected(Array.from(w.batchSelection))}
              printer={printer}
              printerError={printerError}
              labelLayout={labelLayout}
              fitWarnings={fitWarnings}
              previewStain={previewStain}
              specimenLabel={w.workItem.specimen.label}
              blockLabel={w.workItem.kind === 'block' ? w.workItem.block.label : w.workItem.decant.label}
            />
          </div>
        </>
      )}

      {w.pendingRemoval && (
        <div className="ps-overlay" onClick={w.cancelPendingRemoval}>
          <div className="ps-modal-dark" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="ps-batch-modal-header"><div className="ps-batch-modal-title">{t('microtomyWorkstation.removeReason.title')}</div></div>
            <div className="ps-batch-modal-body">
              <p>{t('microtomyWorkstation.removeReason.body')}</p>
              <select aria-label={t('microtomyWorkstation.removeReason.title')} className="ps-microtomy-field-select" defaultValue="" onChange={e => { if (e.target.value && microtomyCancelMissing(e.target.value, microtomyRequirements).length === 0) w.confirmPendingRemoval(e.target.value as typeof MICROTOMY_CANCEL_REASONS[number]); }}>
                <option value="" disabled>{t('microtomyWorkstation.removeReason.select')}</option>
                {MICROTOMY_CANCEL_REASONS.map(r => <option key={r} value={r}>{t(`microtomyWorkstation.reasons.${MICROTOMY_REASON_KEYS[r]}`)}</option>)}
              </select>
            </div>
            <div className="ps-batch-modal-footer">
              <button className="ps-btn-secondary" onClick={w.cancelPendingRemoval}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {commentTarget && (
        <CommentDrawer
          title={commentTarget.scope === 'block' ? t('microtomyWorkstation.context.blockComments') : t('microtomyWorkstation.slideGrid.slideComments')}
          comments={commentComments}
          showPrintToggle={commentTarget.scope === 'stain'}
          requirements={microtomyRequirements}
          onClose={() => setCommentTarget(null)}
          onSubmit={(text, printsOnLabel) => {
            if (commentTarget.scope === 'block') w.handleAddBlockComment(text);
            else w.handleAddStainComment(commentTarget.stain.id, text, printsOnLabel);
          }}
        />
      )}

      {w.undoNotice && <UndoToast notice={w.undoNotice} onUndo={w.undoLast} onClose={w.dismissUndo} />}

      {w.batchProgress && <BatchProgressModal entries={w.batchProgress} onClose={w.clearBatchProgress} />}
    </div>
  );
};

export default MicrotomyWorkstationPage;
