// src/pages/SlideDistributionStationPage/components/SlideLabelReprintModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 402 (PS-359, Pete). Reprinting a slide label at the Slide distribution
// station now needs a reason, as it does at the Microtome and Embedding: a
// reprinted label is a possible duplicate, so the reason goes on the slide's
// chain-of-custody record. Field Requirements page "slideDistribution" lists it
// as locked. Choose the reason, then press Reprint; Reprint stays off, with
// "Still required", until one is chosen. The reasons are stored in English and
// shown in the user's language.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { slideDistributionFieldRequired, slideReprintMissing } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import { SLIDE_LABEL_REPRINT_REASONS, SLIDE_LABEL_REPRINT_REASON_KEYS, type SlideLabelReprintReason } from '@/utils/slideDistributionOperations';
import { formatList } from '@/utils/formatList';

export interface SlideLabelReprintModalProps {
  requirements: readonly ResolvedFieldRequirement[];
  onReprint: (reason: SlideLabelReprintReason) => void;
  onCancel: () => void;
}

const SlideLabelReprintModal: React.FC<SlideLabelReprintModalProps> = ({ requirements, onReprint, onCancel }) => {
  const { t, i18n } = useTranslation();
  const [reason, setReason] = useState<SlideLabelReprintReason | ''>('');
  const missing = slideReprintMissing(reason, requirements);

  return (
    <div className="ps-overlay" onClick={onCancel}>
      <div className="ps-modal-dark" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="ps-batch-modal-header"><div className="ps-batch-modal-title">{t('slideDistribution.reprintReason.title')}</div></div>
        <div className="ps-batch-modal-body">
          <p>{t('slideDistribution.reprintReason.body')}</p>
          <label className="ps-slidedist-field-label" htmlFor="slidedist-reprint-reason">
            {t('slideDistribution.reprintReason.label')}{slideDistributionFieldRequired(requirements, 'reprintReason') && <span className="ps-conf-required"> *</span>}
          </label>
          <select id="slidedist-reprint-reason" className="ps-slidedist-field-input" value={reason}
            onChange={e => setReason(e.target.value as SlideLabelReprintReason | '')}>
            <option value="" disabled>{t('slideDistribution.reprintReason.select')}</option>
            {SLIDE_LABEL_REPRINT_REASONS.map(r => <option key={r} value={r}>{t(`slideDistribution.reprintReason.reason.${SLIDE_LABEL_REPRINT_REASON_KEYS[r]}`)}</option>)}
          </select>
          {missing.length > 0 && (
            <p className="ps-field-still-required" role="status">
              {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.slideDistribution.${id}`)), i18n.language) })}
            </p>
          )}
        </div>
        <div className="ps-batch-modal-footer">
          <button className="ps-btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
          <button className="ps-btn-primary" disabled={missing.length > 0 || !reason} onClick={() => { if (reason) onReprint(reason); }}>
            {t('slideDistribution.reprintReason.reprint')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlideLabelReprintModal;
