// src/pages/OutboundInterfaceDlqSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Audit Log → Interfaces → Outbound: failed and waiting outbound interface
// messages, with Retry, Dispatch Now, Simulate Failure (a testing aid, never
// a send) and Capture as CAPA.
//
// Batch 518 (PS-122):
//   • All seven outbound queues in one view (Pete's accepted default): patient
//     ADT, results, Assist LIS sync, and the four that had no screen before —
//     accession events, cytology results, referral manifests and molecular
//     orders.
//   • Sending, resending and simulating need interface:outbound:resend,
//     checked in the service (services/interfaceDispatch/outboundQueueActions.ts).
//     The buttons are CapabilityButtons.
//   • The per-queue knowledge (how to read, describe and rebuild each
//     message) and the send flow moved to services/interfaceDispatch
//     (outboundQueueAdapters.ts, outboundQueueActions.ts); this file renders.
//   • Identifiers (patient, case, accession, barcode) are tagged data-phi.
//
// History: Batch 426 made Assist LIS sync messages rebuildable; Batch 392
// holds a result without its report PDF. Stored CAPA comments stay English.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { formatDateTime } from '@/utils/formatDate';
import { DeliveryExceptionsPanel } from './DeliveryExceptionsPanel';
import {
  outboundQueueDeps, outboundRows, dispatchOutboundEntry, resendOutboundEntry, simulateOutboundFailure,
  captureOutboundFailureAsCapa, OUTBOUND_QUEUE_TYPES, type OutboundQueueType, type OutboundRow, type OutboundActionOutcome,
} from '@/services';

const K = 'outboundInterfaceDlq';
const QUEUE_KEY: Record<OutboundQueueType, string> = {
  patient_adt: 'patientAdt', result: 'result', lis_sync: 'lisSync', accession: 'accession',
  cytology_result: 'cytologyResult', referral: 'referral', molecular_order: 'molecularOrder', report_delivery: 'reportDelivery',
};
const ERROR_KEY: Record<string, string> = {
  DISPATCH_TIMEOUT: 'dispatchTimeout', DISPATCH_UNREACHABLE: 'engineUnreachable', DISPATCH_REJECTED: 'dispatchRejected',
};

const OutboundInterfaceDlqSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [queue, setQueue] = useState<OutboundQueueType>('patient_adt');
  const [rows, setRows] = useState<{ failed: OutboundRow[]; queued: OutboundRow[] }>({ failed: [], queued: [] });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [captured, setCaptured] = useState<Set<string>>(new Set());
  const [outcomes, setOutcomes] = useState<Record<string, OutboundActionOutcome>>({});

  const load = useCallback(async () => setRows(await outboundRows(queue, outboundQueueDeps)), [queue]);
  useEffect(() => { void load(); }, [load]);

  const run = async (id: string, action: () => Promise<OutboundActionOutcome>) => {
    setBusyId(id);
    try {
      const outcome = await action();
      setOutcomes(prev => ({ ...prev, [id]: outcome }));
      await load();
    } finally { setBusyId(null); }
  };
  const capture = async (id: string) => {
    setBusyId(id);
    try {
      if (await captureOutboundFailureAsCapa(queue, id, user?.id ?? 'unknown', outboundQueueDeps)) setCaptured(prev => new Set(prev).add(id));
    } finally { setBusyId(null); }
  };

  const q = `${K}.queueType.${QUEUE_KEY[queue]}`;
  const outcomeLine = (id: string) => {
    const o = outcomes[id];
    if (!o || o === 'marked') return null;
    return <div className={`ps-conf-hint ${o === 'sent' ? 'ps-conf-hint--success' : 'ps-conf-hint--warning'}`} role="status">{t(`${K}.outcomes.${o}`)}</div>;
  };

  return (
    <div className="ps-conf-section">
      <div className="ps-conf-section-header">
        <div>
          <h2 className="ps-conf-section-title">{t(`${K}.title`)}</h2>
          <p className="ps-conf-section-subtitle">{t(`${K}.subtitle`)}</p>
        </div>
        <select value={queue} aria-label={t(`${K}.queueLabel`)} onChange={e => { setQueue(e.target.value as OutboundQueueType); setOutcomes({}); }} className="ps-conf-select">
          {OUTBOUND_QUEUE_TYPES.map(qt => <option key={qt} value={qt}>{t(`${K}.queueType.${QUEUE_KEY[qt]}.optionLabel`)}</option>)}
        </select>
      </div>

      {/* Batch 521 (PS-281): deliveries that failed after their automatic retries. */}
      <DeliveryExceptionsPanel refreshKey={Object.keys(outcomes).length} />

      <div className="ps-conf-table-wrap">
        <div className="ps-conf-table-scroll">
          <table className="ps-conf-table">
            <thead className="ps-conf-thead-sticky">
              <tr>
                <th className="ps-conf-th">{t(`${q}.identifierColumnLabel`)}</th>
                <th className="ps-conf-th">{t(`${q}.kindColumnLabel`)}</th>
                <th className="ps-conf-th">{t(`${K}.errorHeader`)}</th>
                <th className="ps-conf-th">{t(`${K}.retriesHeader`)}</th>
                <th className="ps-conf-th">{t(`${K}.retryHeader`)}</th>
                <th className="ps-conf-th">{t(`${K}.capaHeader`)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.failed.map(r => (
                <tr key={r.id} className="ps-conf-tr">
                  <td className="ps-conf-td" data-phi="true">{r.identifier}</td>
                  <td className="ps-conf-td">{r.kind}</td>
                  <td className="ps-conf-td">
                    {t(`${K}.errorLabel.${ERROR_KEY[r.errorCode ?? ''] ?? 'unknown'}`)}
                    <div className="ps-specreq-meta">{r.errorMessage}</div>
                  </td>
                  <td className="ps-conf-td">{r.retryCount}{r.maxRetriesExceeded ? ` ${t(`${K}.maxExceededSuffix`)}` : ''}</td>
                  <td className="ps-conf-td">
                    <CapabilityButton capability="interface:outbound:resend" className="ps-conf-btn-primary" disabled={busyId === r.id}
                      onClick={() => { void run(r.id, () => resendOutboundEntry(queue, r.id, outboundQueueDeps)); }}>
                      {busyId === r.id ? t(`${K}.sending`) : t(`${K}.retryDispatch`)}
                    </CapabilityButton>
                    {outcomeLine(r.id)}
                  </td>
                  <td className="ps-conf-td">
                    {captured.has(r.id) ? (
                      <span className="ps-conf-hint ps-conf-hint--success">{t(`${K}.captured`)}</span>
                    ) : (
                      <button className="ps-conf-btn-secondary" disabled={busyId === r.id} onClick={() => { void capture(r.id); }}>
                        {t(`${K}.captureAsCapa`)}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.failed.length === 0 && (
                <tr><td className="ps-conf-empty-row" colSpan={6}>{t(`${K}.noFailedDispatches`)}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ps-conf-section-header ps-dlq-section-header--spaced">
        <h2 className="ps-conf-section-title">{t(`${K}.queuedSectionTitle`)}</h2>
        <p className="ps-conf-section-subtitle">{t(`${K}.queuedSectionSubtitle`)}</p>
      </div>
      <div className="ps-conf-table-wrap">
        <div className="ps-conf-table-scroll">
          <table className="ps-conf-table">
            <thead className="ps-conf-thead-sticky">
              <tr>
                <th className="ps-conf-th">{t(`${q}.identifierColumnLabel`)}</th>
                <th className="ps-conf-th">{t(`${q}.kindColumnLabel`)}</th>
                <th className="ps-conf-th">{t(`${K}.queuedAtHeader`)}</th>
                <th className="ps-conf-th">{t(`${K}.dispatchHeader`)}</th>
                <th className="ps-conf-th">{t(`${K}.simulateHeader`)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.queued.map(r => (
                <tr key={r.id} className="ps-conf-tr">
                  <td className="ps-conf-td" data-phi="true">{r.identifier}</td>
                  <td className="ps-conf-td">{r.kind}</td>
                  <td className="ps-conf-td">{formatDateTime(r.queuedAt, i18n.language)}</td>
                  <td className="ps-conf-td">
                    <CapabilityButton capability="interface:outbound:resend" className="ps-conf-btn-primary" disabled={busyId === r.id}
                      onClick={() => { void run(r.id, () => dispatchOutboundEntry(queue, r.id, outboundQueueDeps)); }}>
                      {busyId === r.id ? t(`${K}.sending`) : t(`${K}.dispatchNow`)}
                    </CapabilityButton>
                    {outcomeLine(r.id)}
                  </td>
                  <td className="ps-conf-td">
                    <div className="ps-dlq-inline-actions">
                      {(['timeout', 'unreachable', 'rejected'] as const).map(kind => (
                        <CapabilityButton key={kind} capability="interface:outbound:resend" className="ps-conf-btn-secondary" disabled={busyId === r.id}
                          onClick={() => { void run(r.id, () => simulateOutboundFailure(queue, r.id, kind, outboundQueueDeps)); }}>
                          {t(`${K}.simulate.${kind}`)}
                        </CapabilityButton>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.queued.length === 0 && (
                <tr><td className="ps-conf-empty-row" colSpan={5}>{t(`${K}.noQueuedMessages`)}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OutboundInterfaceDlqSection;
