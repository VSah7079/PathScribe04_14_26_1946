// src/pages/BatchManagement/WsiScanBatchesPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 434: Batch Management → Slide scanning (WSI scan batches).
//   • The scanning queue: slides the Slide Distribution Station routed to
//     Digital that aren't in a batch yet. Pick a slide scanner (Equipment
//     register), tick slides, Load batch.
//   • Scan batches: Send to scanner (the manifest goes through the interface
//     engine; a failed send shows why and can be retried), the progress the
//     scanner reports back, and Unload (slides not scanned successfully go
//     back to the queue).
//   • Batch 434 (follow-up): it updates on its own as the scanner reports
//     (useLiveWsiScanBatches); Refresh stays for an immediate re-read.
// Rules and permissions: services/digitalPathology/wsiScanQueue.ts and
// wsiScanBatchWorkflow.ts. This page shows and dispatches.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useLiveWsiScanBatches } from '@/hooks/useLiveWsiScanBatches';
import { LiveStatusBadge } from '@/components/LiveUpdates/LiveStatusBadge';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { wsiScanBatchService } from '@/services';
import type { WsiScanBatch } from '@/services/digitalPathology/IWsiScanBatchService';
import type { Equipment } from '@/services/equipment/IEquipmentService';
import { scanBatchActions, scanBatchProgress, type ScanQueueSlide } from '@/services/digitalPathology/wsiScanQueue';
import { listSlideScanners, loadScanBatch, loadScanQueue, sendScanBatch, unloadScanBatch, type ScanBatchRefusal } from '@/services/digitalPathology/wsiScanBatchWorkflow';
import { formatDateTime } from '@/utils/formatDate';
import { CASE_PRIORITY_KEYS } from '@/utils/slideDistributionOperations';

const REFUSAL_KEY: Record<ScanBatchRefusal | 'SEND_FAILED', string> = {
  NO_SCANNER: 'wsiScanBatches.error.noScanner',
  NO_SLIDES: 'wsiScanBatches.error.noSlides',
  NOT_IN_QUEUE: 'wsiScanBatches.error.notInQueue',
  NOT_PERMITTED: 'wsiScanBatches.error.notPermitted',
  SCANNER_NOT_FOUND: 'wsiScanBatches.error.scannerNotFound',
  BATCH_NOT_FOUND: 'wsiScanBatches.error.batchNotFound',
  NOT_LOADED: 'wsiScanBatches.error.notLoaded',
  STILL_SCANNING: 'wsiScanBatches.error.stillScanning',
  SAVE_FAILED: 'wsiScanBatches.error.saveFailed',
  SEND_FAILED: 'wsiScanBatches.error.sendFailed',
};

const WsiScanBatchesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t('wsiScanBatches.pageTitle'), '/batch-management/wsi-scan'); }, [pushCrumb, t]);

  const [queue, setQueue] = useState<ScanQueueSlide[]>([]);
  const [batches, setBatches] = useState<WsiScanBatch[]>([]);
  const [scanners, setScanners] = useState<Equipment[]>([]);
  const [scannerCode, setScannerCode] = useState('');
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ key: string; params?: Record<string, unknown>; kind: 'ok' | 'error' } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [q, b, s] = await Promise.all([loadScanQueue(), wsiScanBatchService.getAll(), listSlideScanners()]);
    setQueue(q);
    setBatches(b.ok ? [...b.data].sort((x, y) => y.loadedAt.localeCompare(x.loadedAt)) : []);
    setScanners(s);
    setChosen(prev => new Set([...prev].filter(k => q.some(x => x.key === k))));
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  // Batch 434: the page follows the scanner's reports and other techs' changes
  // as they happen (live updates; polling when there's no live connection).
  const liveState = useLiveWsiScanBatches(() => { void refresh(); });

  const scannerName = useMemo(() => new Map(scanners.map(s => [s.code, s.name])), [scanners]);
  const nameOf = (code?: string) => (code ? scannerName.get(code) ?? code : '—');
  const toggle = (key: string) => setChosen(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, okKey: string, params?: Record<string, unknown>) => {
    setBusy(true); setMessage(null);
    const res = await fn();
    setBusy(false);
    if (res.ok) setMessage({ key: okKey, params, kind: 'ok' });
    else setMessage({ key: REFUSAL_KEY[res.error as ScanBatchRefusal] ?? 'wsiScanBatches.error.saveFailed', kind: 'error' });
    await refresh();
  };

  return (
    <div className="ps-batch-page">
      <div className="ps-batch-scroll">
        <div className="ps-batch-inner">
          <div className="ps-batch-page-header">
            <h1 className="ps-batch-page-title">🔬 {t('wsiScanBatches.pageTitle')}</h1>
            <p className="ps-batch-page-subtitle">{t('wsiScanBatches.pageSubtitle')}</p>
          </div>

          <div className="ps-batch-toolbar">
            <LiveStatusBadge state={liveState} />
            <button className="ps-btn-secondary" onClick={() => void refresh()} disabled={loading}>
              {loading ? t('wsiScanBatches.refreshing') : `↻ ${t('wsiScanBatches.refresh')}`}
            </button>
          </div>
          {message && (
            <p className={message.kind === 'ok' ? 'ps-wsi-message' : 'ps-conf-error-text'} role={message.kind === 'ok' ? 'status' : 'alert'}>
              {t(message.key, message.params)}
            </p>
          )}

          {/* The scanning queue */}
          <div className="ps-batch-section-label">{t('wsiScanBatches.queueLabel', { count: queue.length })}</div>
          <div className="ps-wsi-load-bar">
            <label className="ps-conf-label" htmlFor="wsi-scanner">{t('wsiScanBatches.scannerLabel')}</label>
            <select id="wsi-scanner" className="ps-conf-select" value={scannerCode} onChange={e => setScannerCode(e.target.value)}>
              <option value="">{t('wsiScanBatches.selectScanner')}</option>
              {scanners.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <CapabilityButton
              capability="wsi:scan-batch:load"
              className="ps-conf-btn-primary"
              disabled={busy || !scannerCode || chosen.size === 0}
              disabledTitle={t('wsiScanBatches.loadDisabledTitle')}
              onClick={() => void run(() => loadScanBatch(scannerCode, [...chosen]).then(r => { if (r.ok) setChosen(new Set()); return r; }), 'wsiScanBatches.loaded', { count: chosen.size, scanner: nameOf(scannerCode) })}
            >
              {t('wsiScanBatches.loadButton', { count: chosen.size })}
            </CapabilityButton>
          </div>
          {scanners.length === 0 && !loading && <p className="ps-billing-reason-hint">{t('wsiScanBatches.noScanners')}</p>}
          <div className="ps-conf-table-wrap">
            <div className="ps-conf-table-scroll">
              <table className="ps-conf-table">
                <thead className="ps-conf-thead-sticky">
                  <tr>
                    <th className="ps-conf-th"><span className="ps-sr-only">{t('wsiScanBatches.colChoose')}</span></th>
                    <th className="ps-conf-th">{t('wsiScanBatches.colCase')}</th>
                    <th className="ps-conf-th">{t('wsiScanBatches.colSlide')}</th>
                    <th className="ps-conf-th">{t('wsiScanBatches.colPriority')}</th>
                    <th className="ps-conf-th">{t('wsiScanBatches.colRoutedTo')}</th>
                    <th className="ps-conf-th">{t('wsiScanBatches.colRackSlot')}</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map(q => (
                    <tr key={q.key} className="ps-conf-tr">
                      <td className="ps-conf-td">
                        <input type="checkbox" checked={chosen.has(q.key)} onChange={() => toggle(q.key)} aria-label={t('wsiScanBatches.chooseSlide', { slide: `${q.blockLabel} ${q.stainName}` })} />
                      </td>
                      <td className="ps-conf-td"><span data-phi="accession">{q.accession}</span></td>
                      <td className="ps-conf-td">{q.blockLabel} · {q.stainName}</td>
                      <td className="ps-conf-td">{q.priority ? (CASE_PRIORITY_KEYS[q.priority] ? t(`slideDistribution.priority.${CASE_PRIORITY_KEYS[q.priority]}`) : q.priority) : '—'}</td>
                      <td className="ps-conf-td">{nameOf(q.scannerInstrumentId)}</td>
                      <td className="ps-conf-td">{q.rackId || q.slotPosition ? `${q.rackId ?? '—'} / ${q.slotPosition ?? '—'}` : '—'}</td>
                    </tr>
                  ))}
                  {queue.length === 0 && (
                    <tr><td className="ps-conf-empty-row" colSpan={6}>{loading ? t('wsiScanBatches.loading') : t('wsiScanBatches.queueEmpty')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scan batches */}
          <div className="ps-batch-section-label ps-mt-16">{t('wsiScanBatches.batchesLabel', { count: batches.length })}</div>
          <div className="ps-conf-table-wrap">
            <div className="ps-conf-table-scroll">
              <table className="ps-conf-table">
                <thead className="ps-conf-thead-sticky">
                  <tr>
                    <th className="ps-conf-th">{t('wsiScanBatches.colBatch')}</th>
                    <th className="ps-conf-th">{t('wsiScanBatches.colScanner')}</th>
                    <th className="ps-conf-th">{t('wsiScanBatches.colStatus')}</th>
                    <th className="ps-conf-th">{t('wsiScanBatches.colProgress')}</th>
                    <th className="ps-conf-th">{t('wsiScanBatches.colLoaded')}</th>
                    <th className="ps-conf-th">{t('wsiScanBatches.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map(b => {
                    const p = scanBatchProgress(b);
                    const actions = scanBatchActions(b);
                    const open = expanded === b.id;
                    return (
                      <React.Fragment key={b.id}>
                        <tr className="ps-conf-tr">
                          <td className="ps-conf-td">
                            <button className="ps-conf-btn-row ps-wsi-batch-toggle" aria-expanded={open} onClick={() => setExpanded(open ? null : b.id)}>{open ? '▾' : '▸'} {b.batchBarcode}</button>
                          </td>
                          <td className="ps-conf-td">{nameOf(b.scannerInstrumentId)}</td>
                          <td className="ps-conf-td">
                            {t(`wsiScanBatches.status.${b.status}`)}
                            {b.sendError && b.status === 'loaded' && (
                              <div className="ps-conf-error-text">{t('wsiScanBatches.sendErrorShort', { code: b.sendError.code, at: formatDateTime(b.sendError.at, i18n.language) })}</div>
                            )}
                          </td>
                          <td className="ps-conf-td">{t('wsiScanBatches.progress', { scanned: p.scanned, failed: p.failed, pending: p.pending, total: p.total })}</td>
                          <td className="ps-conf-td">{formatDateTime(b.loadedAt, i18n.language)}</td>
                          <td className="ps-conf-td">
                            <div className="ps-qa-inline-actions">
                              {actions.canSend && (
                                <CapabilityButton capability="wsi:scan-batch:send" context={{ facilityId: b.facilityId }} className="ps-conf-btn-primary" disabled={busy}
                                  onClick={() => void run(() => sendScanBatch(b.id), 'wsiScanBatches.sent', { batch: b.batchBarcode })}>
                                  {t(b.sendError ? 'wsiScanBatches.sendAgainButton' : 'wsiScanBatches.sendButton')}
                                </CapabilityButton>
                              )}
                              {actions.canUnload && (
                                <CapabilityButton capability="wsi:scan-batch:unload" context={{ facilityId: b.facilityId }} className="ps-conf-btn-secondary" disabled={busy}
                                  onClick={() => void run(() => unloadScanBatch(b.id), 'wsiScanBatches.unloaded', { batch: b.batchBarcode })}>
                                  {t('wsiScanBatches.unloadButton')}
                                </CapabilityButton>
                              )}
                            </div>
                          </td>
                        </tr>
                        {open && b.slides.map(s => (
                          <tr key={`${b.id}-${s.slidePosition}`} className="ps-conf-tr ps-wsi-slide-row">
                            <td className="ps-conf-td">{t('wsiScanBatches.position', { position: s.slidePosition })}</td>
                            <td className="ps-conf-td"><span data-phi="accession">{s.caseId}</span></td>
                            <td className="ps-conf-td">{s.slideLabel ?? s.specimenId}</td>
                            <td className="ps-conf-td">
                              {t(`wsiScanBatches.slideStatus.${s.scanStatus}`)}
                              {s.qcPassed === false && <div className="ps-conf-error-text">{t('wsiScanBatches.qcFailed', { reason: s.failureReason ?? '' })}</div>}
                              {s.scanStatus === 'failed' && s.failureReason && <div className="ps-conf-error-text">{s.failureReason}</div>}
                            </td>
                            <td className="ps-conf-td">{s.scanCompletedAt ? formatDateTime(s.scanCompletedAt, i18n.language) : '—'}</td>
                            <td className="ps-conf-td" />
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  {batches.length === 0 && (
                    <tr><td className="ps-conf-empty-row" colSpan={6}>{t('wsiScanBatches.batchesEmpty')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WsiScanBatchesPage;
