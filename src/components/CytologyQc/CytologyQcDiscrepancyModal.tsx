// src/components/CytologyQc/CytologyQcDiscrepancyModal.tsx
// Batch 396: moved out of CytologyQcQueuePage.tsx so the cytology screening
// page's QC review bar records a discrepancy with the same form.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface CytologyQcDiscrepancyInput {
  primaryDiagnosticCode: string;
  secondaryDiagnosticCode: string;
  severity: 'major' | 'minor';
  reviewerCommentary: string;
}

export const CytologyQcDiscrepancyModal: React.FC<{
  onSubmit: (primary: string, secondary: string, severity: 'major' | 'minor', commentary: string) => void;
  onClose: () => void;
}> = ({ onSubmit, onClose }) => {
  const { t } = useTranslation();
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState('');
  const [severity, setSeverity] = useState<'major' | 'minor'>('major');
  const [commentary, setCommentary] = useState('');

  return (
    <div data-capture-hide="true" className="ps-conf-backdrop" onClick={onClose}>
      <div className="ps-conf-modal ps-conf-modal--narrow" onClick={e => e.stopPropagation()}>
        <div className="ps-conf-modal-header">{t('cytologyQcQueue.discrepancyModalTitle')}</div>
        <div className="ps-conf-modal-body">
          <label className="ps-label" htmlFor="qc-disc-primary">{t('cytologyQcQueue.primaryCodeLabel')}</label>
          <input id="qc-disc-primary" className="ps-conf-input" value={primary} onChange={e => setPrimary(e.target.value)} />

          <label className="ps-label" htmlFor="qc-disc-secondary">{t('cytologyQcQueue.secondaryCodeLabel')}</label>
          <input id="qc-disc-secondary" className="ps-conf-input" value={secondary} onChange={e => setSecondary(e.target.value)} />

          <label className="ps-label" htmlFor="qc-disc-severity">{t('cytologyQcQueue.severityLabel')}</label>
          <select id="qc-disc-severity" className="ps-conf-input" value={severity} onChange={e => setSeverity(e.target.value as 'major' | 'minor')}>
            <option value="major">{t('cytologyQcQueue.severity.major')}</option>
            <option value="minor">{t('cytologyQcQueue.severity.minor')}</option>
          </select>

          <label className="ps-label" htmlFor="qc-disc-commentary">{t('cytologyQcQueue.commentaryLabel')}</label>
          <textarea id="qc-disc-commentary" className="ps-conf-input ps-conf-textarea" value={commentary} onChange={e => setCommentary(e.target.value)} />
        </div>
        <div className="ps-conf-modal-footer">
          <button className="ps-conf-btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button className="ps-conf-btn-primary" disabled={!primary.trim() || !secondary.trim()} onClick={() => onSubmit(primary, secondary, severity, commentary)}>
            {t('cytologyQcQueue.submitDiscrepancyBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CytologyQcDiscrepancyModal;
