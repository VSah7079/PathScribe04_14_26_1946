/**
 * ReasonPromptModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Batch 432: a confirmation that needs a written reason (escalating a QC case,
 * a supervisor bypass, denying an access request). The confirm button stays
 * off until a reason is typed; the reason is passed back trimmed.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/pathscribe.css';

interface ReasonPromptModalProps {
  show: boolean;
  title: string;
  message?: React.ReactNode;
  /** Label over the reason box. */
  reasonLabel: string;
  confirmLabel: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const ReasonPromptModal: React.FC<ReasonPromptModalProps> = ({ show, title, message, reasonLabel, confirmLabel, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  useEffect(() => { if (show) setReason(''); }, [show]);
  if (!show) return null;
  const trimmed = reason.trim();
  return (
    <div className="ps-overlay ps-overlay--confirm">
      <div className="ps-modal-dark ps-modal-sm" role="dialog" aria-label={title}>
        <span className="ps-modal-dark-title ps-modal-dark-title--confirm">{title}</span>
        {message && <p className="ps-modal-dark-body ps-modal-dark-body--confirm">{message}</p>}
        <label className="ps-reason-prompt-label">
          {reasonLabel}
          <textarea className="ps-reason-prompt-input" rows={3} value={reason} onChange={e => setReason(e.target.value)} autoFocus />
        </label>
        <div className="ps-modal-dark-footer">
          <button type="button" className="ps-btn-ghost-dark" onClick={onCancel}>{t('common.cancel')}</button>
          <button type="button" className="ps-btn-amber" disabled={!trimmed} onClick={() => onConfirm(trimmed)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ReasonPromptModal;
