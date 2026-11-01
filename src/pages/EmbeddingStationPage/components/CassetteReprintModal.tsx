// src/pages/EmbeddingStationPage/components/CassetteReprintModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 401 (PS-359). Reprinting a cassette label needs a reason (PS-285's
// "Reason Log: mandatory reason prompt for any reprint"); Field Requirements
// page "embedding" lists it as locked. Before this, picking a reason in the
// list reprinted at once, so a mis-tap printed a label. Now the reason is
// chosen, then Reprint is pressed; Reprint stays off, with "Still required",
// until a reason is chosen. The reasons are stored in English (audit records)
// and shown in the user's language.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CassetteReprintReason } from '@/types/case/Specimen';
import { embeddingFieldRequired, embeddingReprintMissing } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import { CASSETTE_REPRINT_REASONS, CASSETTE_REPRINT_REASON_KEYS } from '@/utils/embeddingOperations';
import { formatList } from '@/utils/formatList';

export interface CassetteReprintModalProps {
  requirements: readonly ResolvedFieldRequirement[];
  onReprint: (reason: CassetteReprintReason) => void;
  onCancel: () => void;
}

const CassetteReprintModal: React.FC<CassetteReprintModalProps> = ({ requirements, onReprint, onCancel }) => {
  const { t, i18n } = useTranslation();
  const [reason, setReason] = useState<CassetteReprintReason | ''>('');
  const missing = embeddingReprintMissing(reason, requirements);

  return (
    <div className="ps-overlay" onClick={onCancel}>
      <div className="ps-modal-dark" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="ps-batch-modal-header"><div className="ps-batch-modal-title">{t('embeddingStation.reprintReason.title')}</div></div>
        <div className="ps-batch-modal-body">
          <p>{t('embeddingStation.reprintReason.body')}</p>
          <label className="ps-embedding-field-label" htmlFor="embedding-reprint-reason">
            {t('embeddingStation.reprintReason.label')}{embeddingFieldRequired(requirements, 'reprintReason') && <span className="ps-conf-required"> *</span>}
          </label>
          <select id="embedding-reprint-reason" className="ps-embedding-field-select" value={reason}
            onChange={e => setReason(e.target.value as CassetteReprintReason | '')}>
            <option value="" disabled>{t('embeddingStation.reprintReason.select')}</option>
            {CASSETTE_REPRINT_REASONS.map(r => <option key={r} value={r}>{t(`embeddingStation.reprintReason.reason.${CASSETTE_REPRINT_REASON_KEYS[r]}`)}</option>)}
          </select>
          {missing.length > 0 && (
            <p className="ps-field-still-required" role="status">
              {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.embedding.${id}`)), i18n.language) })}
            </p>
          )}
        </div>
        <div className="ps-batch-modal-footer">
          <button className="ps-btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
          <button className="ps-btn-primary" disabled={missing.length > 0 || !reason} onClick={() => { if (reason) onReprint(reason); }}>
            {t('embeddingStation.reprintReason.reprint')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CassetteReprintModal;
