// src/pages/MolecularWorkcenterPage/MolecularOrderQueueTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 467 (Pete's spec "In-House Molecular Order Queue & Plate Binding
// Engine"): the Molecular Workcenter's Order Queue. Declarative: it shows the
// engine's view (molecularOrderEngine.queueView) and sends it actions
// (dispatchAction); the engine decides each order's status, the actions a row
// offers and the plates an order can go on. The only state here is what the
// user has selected.
//
// Batch 562: with the live-update hub, the queue re-reads when an order changes
// elsewhere (results from the instrument or the reference lab, another
// technologist's action; topic `molecularQueue`). It never polled, and still
// doesn't without the hub.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IS_MOCK_BACKEND, molecularOrderEngine, simulateMolecularRunResults, simulateSendOutResult, MOLECULAR_ORDER_STATUS_HUE } from '@/services';
import { useCapabilities } from '@/hooks/useCapabilities';
import type { MolecularOrderAction, MolecularQueueRow, MolecularQueueView } from '@/services/molecularOrders/molecularOrderTypes';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { formatDateTime } from '@/utils/formatDate';
import { LoadingState } from '@/components/Common/LoadingState';
import { useLiveData } from '@/hooks/useLiveData';
import { keepSelectedInView } from '@/services/molecularOrders/molecularQueueSelection';

const K = 'molecularOrders';

export const MolecularOrderQueueTab: React.FC<{ onOpenPlate: (batchId: string) => void }> = ({ onOpenPlate }) => {
  const { t, i18n } = useTranslation();
  const capabilities = useCapabilities();
  const [view, setView] = useState<MolecularQueueView | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [plateId, setPlateId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  // Batch 562: only the latest view is shown (a live re-read never puts back the view before the user's own
  // action), and orders that left the queue drop out of the selection.
  const viewGeneration = useRef(0);
  const showView = useCallback((next: MolecularQueueView | null) => {
    setView(next);
    if (next) setSelected(prev => keepSelectedInView(prev, next.rows));
  }, []);
  const refresh = useCallback(async () => {
    const mine = ++viewGeneration.current;
    const next = await molecularOrderEngine.queueView();
    if (mine === viewGeneration.current) showView(next);
  }, [showView]);
  useEffect(() => { void refresh(); }, [refresh]);
  useLiveData(refresh, { topic: 'molecularQueue', pollMs: null });

  const send = async (action: MolecularOrderAction) => {
    setMessage(null);
    viewGeneration.current += 1; // a re-read started before the action is out of date
    const r = await molecularOrderEngine.dispatchAction(action);
    if (r.ok) { viewGeneration.current += 1; setSelected([]); setPlateId(''); setView(r.view ?? null); setMessage(t(`${K}.queue.done.${action.type}`)); }
    else setMessage(t(`${K}.errors.${r.refused ?? 'orderNotFound'}`));
  };
  const simulate = async (row: MolecularQueueRow, call: 'POSITIVE' | 'NEGATIVE') => {
    if (!row.plateBatchId) return;
    setMessage(null);
    const ok = await simulateMolecularRunResults(row.plateBatchId, call);
    await refresh();
    setMessage(t(ok ? `${K}.queue.demo.done` : `${K}.queue.demo.failed`));
  };

  // Batch 467b: demo only — the reference lab reports for a send-out order (sent first when still queued).
  const simulateSendOut = async (row: MolecularQueueRow, call: 'POSITIVE' | 'NEGATIVE') => {
    setMessage(null);
    const outcome = await simulateSendOutResult(row.orderId, call);
    await refresh();
    setMessage(t(`${K}.queue.demo.sendOut.${outcome}`));
  };

  const rows = view?.rows ?? [];
  const selectedRows = rows.filter(r => selected.includes(r.orderId));
  const assay = selectedRows[0]?.assayTarget;
  const plates = (view?.plates ?? []).filter(p => p.assayTarget === assay);
  const toggle = (row: MolecularQueueRow) => setSelected(prev => (prev.includes(row.orderId) ? prev.filter(id => id !== row.orderId) : [...prev, row.orderId]));
  // A plate chosen for another test (or when nothing is selected) isn't kept.
  const chosenPlate = plates.some(p => p.batchId === plateId) ? plateId : '';

  return (
    <div className="ps-molq">
      <p className="ps-conf-field-hint">{t(`${K}.queue.hint`)}</p>
      <div className="ps-molq-toolbar">
        <span>{t(`${K}.queue.selected`, { count: selected.length })}</span>
        <label className="ps-conf-label" htmlFor="molq-plate">{t(`${K}.queue.plate`)}</label>
        <select id="molq-plate" className="ps-conf-select" value={chosenPlate} onChange={e => setPlateId(e.target.value)} disabled={!selected.length}>
          <option value="">{plates.length ? t(`${K}.queue.choosePlate`) : t(`${K}.queue.noPlate`)}</option>
          {plates.map(p => <option key={p.batchId} value={p.batchId}>{t(`${K}.queue.plateOption`, { plate: p.plateBarcode, instrument: p.instrument, count: p.freeWells })}</option>)}
        </select>
        <CapabilityButton capability="molecular:order:assign-plate" className="ps-conf-btn-primary" disabled={!selected.length || !chosenPlate}
          onClick={() => { void send({ type: 'ASSIGN_TO_PLATE', orderIds: selected, batchId: chosenPlate }); }}>
          {t(`${K}.queue.assign`)}
        </CapabilityButton>
        {message && <span className="ps-conf-field-hint" role="status">{message}</span>}
      </div>
      <div className="ps-conf-table-wrap">
        <div className="ps-conf-table-scroll">
          <table className="ps-conf-table">
            <thead className="ps-conf-thead-sticky">
              <tr>
                <th className="ps-conf-th"><span className="ps-sr-only">{t(`${K}.queue.col.select`)}</span></th>
                <th className="ps-conf-th">{t(`${K}.queue.col.order`)}</th>
                <th className="ps-conf-th">{t(`${K}.queue.col.case`)}</th>
                <th className="ps-conf-th">{t(`${K}.queue.col.assay`)}</th>
                <th className="ps-conf-th">{t(`${K}.queue.col.routing`)}</th>
                <th className="ps-conf-th">{t(`${K}.queue.col.status`)}</th>
                <th className="ps-conf-th">{t(`${K}.queue.col.plate`)}</th>
                <th className="ps-conf-th">{t(`${K}.queue.col.result`)}</th>
                <th className="ps-conf-th">{t(`${K}.queue.col.actions`)}</th>
              </tr>
            </thead>
            <tbody>
              {!view && <tr><td className="ps-conf-empty-row" colSpan={9}><LoadingState variant="inline" label={t('common.loading')} /></td></tr>}
              {view && rows.length === 0 && <tr><td className="ps-conf-empty-row" colSpan={9}>{t(`${K}.queue.empty`)}</td></tr>}
              {rows.map(r => (
                <tr key={r.orderId} className="ps-conf-tr">
                  <td className="ps-conf-td">
                    {r.actions.includes('ASSIGN_TO_PLATE') && (
                      <input type="checkbox" aria-label={t(`${K}.queue.selectOrder`, { order: r.orderId })} checked={selected.includes(r.orderId)}
                        disabled={!!assay && r.assayTarget !== assay} onChange={() => toggle(r)} />
                    )}
                  </td>
                  <td className="ps-conf-td">
                    <div>{r.orderId}</div>
                    <div className="ps-conf-field-hint">{t(`${K}.queue.orderedBy`, { name: r.orderedByName, at: formatDateTime(r.orderedAt, i18n.language) })}</div>
                  </td>
                  <td className="ps-conf-td"><div data-phi="accession">{r.accession}</div>{r.specimenBlock && <div className="ps-conf-field-hint">{t(`${K}.queue.specimenBlock`, { block: r.specimenBlock })}</div>}</td>
                  <td className="ps-conf-td">{r.assayName}</td>
                  <td className="ps-conf-td">
                    {r.sendOutLabName ? t(`${K}.queue.routingWithLab`, { routing: t(`${K}.routing.${r.routing}`), lab: r.sendOutLabName }) : t(`${K}.routing.${r.routing}`)}
                    {r.needsReroute && <div className="ps-molq-warning">{t(`${K}.queue.needsReroute.${r.needsReroute}`)}</div>}
                    {r.labChoices && (
                      <select className="ps-conf-select ps-molq-lab" aria-label={t(`${K}.queue.chooseLab`, { order: r.orderId })} value={r.sendOutLabId ?? ''}
                        disabled={!capabilities.has('molecular:order:set-lab')}
                        onChange={e => { if (e.target.value) void send({ type: 'SET_SEND_OUT_LAB', orderId: r.orderId, labId: e.target.value }); }}>
                        <option value="">{t(`${K}.queue.chooseLabPlaceholder`)}</option>
                        {r.labChoices.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    )}
                    {r.needsLab && <div className="ps-molq-warning">{t(`${K}.queue.needsLab`)}</div>}
                    {r.referralBatchId && <div className="ps-conf-field-hint">{t(`${K}.queue.referralBatch`, { batch: r.referralBatchId })}</div>}
                  </td>
                  <td className="ps-conf-td">
                    <span className="ps-status-badge ps-status-badge--hued" style={{ '--ps-hue': MOLECULAR_ORDER_STATUS_HUE[r.status] } as React.CSSProperties}>{t(`${K}.status.${r.statusLabel}`)}</span>
                  </td>
                  <td className="ps-conf-td">
                    {r.plateBarcode && r.plateBatchId
                      ? <button type="button" className="ps-btn-small" onClick={() => onOpenPlate(r.plateBatchId!)}>{t(`${K}.queue.plateWell`, { plate: r.plateBarcode, well: r.wellPosition })}</button>
                      : t(`${K}.queue.none`)}
                  </td>
                  <td className="ps-conf-td">
                    {r.interpretation ? t(`${K}.interpretation.${r.interpretation}`) : t(`${K}.queue.none`)}
                    {r.hydration && <div className="ps-conf-field-hint">{t(`${K}.hydration.${r.hydration}`)}</div>}
                  </td>
                  <td className="ps-conf-td">
                    <div className="ps-molq-actions">
                      {r.actions.includes('REMOVE_FROM_PLATE') && (
                        <CapabilityButton capability="molecular:order:assign-plate" className="ps-btn-small" onClick={() => { void send({ type: 'REMOVE_FROM_PLATE', orderId: r.orderId }); }}>
                          {t(`${K}.queue.remove`)}
                        </CapabilityButton>
                      )}
                      {r.actions.includes('REROUTE_TO_SEND_OUT') && (
                        <CapabilityButton capability="molecular:order:cancel" className="ps-btn-small" onClick={() => { void send({ type: 'REROUTE_TO_SEND_OUT', orderId: r.orderId }); }}>
                          {t(`${K}.queue.reroute`)}
                        </CapabilityButton>
                      )}
                      {r.actions.includes('CANCEL') && (
                        <CapabilityButton capability="molecular:order:cancel" className="ps-btn-small" onClick={() => { void send({ type: 'CANCEL', orderId: r.orderId }); }}>
                          {t(`${K}.queue.cancel`)}
                        </CapabilityButton>
                      )}
                      {/* Demo builds only: stand in for the instrument's run. */}
                      {IS_MOCK_BACKEND && r.awaitingResultFrom === 'instrument' && (
                        <>
                          <button type="button" className="ps-btn-small" onClick={() => { void simulate(r, 'POSITIVE'); }}>{t(`${K}.queue.demo.positive`)}</button>
                          <button type="button" className="ps-btn-small" onClick={() => { void simulate(r, 'NEGATIVE'); }}>{t(`${K}.queue.demo.negative`)}</button>
                        </>
                      )}
                      {/* Batch 467b, demo builds only: stand in for the reference lab. */}
                      {IS_MOCK_BACKEND && r.awaitingResultFrom === 'referenceLab' && (
                        <>
                          <button type="button" className="ps-btn-small" onClick={() => { void simulateSendOut(r, 'POSITIVE'); }}>{t(`${K}.queue.demo.sendOutPositive`)}</button>
                          <button type="button" className="ps-btn-small" onClick={() => { void simulateSendOut(r, 'NEGATIVE'); }}>{t(`${K}.queue.demo.sendOutNegative`)}</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
