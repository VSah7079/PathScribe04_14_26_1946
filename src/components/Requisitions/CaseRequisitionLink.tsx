// src/components/Requisitions/CaseRequisitionLink.tsx
// Batch 762 (Requisition Ingestion spec §2.3): on the case, a button that shows the scanned requisition linked to it,
// so nobody looks for the paper. Shown only when the case has one and the user holds case:requisition:view; a case
// flagged as missing its requisition shows that instead.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCaseRequisitions } from '@/hooks/useCaseRequisitions';
import { RequisitionPreview } from './RequisitionPreview';
import './Requisitions.css';

export function CaseRequisitionLink({ caseId, accession }: { caseId?: string | null; accession?: string | null }) {
  const { t } = useTranslation();
  const { links, missing } = useCaseRequisitions({ caseId, accession });
  const [openId, setOpenId] = useState<string | null>(null);
  if (links.length === 0) {
    // Batch 762: a case that should have a requisition and has none (flagged, with a Missing Requisition deficiency).
    return missing ? <span className="ps-req-missing-chip" role="status">{t('requisitions.missingChip')}</span> : null;
  }
  const open = links.find(l => l.id === openId) ?? null;
  return (
    <>
      <button type="button" className="ps-req-case-btn" onClick={() => setOpenId(links[0].id)}>
        {t('requisitions.caseButton', { count: links.length })}
      </button>
      {open && (
        <div className="ps-overlay ps-overlay--confirm" onClick={() => setOpenId(null)}>
          <div className="ps-modal-dark ps-req-modal" role="dialog" aria-label={t('requisitions.preview.title')} onClick={e => e.stopPropagation()}>
            {links.length > 1 && (
              <div className="ps-tab-bar ps-req-tabs">
                {links.map((l, i) => (
                  <button key={l.id} type="button" className={`ps-tab-btn${l.id === open.id ? ' active' : ''}`} onClick={() => setOpenId(l.id)}>
                    {t('requisitions.caseTab', { n: i + 1 })}
                  </button>
                ))}
              </div>
            )}
            <RequisitionPreview target={{ ref: { linkId: open.id }, pages: open.pages, fileName: open.fileName }} onClose={() => setOpenId(null)} />
          </div>
        </div>
      )}
    </>
  );
}

export default CaseRequisitionLink;
