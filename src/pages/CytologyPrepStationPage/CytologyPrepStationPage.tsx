// src/pages/CytologyPrepStationPage/CytologyPrepStationPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 740 (Pete, fluid decision 1, Oct 30, 2026): the Cytology Preparation bench. Cytology staff decant and prepare
// fluids here (volume, appearance, yield, the suggested slides, printing them) and make cell blocks; a cell block goes
// to the Microtome only after its hand-off scan (source, then cassette). It reuses the Microtome's bench logic
// (useMicrotomyWorkstation with bench 'cytologyPrep', which refuses blocks) and its panels; the hand-off is
// useCellBlockHandoff. Before this batch fluids were worked at the Microtome.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { useStationSlidePrinter } from '@/hooks/useStationSlidePrinter';
import { resolveSlideLabelFitWarnings } from '@/utils/labels/resolveSlideLabelFitWarnings';
import { computeNextUnprintedStain } from '@/utils/microtomyOperations';
import { decantTypeText } from '@/utils/decantTypeText';
import { StationScanField } from '@/components/Workstation/StationScanField';
import ScanTrailPanel from '@/components/Workstation/ScanTrailPanel';
import { ForeignIdTag, TypedEntryCheck } from '@/components/Workstation/BenchIdentity';
import { useTypedEntryCheck } from '@/hooks/useTypedEntryCheck';
import { useMicrotomyWorkstation } from '../MicrotomyWorkstationPage/hooks/useMicrotomyWorkstation';
import SlideGridPanel from '../MicrotomyWorkstationPage/components/SlideGridPanel';
import HardwarePrintPanel from '../MicrotomyWorkstationPage/components/HardwarePrintPanel';
import CytologyPanel from '../MicrotomyWorkstationPage/components/CytologyPanel';
import UndoToast from '../MicrotomyWorkstationPage/components/UndoToast';
import CellBlockHandoffPanel from './components/CellBlockHandoffPanel';
import { useCellBlockHandoff } from './hooks/useCellBlockHandoff';
import DivideSpecimenPanel from '@/components/Material/DivideSpecimenPanel';
import { useSpecimenDivision } from '@/hooks/useSpecimenDivision';
import { useProtocolDivisionPurposes } from '@/hooks/useProtocolDivisionPurposes';
import '../MicrotomyWorkstationPage/MicrotomyWorkstationPage.css';
import './CytologyPrepStationPage.css';

const CytologyPrepStationPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const requirements = useFieldRequirements('microtomy');
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t('cytologyPrep.pageTitle'), '/workstations/cytology-prep'); }, [pushCrumb, t]);

  const w = useMicrotomyWorkstation({ bench: 'cytologyPrep' });
  useEffect(() => { w.loadStainTypes(); w.loadDefaultPrintMode(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const station = useStationSlidePrinter(w.effectiveStationId);

  const item = w.workItem && w.workItem.kind === 'decant' ? w.workItem : null;
  const handoff = useCellBlockHandoff({
    caseData: item?.caseData ?? null, specimen: item?.specimen ?? null, decant: item?.decant ?? null,
    actor: { id: w.actor.id, name: w.actor.name ?? w.actor.id }, stationId: w.effectiveStationId ?? undefined, adoptSavedCase: w.adoptSavedCase,
  });

  // Batch 741 (fluid decisions 2 and 3): Divide specimen and aliquot tracking at the bench.
  const division = useSpecimenDivision(item?.caseData ?? null, w.actor.name ?? w.actor.id, w.adoptSavedCase);
  const purposes = useProtocolDivisionPurposes(item?.specimen.protocolSnapshot?.id);

  useEffect(() => {
    const listener = (e: Event) => {
      const raw = (e as CustomEvent<{ raw: string }>).detail?.raw;
      if (!raw || raw.trim().toUpperCase().startsWith('STATION:')) return;
      void w.resolveScan(raw);
    };
    window.addEventListener('PATHSCRIBE_SCAN', listener);
    return () => window.removeEventListener('PATHSCRIBE_SCAN', listener);
  }, [w]);
  const handleScan = useCallback(async (raw: string) => { await w.resolveScan(raw); }, [w]);

  const stains = item ? item.decant.stains : [];
  const nextUnprinted = computeNextUnprintedStain(stains);
  const previewStain = w.printMode === 'on_demand' ? nextUnprinted : stains.find(s => w.batchSelection.has(s.id));
  const cellBlocks = item ? (item.specimen.decants ?? []).filter(d => d.decantType === 'cell_block') : [];
  // Batch 759 (spec §2.2, §3): after a typed entry, the identifiers to check against the container.
  const typedEntry = useTypedEntryCheck([item?.caseData.accession?.fullAccession, item?.caseData.id]);

  return (
    <div className="ps-microtomy-page">
      <div className="ps-microtomy-header">
        <button className="ps-btn-secondary" onClick={() => navigate('/pathology-workspace')}>{t('common.back')}</button>
        <h1 className="ps-microtomy-title">🧪 {t('cytologyPrep.pageTitle')}</h1>
      </div>
      {item && <ScanTrailPanel caseAccession={item.caseData.accession?.fullAccession ?? item.caseData.id} />}

      {!item ? (
        <div className="ps-microtomy-panel">
          <p className="ps-microtomy-panel-title">{t('cytologyPrep.scanPrompt')}</p>
          <StationScanField onScan={handleScan} placeholder={t('cytologyPrep.scanPlaceholder')} submitLabel={t('microtomyWorkstation.scanSubmit')} />
          {w.scanError && <div className="ps-microtomy-scan-error" role="alert">{w.scanError}</div>}
        </div>
      ) : (
        <>
          <div className="ps-microtomy-context-bar">
            <span>{t('microtomyWorkstation.context.accession')} <strong data-phi="accession">{item.caseData.accession?.fullAccession ?? item.caseData.id}</strong></span>
            {/* Batch 759 (Patient Verification spec §1): no patient name, date of birth or MRN at the bench; an outside case shows its Foreign Identifier. */}
            <ForeignIdTag order={item.caseData.order} items={[item.decant, item.specimen]} />
            <span>{t('cytologyPrep.decant')} <strong>{t('cytologyScreening.materialDrawer.decantHeading', { label: `${item.specimen.label}${item.decant.label}`, type: decantTypeText(t, item.decant) })}</strong></span>
            <span>{t('microtomyWorkstation.context.specimenType')} <strong>{item.specimen.description ?? '—'}</strong></span>
            <span className="ps-ml-auto"><StationScanField compact onScan={handleScan} placeholder={t('cytologyPrep.scanPlaceholder')} submitLabel={t('microtomyWorkstation.scanSubmit')} /></span>
            <button type="button" className="ps-microtomy-row-btn" onClick={() => { w.clearWorkItem(); handoff.clearMessage(); }}>{t('microtomyWorkstation.context.scanNext')}</button>
          </div>
          {typedEntry && <TypedEntryCheck accession={item.caseData.accession?.fullAccession ?? item.caseData.id} source={t('benchIdentity.specimenSource', { label: item.specimen.label, description: item.specimen.description ?? '—' })} />}
          {w.scanError && <div className="ps-microtomy-scan-error" role="alert">{w.scanError}</div>}
          {w.saveError && <div className="ps-microtomy-save-error" role="alert">{w.saveError}</div>}
          {w.printNotice && <div className="ps-microtomy-save-error" role="alert">{w.printNotice}</div>}
          <div className="ps-microtomy-layout">
            <div>
              {item.decant.decantType !== 'cell_block' && (
                <CytologyPanel decant={item.decant} specimen={item.specimen} onUpdateFields={w.handleUpdateCytologyFields} onApplySuggestions={w.handleApplyPrepSuggestions} />
              )}
              <DivideSpecimenPanel key={item.specimen.id} specimen={item.specimen as never} suggestedPurposes={purposes} busy={division.busy} message={division.message} onDivide={division.divide} onStatus={division.setStatus} />
              <CellBlockHandoffPanel
                specimenLabel={item.specimen.label} cellBlocks={cellBlocks} canMake={item.decant.decantType !== 'cell_block'}
                busy={handoff.busy} message={handoff.message} onMake={() => { void handoff.makeCellBlock(); }}
                onHandOff={(id, scans) => { void handoff.handOff(id, scans); }}
                onPrintLabel={cb => { void handoff.printLabel(cb); }}
              />
            </div>
            <div>
              <SlideGridPanel
                stains={stains} stainTypes={w.stainTypes} printMode={w.printMode} batchSelection={w.batchSelection}
                onToggleSelect={id => w.setBatchSelection(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; })}
                onPrintOne={stain => w.handlePrintSelected([stain.id])}
                onReprint={w.handleReprint}
                onAddLevel={stain => w.handleAddLevelOfExistingStain(stain)}
                onRemove={id => w.requestRemoveStain(id)}
                onAddStain={w.handleAddStain}
                onOpenComments={() => undefined}
                onReorder={w.handleReorder}
                supportsControlPairing={false}
                requirements={requirements}
              />
            </div>
            <HardwarePrintPanel
              printMode={w.printMode} onSetPrintMode={w.setPrintMode} nextStain={nextUnprinted} onPrintNext={w.handlePrintNext}
              batchSelectedCount={w.batchSelection.size} onPrintBatch={() => w.handlePrintSelected(Array.from(w.batchSelection))}
              printer={station.printer} printerError={station.errorKey ? t(`microtomyWorkstation.hardware.${station.errorKey}`) : null}
              labelLayout={station.labelLayout} fitWarnings={resolveSlideLabelFitWarnings(station.labelLayout)} previewStain={previewStain}
              specimenLabel={item.specimen.label} blockLabel={item.decant.label}
            />
          </div>
        </>
      )}
      {w.undoNotice && <UndoToast notice={w.undoNotice} onUndo={w.undoLast} onClose={w.dismissUndo} />}
    </div>
  );
};

export default CytologyPrepStationPage;
