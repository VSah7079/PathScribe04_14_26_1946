// src/pages/LockboxDropOffPage/ReceiptCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: what the kiosk shows after a scan: the receipt that was just written, or the earlier one when the barcode had
// already been received. State A shows the accession number and ordering facility only (no patient name, date of birth or MRN
// is read or stored); state B shows the placeholder id. Rendering only.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { LockboxReceipt } from '@/services';
import { formatDateTime } from '@/utils/formatDate';

interface Props { receipt: LockboxReceipt; duplicate: boolean }

export const ReceiptCard: React.FC<Props> = ({ receipt, duplicate }) => {
  const { t, i18n } = useTranslation();
  const matched = receipt.state === 'matchedOrder';
  const facility = receipt.facilityName ?? receipt.clientFreeText;
  return (
    <section className={`ps-lbx-receipt${duplicate ? ' ps-lbx-receipt--duplicate' : ''}${receipt.urgent ? ' ps-lbx-receipt--urgent' : ''}`} role="status" aria-live="polite">
      <h2 className="ps-lbx-receipt-title">{t(duplicate ? 'lockboxDropOff.duplicate.title' : 'lockboxDropOff.received.title')}</h2>
      {duplicate && <p className="ps-lbx-note">{t('lockboxDropOff.duplicate.body')}</p>}
      <p className="ps-lbx-receipt-kind">{t(matched ? 'lockboxDropOff.received.matched' : 'lockboxDropOff.received.placeholder')}</p>
      <dl className="ps-lbx-facts">
        <div>
          <dt>{t(matched ? 'lockboxDropOff.received.accession' : 'lockboxDropOff.received.placeholderId')}</dt>
          <dd className="ps-lbx-ref" data-phi="true">{matched ? receipt.accessionNumber : receipt.placeholderId}</dd>
        </div>
        <div>
          <dt>{t('lockboxDropOff.received.facility')}</dt>
          <dd>{facility ?? t('lockboxDropOff.received.noFacility')}</dd>
        </div>
        {receipt.physicianName && (
          <div><dt>{t('lockboxDropOff.received.physician')}</dt><dd>{receipt.physicianName}</dd></div>
        )}
        <div><dt>{t('lockboxDropOff.received.at')}</dt><dd>{formatDateTime(receipt.receivedAt, i18n.language)}</dd></div>
        <div><dt>{t('lockboxDropOff.received.by')}</dt><dd>{receipt.receivedBy.userName}</dd></div>
        {receipt.callbackNumber && (
          <div><dt>{t('lockboxDropOff.received.callback')}</dt><dd data-phi="true">{receipt.callbackNumber}</dd></div>
        )}
      </dl>
      {receipt.urgent && <p className="ps-lbx-badge ps-lbx-badge--urgent">{t('lockboxDropOff.urgent.badge')}</p>}
      <p className="ps-lbx-note">{t('lockboxDropOff.received.next')}</p>
    </section>
  );
};
