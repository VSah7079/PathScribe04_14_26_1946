// src/components/Workstation/StationCarrierPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 726 (Lab Workflow & Batch spec, Decision 1, §4): the carrier card on the
// Embedding, Microtome and Slide Distribution workstations. Shows the open
// carriers for this station, the carrier loaded here with its unloading
// progress, the Microtome's output tray, the decisions a scan needs (another
// step's carrier, an item not in the carrier) and what just happened. With no
// station set it asks for one, because nothing is recorded without it (§7.6).
// Presentation only: hooks/useStationCarrier.ts does the work.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useSelectableScanStations } from '@/hooks/useSelectableScanStations';
import { useEffectiveScanStation } from '@/hooks/useEffectiveScanStation';
import { formatDateTime } from '@/utils/formatDate';
import { carrierItemRows, manifestProgress, nodesForStationStage, MANUAL_CHECK_OFF_REASONS, type ManualCheckOffReason } from '@/services/batches/stationCarrierRules';
import { reconciliationGate } from '@/services/batches/batchListView';
import type { StationCarrier } from '@/hooks/useStationCarrier';
import './StationCarrierPanel.css';

interface Props {
  carrier: StationCarrier;
  /** Batch 757: checks an item off the loaded carrier by hand (a label that won't scan), with the reason. */
  onCheckOff?: (displayId: string, reason: ManualCheckOffReason) => void;
}

// Batch 758: the Microtome's bench counter (slides confirmed before a staining rack was scanned).
// Batch 757: slides go into the Microtome's output tray one at a time, by the dual scan (the label scanned back), so
// the "Add printed slides to tray" button (which skipped that scan) is gone.
const StationCarrierPanel: React.FC<Props> = ({ carrier, onCheckOff }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { stations } = useSelectableScanStations();
  const { setStationId } = useEffectiveScanStation();
  const [pick, setPick] = useState('');
  const [checkOffFor, setCheckOffFor] = useState<string | null>(null);
  const { station, carriers, loaded, output, notice, pending, busy, nodes } = carrier;

  // The station picker starts on a station for this workstation's own step, when the user has one.
  useEffect(() => {
    if (pick || stations.length === 0) return;
    const forHere = stations.find(s => nodesForStationStage(s.workflowStage).some(n => nodes.includes(n)));
    setPick((forHere ?? stations[0]).id);
  }, [stations, nodes, pick]);

  const nodeLabel = (node: string) => t(`batchManagement.nodes.${node}`);
  const noticeValues = (values: Record<string, string | number> = {}) => ({
    ...values,
    ...(values.from ? { from: nodeLabel(String(values.from)) } : {}),
    ...(values.at ? { at: formatDateTime(String(values.at), i18n.language) } : {}),
  });

  const progress = loaded ? manifestProgress(loaded) : null;
  const gate = loaded ? reconciliationGate(loaded) : null;

  return (
    <section className="ps-carrier-panel" aria-label={t('stationCarrier.title')}>
      <div className="ps-carrier-head">
        <h2 className="ps-carrier-title">{t('stationCarrier.title')}</h2>
        {station && (
          <span className="ps-carrier-station">
            {t('stationCarrier.stationLine', { station: station.name })}
          </span>
        )}
      </div>

      {!station && (
        <div className="ps-carrier-nostation" role="status">
          <p className="ps-carrier-text">{t('stationCarrier.noStation')}</p>
          {stations.length > 0 && (
            <div className="ps-carrier-row">
              <select className="ps-carrier-select" value={pick} onChange={e => setPick(e.target.value)} aria-label={t('stationCarrier.chooseStation')}>
                {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button type="button" className="ps-btn-primary" disabled={!pick} onClick={() => setStationId(pick)}>{t('stationCarrier.useStation')}</button>
            </div>
          )}
        </div>
      )}

      {carriers.length === 0
        ? <p className="ps-carrier-text ps-carrier-text--dim">{t('stationCarrier.noneHere')}</p>
        : (
          <ul className="ps-carrier-list" aria-label={t('stationCarrier.listLabel')}>
            {carriers.map(b => (
              <li key={b.id}>
                <button type="button" className={`ps-carrier-chip${loaded?.id === b.id ? ' ps-carrier-chip--active' : ''}`} onClick={() => { void carrier.chooseCarrier(b); }}>
                  <span className="ps-carrier-barcode">{b.masterBarcode}</span>
                  <span>{nodeLabel(b.processingNode)}</span>
                  <span>{t('batchManagement.itemCount', { count: b.items.length })}</span>
                  {b.priority === 'STAT' && <span className="ps-carrier-stat">{t('newContainerModal.stat')}</span>}
                  {b.stationId && b.stationId === station?.id && <span className="ps-carrier-tag">{t('stationCarrier.routedHere')}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}

      {loaded && progress && (
        <div className="ps-carrier-box">
          <div className="ps-carrier-row">
            <strong className="ps-carrier-barcode">{loaded.masterBarcode}</strong>
            <span>{nodeLabel(loaded.processingNode)}</span>
            <span>{t(`batchManagement.status.${loaded.status}`)}</span>
            {loaded.sealedAt && <span className="ps-carrier-tag">{t('stationCarrier.sealed')}</span>}
          </div>
          <p className="ps-carrier-text">{t('stationCarrier.progress', { matched: progress.matched, total: progress.total })}</p>
          {loaded.status === 'active' && <p className="ps-carrier-text ps-carrier-text--dim">{t('stationCarrier.scanToUnload')}</p>}
          {/* Batch 756: the carrier's items as soon as it is opened, each marked once it is scanned off here. */}
          <ul className="ps-carrier-items" aria-label={t('stationCarrier.itemsLabel')} data-phi="accession">
            {carrierItemRows(loaded).map(row => (
              <li key={row.displayId}>
                {!row.arrived && onCheckOff && (loaded.status === 'active' || loaded.status === 'reconciling') ? (
                  <button type="button" className="ps-carrier-item ps-carrier-item--button" title={t('stationCarrier.checkOffTitle')} onClick={() => setCheckOffFor(row.displayId)}>
                    <span className="ps-carrier-barcode">{row.displayId}</span>
                    <span>{t('stationCarrier.itemWaiting')}</span>
                  </button>
                ) : (
                  <span className={`ps-carrier-item${row.arrived ? ' ps-carrier-item--arrived' : ''}`}>
                    <span className="ps-carrier-barcode">{row.displayId}</span>
                    <span>{t(row.arrived ? 'stationCarrier.itemArrived' : 'stationCarrier.itemWaiting')}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
          {checkOffFor && onCheckOff && (
            <div className="ps-carrier-row" role="group" aria-label={t('stationCarrier.checkOffPrompt', { item: checkOffFor })} data-phi="accession">
              <span className="ps-carrier-text">{t('stationCarrier.checkOffPrompt', { item: checkOffFor })}</span>
              {MANUAL_CHECK_OFF_REASONS.map(reason => (
                <button key={reason} type="button" className="ps-btn-secondary" disabled={busy} onClick={() => { onCheckOff(checkOffFor, reason); setCheckOffFor(null); }}>
                  {t(`stationCarrier.checkOffReasons.${reason}`)}
                </button>
              ))}
              <button type="button" className="ps-btn-secondary" onClick={() => setCheckOffFor(null)}>{t('common.cancel')}</button>
            </div>
          )}
          {progress.unexpected > 0 && <p className="ps-carrier-text ps-carrier-text--warn">{t('stationCarrier.unexpectedCount', { count: progress.unexpected })}</p>}
          <div className="ps-carrier-row">
            {loaded.status === 'active' && !loaded.sealedAt && (
              <CapabilityButton capability="batch:manifest:seal" className="ps-btn-secondary" disabled={busy} onClick={() => { void carrier.seal(loaded); }}>{t('stationCarrier.seal')}</CapabilityButton>
            )}
            {loaded.status === 'reconciling' && (
              <button type="button" className="ps-btn-primary" disabled={busy || !gate?.canComplete} onClick={() => { void carrier.finishUnloading(); }}>{t('stationCarrier.finish')}</button>
            )}
            <button type="button" className="ps-btn-secondary" onClick={() => navigate(`/batch-management?carrier=${encodeURIComponent(loaded.masterBarcode)}`)}>{t('stationCarrier.openInBatchManagement')}</button>
            <button type="button" className="ps-btn-secondary" onClick={carrier.closeLoaded}>{t('stationCarrier.close')}</button>
          </div>
        </div>
      )}

      {carrier.outputNodes.length > 0 && (
        <div className="ps-carrier-box">
          {output ? (
            <>
              <div className="ps-carrier-row">
                <span>{t('stationCarrier.outputTray')}</span>
                <strong className="ps-carrier-barcode">{output.masterBarcode}</strong>
                <span>{t('batchManagement.itemCount', { count: output.items.length })}</span>
              </div>
              {/* Batch 757: scanning the tray again when it is full seals it and sends it on. */}
              <p className="ps-carrier-text ps-carrier-text--dim" data-phi="accession">{t('stationCarrier.outputRescanHint', { barcode: output.masterBarcode })}</p>
              <div className="ps-carrier-row">
                <button type="button" className="ps-btn-secondary" onClick={carrier.closeOutput}>{t('stationCarrier.close')}</button>
              </div>
            </>
          ) : <p className="ps-carrier-text ps-carrier-text--dim">{t(carrier.workstation === 'embedding' ? 'stationCarrier.outputHintEmbedding' : carrier.workstation === 'microtomy' ? 'stationCarrier.outputHintMicrotomy' : 'stationCarrier.outputHint', { node: carrier.outputNodes.map(nodeLabel).join(', ') })}</p>}
          {/* Batch 758 (Scan-Last): slides confirmed with no rack open wait on this station's bench. */}
          {carrier.benchCount > 0 && (
            <div className="ps-carrier-bench" role="status">
              <strong>{t('stationCarrier.bench.counter', { count: carrier.benchCount })}</strong>
              <span className="ps-carrier-text ps-carrier-text--dim">{t('stationCarrier.bench.hint')}</span>
            </div>
          )}
        </div>
      )}

      {/* Batch 761: a reusable rack whose last run was never closed. */}
      {pending?.kind === 'rackNotClosed' && (
        <div className="ps-carrier-box ps-carrier-box--warn" role="alert">
          <p className="ps-carrier-text">{t('stationCarrier.rack.notClosed', { barcode: pending.batch.masterBarcode, count: pending.batch.items.length, at: formatDateTime(pending.batch.sealedAt ?? pending.batch.createdAt, i18n.language) })}</p>
          <div className="ps-carrier-row">
            <CapabilityButton capability="batch:reconciliation:override" className="ps-btn-primary" disabled={busy} onClick={() => { void carrier.closeLastRun(); }}>{t('stationCarrier.rack.closeLastRun')}</CapabilityButton>
            <button type="button" className="ps-btn-secondary" onClick={() => navigate(`/batch-management?carrier=${encodeURIComponent(pending.batch.masterBarcode)}`)}>{t('stationCarrier.openInBatchManagement')}</button>
            <button type="button" className="ps-btn-secondary" onClick={carrier.cancelPending}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
      {pending && pending.kind !== 'rackNotClosed' && (
        <div className="ps-carrier-box ps-carrier-box--warn" role="alert" data-phi="accession">
          <p className="ps-carrier-text">
            {pending.kind === 'mismatch'
              ? t('stationCarrier.pending.mismatch', { barcode: pending.batch.masterBarcode, node: nodeLabel(pending.batch.processingNode), here: nodes.map(nodeLabel).join(', ') })
              : t('stationCarrier.pending.wrongItem', { item: pending.displayId, barcode: pending.carrierBarcode })}
          </p>
          <div className="ps-carrier-row">
            <CapabilityButton capability="station:scan-mismatch:continue" className="ps-btn-primary" disabled={busy} onClick={() => { void carrier.continuePending(); }}>
              {t(pending.kind === 'mismatch' ? 'stationCarrier.pending.openAnyway' : 'stationCarrier.pending.continueAnyway')}
            </CapabilityButton>
            <button type="button" className="ps-btn-secondary" onClick={carrier.cancelPending}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {notice && (
        <p className={`ps-carrier-notice ps-carrier-notice--${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'} data-phi="accession">
          {t(notice.key, noticeValues(notice.values))}
          <button type="button" className="ps-carrier-dismiss" aria-label={t('stationCarrier.dismiss')} onClick={carrier.dismissNotice}>✕</button>
        </p>
      )}
    </section>
  );
};

export default StationCarrierPanel;
