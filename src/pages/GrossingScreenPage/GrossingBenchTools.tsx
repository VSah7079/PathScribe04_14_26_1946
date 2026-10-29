// src/pages/GrossingScreenPage/GrossingBenchTools.tsx
// Batch 720 (Pete): the tools that were on the Synoptic report's Material tab, on the Grossing screen itself: print and release
// cassettes (with the triage checklist), gross photos (camera, foot pedal 1), the decalcification bench, and the Add-On Order
// Builder. It reuses the Material tab's own handlers (useSpecimenBlockManagement) so both screens behave the same.
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock } from '@/types/case/Specimen';
import type { CassetteColorDefinition } from '@/services/cassetteColors/ICassetteColorService';
import type { Batch } from '@/services/batches/IBatchService';
import { cassetteColorService, batchService } from '@/services';
import { useSpecimenBlockManagement } from '@/pages/SynopticReportPage/hooks/useSpecimenBlockManagement';
import GrossingReleasePanel from '@/pages/SynopticReportPage/components/GrossingReleasePanel';
import CameraCaptureControl from '@/components/GrossingHardware/CameraCaptureControl';
import { useEffectiveScanStation } from '@/hooks/useEffectiveScanStation';
import { useOpenCase } from '@/hooks/useOpenCase';
import { cassetteIdentifier } from '@/types/labels/LabelData';
import { caseRouter } from '@/services/cases/CaseRouter';
import './GrossingBenchTools.css';
import { useGrossingBenchEvents } from './hooks/useGrossingBenchEvents';
import type { ShowToast } from '@/pages/Synoptic/useSynopticToast';

type BlockParams = Parameters<typeof useSpecimenBlockManagement>[0];
const DECAL_NODE = 'Decal / Special Processing';

interface Props {
  caseData: Case;
  setCaseData: React.Dispatch<React.SetStateAction<Case | null>>;
  signingUser: BlockParams['signingUser'];
  knownVersionRef: React.MutableRefObject<number>;
  setConcurrencyConflict: (c: { actualVersion: number } | null) => void;
}

const GrossingBenchTools: React.FC<Props> = ({ caseData, setCaseData, signingUser, knownVersionRef, setConcurrencyConflict }) => {
  const { t } = useTranslation();
  const openCase = useOpenCase();
  const { effectiveStationId } = useEffectiveScanStation();
  const [colors, setColors] = useState<CassetteColorDefinition[]>([]);
  const [decalBatches, setDecalBatches] = useState<Batch[]>([]);
  const [decalBatchId, setDecalBatchId] = useState('');
  const [message, setMessage] = useState<{ text: string; kind: 'info' | 'warning' } | null>(null);
  const [decalBlock, setDecalBlock] = useState('');
  const [photoFor, setPhotoFor] = useState<string | null>(null);

  const showToast = useCallback<ShowToast>((text, kind) => setMessage({ text, kind: kind === 'warning' || kind === 'error' ? 'warning' : 'info' }), []);
  const blocks = useSpecimenBlockManagement({
    caseData, setCaseData: setCaseData as BlockParams['setCaseData'], signingUser, markDirty: () => undefined, knownVersionRef,
    setConcurrencyConflict, sendMaterialOrderToLis: async () => ({ ok: true }), showToast, effectiveStationId,
  });

  useEffect(() => {
    cassetteColorService.getAll().then(r => { if (r.ok) setColors(r.data); });
    batchService.getAll().then(r => {
      if (!r.ok) return;
      const active = (r.data as Batch[]).filter(b => b.processingNode === DECAL_NODE && b.status === 'active');
      setDecalBatches(active);
      setDecalBatchId(prev => prev || active[0]?.id || '');
    });
  }, []);

  const specimens: Specimen[] = caseData.specimens ?? [];
  const accession = caseData.accession?.fullAccession ?? caseData.id;
  const firstSpecimen = specimens[0];
  const blockIds = specimens.flatMap(sp => (sp.blocks ?? []).map((b: HistologyBlock) => cassetteIdentifier(accession, sp.label, b.label)));

  const assignDecal = useCallback(async () => {
    const batch = decalBatches.find(b => b.id === decalBatchId);
    if (!batch) { showToast(t('grossingBench.decal.noBatch'), 'warning'); return; }
    const scan = decalBlock || blockIds[0] || '';
    if (!scan) { showToast(t('grossingBench.decal.noBlock'), 'warning'); return; }
    const out = await batchService.addItemByScan(batch.id, scan, signingUser?.id ?? '', signingUser?.name ?? '');
    if (out.outcome === 'added') showToast(t('grossingBench.decal.added', { block: scan, batch: batch.masterBarcode }), 'info', { containsPhi: true });
    else if (out.outcome === 'already-in-batch') showToast(t('grossingBench.decal.already', { block: out.displayId }), 'warning', { containsPhi: true });
    else if (out.outcome === 'in-other-active-batch') showToast(t('grossingBench.decal.otherBatch', { block: out.displayId, batch: out.otherMasterBarcode }), 'warning', { containsPhi: true });
    else showToast(t('grossingBench.decal.notFound'), 'warning');
  }, [decalBatches, decalBatchId, decalBlock, blockIds, signingUser, showToast, t]);

  const takePhoto = useCallback(() => { if (firstSpecimen) setPhotoFor(firstSpecimen.id); }, [firstSpecimen]);
  useGrossingBenchEvents({
    printCassettes: () => blocks.handleBatchPrintCassettes(),
    takePhoto, assignDecal: () => void assignDecal(),
    addOnOrder: () => void openCase(caseData.id, 'addOnOrders'),
  });

  return (
    <section className="ps-grossing-bench" aria-label={t('grossingBench.title')}>
      <h2 className="ps-grossing-bench-title">{t('grossingBench.title')}</h2>
      <div className="ps-grossing-bench-actions">
        <button type="button" className="ps-btn-secondary" onClick={() => blocks.handleBatchPrintCassettes()} disabled={blocks.batchPrintBlocked}>{t('grossingBench.printCassettes')}</button>
        <button type="button" className="ps-btn-secondary" onClick={takePhoto} disabled={!firstSpecimen}>{t('grossingBench.takePhoto')}</button>
        <button type="button" className="ps-btn-secondary" onClick={() => void openCase(caseData.id, 'addOnOrders')}>{t('grossingBench.addOnOrders')}</button>
        <label className="ps-grossing-bench-decal">
          <span>{t('grossingBench.decal.label')}</span>
          <select className="ps-conf-select" value={decalBatchId} onChange={e => setDecalBatchId(e.target.value)} aria-label={t('grossingBench.decal.label')}>
            {decalBatches.length === 0 && <option value="">{t('grossingBench.decal.none')}</option>}
            {decalBatches.map(b => <option key={b.id} value={b.id}>{b.masterBarcode}</option>)}
          </select>
        </label>
        <select className="ps-conf-select" value={decalBlock} onChange={e => setDecalBlock(e.target.value)} aria-label={t('grossingBench.decal.block')}>
          {blockIds.map(id => <option key={id} value={id}>{id}</option>)}
        </select>
        <button type="button" className="ps-btn-secondary" onClick={() => void assignDecal()} disabled={decalBatches.length === 0}>{t('grossingBench.decal.assign')}</button>
      </div>
      <p className="ps-grossing-bench-hint">{t('grossingBench.hint')}</p>
      {message && <p role="status" data-phi="accession" className={`ps-grossing-bench-message ps-grossing-bench-message--${message.kind}`}>{message.text}</p>}
      {photoFor && (
        <CameraCaptureControl
          kind="gross_photo" capturedBy={signingUser?.name}
          onCapture={asset => {
            const sp = specimens.find(s => s.id === photoFor);
            setPhotoFor(null);
            if (!sp) return;
            const next = specimens.map(x => x.id === sp.id ? { ...x, digitalAssets: [...(x.digitalAssets ?? []), asset] } : x);
            setCaseData(prev => (prev ? { ...prev, specimens: next } : prev));
            caseRouter.updateCase(caseData.id, { specimens: next }, knownVersionRef.current)
              .then(() => { knownVersionRef.current += 1; })
              .catch(e => console.error('[GrossingBench] photo save failed', e));
          }}
          onClose={() => setPhotoFor(null)}
        />
      )}
      {specimens.map(sp => (
        <GrossingReleasePanel
          key={sp.id}
          specimenLabel={sp.label}
          pendingBlocks={(sp.blocks ?? []).filter(b => b.status === 'Pending' && b.cassetteColorId)}
          cassetteColors={colors}
          onOverrideColor={(blockId, colorId) => void blocks.handleUpdateBlock(sp.id, blockId, { cassetteColorId: colorId, cassetteColorOverridden: true })}
          onRemove={blockId => void blocks.handleRemovePendingBlock(sp.id, blockId)}
          onRelease={ids => void blocks.handleReleaseGrossingBlocks(sp.id, ids)}
          triage={sp.triage}
          onConfirmChecklistItem={(i, c) => void blocks.handleConfirmTriageChecklistItem(sp.id, i, c)}
          onOverrideTriage={reason => void blocks.handleOverrideTriage(sp.id, reason)}
        />
      ))}
    </section>
  );
};

export default GrossingBenchTools;
