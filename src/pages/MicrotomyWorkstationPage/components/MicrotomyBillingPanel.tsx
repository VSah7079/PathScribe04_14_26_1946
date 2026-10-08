// src/pages/MicrotomyWorkstationPage/components/MicrotomyBillingPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 460 (Pete): the bench's billing view. Read-only by default (the codes
// this block's slides generate, their charge status, warnings). "Full billing
// review" opens the billing review panel; it needs
// billing:applied-code:review (greyed out without it; checked again in
// services/billing). Renders only: useMicrotomyBilling decides.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { CaseBillingReview } from '@/components/Billing/CaseBillingReview';
import type { MaterialChargePreview } from '@/services';
import type { Case } from '@/types/case/Case';
import type { useCaseBillingReview } from '@/hooks/useCaseBillingReview';

interface Props {
  caseData: Case;
  preview: MaterialChargePreview | null;
  fullReview: boolean;
  onSetFullReview: (open: boolean) => void;
  review: ReturnType<typeof useCaseBillingReview>;
  selectedMaterialId?: string;
}

const MicrotomyBillingPanel: React.FC<Props> = ({ caseData, preview, fullReview, onSetFullReview, review, selectedMaterialId }) => {
  const { t } = useTranslation();
  return (
    <div className="ps-microtomy-panel ps-mt-14">
      <p className="ps-microtomy-panel-title">{t('microtomyWorkstation.billing.title')}</p>
      {(preview?.warnings ?? []).map((w, i) => (
        <div key={i} className="ps-microtomy-billing-warning" role="status">
          ⚠ {w.kind === 'coresNotEvaluated'
            ? t('microtomyWorkstation.billing.warning.coresNotEvaluated', { stain: w.slideLabel })
            : t('microtomyWorkstation.billing.warning.awaitingApproval', { count: w.count })}
        </div>
      ))}
      <ul className="ps-microtomy-billing-list">
        {(preview?.rows ?? []).map(row => (
          <li key={row.key} className="ps-microtomy-billing-row">
            <span className="ps-microtomy-billing-label">{row.label}</span>
            <span className="ps-microtomy-billing-codes">{row.codes.join(', ') || '—'}</span>
            <span className={`ps-microtomy-billing-state ps-microtomy-billing-state--${row.state}`}>
              {t(`microtomyWorkstation.billing.state.${row.state}`)}
              {row.ledger ? ` · ${t(`microtomyWorkstation.billing.ledger.${row.ledger}`)}` : ''}
            </span>
          </li>
        ))}
        {(preview?.rows ?? []).length === 0 && <li className="ps-microtomy-billing-empty">{t('microtomyWorkstation.billing.noSlides')}</li>}
      </ul>
      <CapabilityButton
        capability="billing:applied-code:review"
        context={{ caseId: caseData.id, facilityId: caseData.order?.facilityId ?? null }}
        className="ps-microtomy-row-btn"
        title={t('microtomyWorkstation.billing.fullReviewTitle')}
        onClick={() => onSetFullReview(true)}
      >
        $ {t('microtomyWorkstation.billing.fullReview')}
      </CapabilityButton>

      {fullReview && (
        <div className="ps-overlay" onClick={() => onSetFullReview(false)}>
          <div className="ps-modal-dark ps-microtomy-billing-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label={t('microtomyWorkstation.billing.fullReview')}>
            <div className="ps-batch-modal-header">
              <div className="ps-batch-modal-title">{t('microtomyWorkstation.billing.fullReview')}</div>
              <button type="button" className="ps-research-close" onClick={() => onSetFullReview(false)} aria-label={t('common.close')}>✕</button>
            </div>
            <div className="ps-microtomy-billing-modal-body">
              <CaseBillingReview caseData={caseData} review={review} selectedMaterialId={selectedMaterialId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MicrotomyBillingPanel;
