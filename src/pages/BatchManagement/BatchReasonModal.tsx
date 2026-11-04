// src/pages/BatchManagement/BatchReasonModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 404 (PS-359). One dialog for Batch Management's three chain-of-custody
// overrides, each needing a reason (Field Requirements page "batchManagement",
// all locked) and its own permission:
//   - aborting a batch                       batch:run:abort
//   - completing a reconciliation anyway     batch:reconciliation:override
//   - acknowledging a cold-chain excursion   batch:cold-chain-excursion:acknowledge
// It replaces the abort and override dialogs' own text boxes and the cold-chain
// acknowledgement's browser prompt. The reason is starred, "Still required"
// shows while it is blank, and the confirm button is greyed without the
// permission (the service checks it again).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { batchFieldRequired } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import type { CapabilityKey } from '@/services/authorization/capabilityCatalog';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { formatList } from '@/utils/formatList';
import { QuickReasonPicks } from '@/components/Common/QuickReasonPicks';
import { useBenchReasons } from '@/hooks/useBenchReasons';
import { BATCH_REASON_CATEGORY, EMPTY_BENCH_REASON, benchReasonCode, type BenchReasonChoice } from '@/services/reasons/benchReasons';

export interface BatchReasonModalProps {
  title: string;
  text: string;
  label: string;
  placeholder: string;
  confirmLabel: string;
  /** The Field Requirements field this reason is. */
  fieldId: 'abortReason' | 'overrideReason' | 'coldChainNote';
  missing: (reason: string, requirements: readonly ResolvedFieldRequirement[]) => string[];
  requirements: readonly ResolvedFieldRequirement[];
  capability: CapabilityKey;
  busy: boolean;
  /** Batch 736: the reason text (picked reason and/or note) and the picked reason's code. */
  onConfirm: (reason: string, reasonCode?: string) => void;
  onCancel: () => void;
}

const BatchReasonModal: React.FC<BatchReasonModalProps> = ({
  title, text, label, placeholder, confirmLabel, fieldId, missing, requirements, capability, busy, onConfirm, onCancel,
}) => {
  const { t, i18n } = useTranslation();
  const category = BATCH_REASON_CATEGORY[fieldId];
  const reasons = useBenchReasons(category);
  const [choice, setChoice] = useState<BenchReasonChoice>(EMPTY_BENCH_REASON);
  const reason = reasons.textOf(choice);
  const stillMissing = missing(reason, requirements);
  const id = `batch-reason-${fieldId}`;

  return (
    <div className="ps-overlay ps-batch-overlay" onClick={onCancel}>
      <div className="ps-modal-dark ps-batch-confirm-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="ps-batch-modal-title">{title}</div>
        <p className="ps-batch-confirm-text">{text}</p>
        <label className="ps-batch-field-label" htmlFor={id}>
          {label}{batchFieldRequired(requirements, fieldId) && <span className="ps-conf-required"> *</span>}
        </label>
        {/* Touch spec T3; Batch 736: the lab's reasons (Reason Dictionary), one tap; the box is an optional note. */}
        <QuickReasonPicks category={category} options={reasons.options} value={choice} onChange={setChoice} disabled={busy} />
        <textarea id={id} className="ps-batch-textarea" placeholder={placeholder} value={choice.note} onChange={e => setChoice(c => ({ ...c, note: e.target.value }))} />
        {stillMissing.length > 0 && (
          <p className="ps-field-still-required" role="status">
            {t('fieldRequirements.stillRequired', { fields: formatList(stillMissing.map(f => t(`fieldRequirements.fields.batchManagement.${f}`)), i18n.language) })}
          </p>
        )}
        <div className="ps-batch-modal-footer">
          <button className="ps-btn-secondary" onClick={onCancel}>{t('batchDetail.cancel')}</button>
          <CapabilityButton capability={capability} className="ps-batch-danger-btn" disabled={busy || stillMissing.length > 0} onClick={() => onConfirm(reason.trim(), benchReasonCode(choice))}>
            {confirmLabel}
          </CapabilityButton>
        </div>
      </div>
    </div>
  );
};

export default BatchReasonModal;
