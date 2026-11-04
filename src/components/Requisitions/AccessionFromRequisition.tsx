// src/components/Requisitions/AccessionFromRequisition.tsx
// Batch 762: on the Accession screen opened from a queued scan, a banner naming the scan (with its pages to look at
// while typing the case in), and, once the case is saved, the confirmation that the scan is linked to it.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRequisitionForAccession } from '@/hooks/useRequisitionForAccession';
import { RequisitionPreview } from './RequisitionPreview';
import './Requisitions.css';

export function AccessionFromRequisition({ savedAccession }: { savedAccession?: string | null }) {
  const { t } = useTranslation();
  const r = useRequisitionForAccession(savedAccession);
  const [viewing, setViewing] = useState(false);
  if (r.linked) {
    return (
      <div className="ps-req-accession-banner" role="status">
        <span>{t('requisitions.accession.linked')} <span data-phi="accession">{r.linked.accession}</span></span>
        <button type="button" className="ps-btn-small" onClick={r.dismissLinked}>{t('common.close')}</button>
      </div>
    );
  }
  if (!r.item) return null;
  return (
    <>
      <div className="ps-req-accession-banner" role="note">
        <span>{t('requisitions.accession.creating')} <span data-phi="requisition">{r.item.fileName}</span></span>
        {r.failed && <span className="ps-req-problem">{t('requisitions.accession.linkFailed')}</span>}
        <button type="button" className="ps-btn-small" onClick={() => setViewing(v => !v)}>{t('requisitions.view')}</button>
      </div>
      {viewing && <RequisitionPreview target={{ ref: { unmatchedId: r.item.id }, pages: r.item.pages, fileName: r.item.fileName }} onClose={() => setViewing(false)} />}
    </>
  );
}

export default AccessionFromRequisition;
