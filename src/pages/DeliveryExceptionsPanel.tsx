// src/pages/DeliveryExceptionsPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 521 (PS-281 §3.2.2): the delivery exception queue, at the top of
// Audit Log → Interfaces → Outbound. Prints, faxes and file drops that still
// failed after their automatic retries, newest first: when, the case, the
// channel, attempts, the last error, and whether the rule's fallback channels
// were sent. Admin and Lab Director were messaged. A delivery resent
// successfully from its queue (the Print Queue, or Report Delivery here)
// leaves the list at the next sweep. The list is decided by
// services/delivery/deliveryRetries.ts (deliveryExceptions).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deliveryRetryService, deliveryExceptions } from '@/services';
import type { DeliveryRetryRecord } from '@/types/delivery/DeliveryRetryRecord';
import { formatDateTime } from '@/utils/formatDate';

const K = 'deliveryExceptions';

export const DeliveryExceptionsPanel: React.FC<{ refreshKey?: number }> = ({ refreshKey }) => {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<DeliveryRetryRecord[] | null>(null);

  useEffect(() => {
    let live = true;
    void deliveryRetryService.getAll().then(r => { if (live) setRows(r.ok ? deliveryExceptions(r.data) : []); });
    return () => { live = false; };
  }, [refreshKey]);

  if (!rows) return null;
  return (
    <section className="ps-delivery-exceptions" aria-labelledby="delivery-exceptions-title">
      <h3 id="delivery-exceptions-title" className="ps-delivery-exceptions-title">{t(`${K}.title`, { count: rows.length })}</h3>
      <p className="ps-conf-hint">{t(`${K}.hint`)}</p>
      {rows.length === 0 ? (
        <p className="ps-conf-hint">{t(`${K}.empty`)}</p>
      ) : (
        <div className="ps-conf-table-wrap">
          <table className="ps-conf-table">
            <thead>
              <tr>
                <th className="ps-conf-th">{t(`${K}.columns.when`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.case`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.channel`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.attempts`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.lastError`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.fallback`)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="ps-conf-tr">
                  <td className="ps-conf-td">{r.deadLetteredAt ? formatDateTime(r.deadLetteredAt, i18n.language) : '—'}</td>
                  <td className="ps-conf-td" data-phi="accession">{r.release.caseId}</td>
                  <td className="ps-conf-td">{t(`deliveryRulesSection.channelNames.${r.channel}`)} · {t(`deliveryRulesSection.roles.${r.role}`)}</td>
                  <td className="ps-conf-td">{r.failures}</td>
                  <td className="ps-conf-td">{r.lastError ?? '—'}</td>
                  <td className="ps-conf-td">{r.fallbackSentAt ? t(`${K}.fallbackSent`, { channels: r.fallbackChannels.map(c => t(`deliveryRulesSection.channelNames.${c}`)).join(', ') }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default DeliveryExceptionsPanel;
