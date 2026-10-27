// src/components/CytologyQc/CytologyQcDiscrepancyModal.tsx
// Batch 396: moved out of CytologyQcQueuePage.tsx so the cytology screening
// page's QC review bar records a discrepancy with the same form.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCytologyQcCodeCategories } from '@/hooks/useCytologyQcCodeCategories';
import { isUnrecognisedSecondaryCode, nextDiscrepancySubmitStep } from '@/services/cytologyQc/resolveQcCodeDivergence';
import './CytologyQcDiscrepancyModal.css';

export interface CytologyQcDiscrepancyInput {
  primaryDiagnosticCode: string;
  secondaryDiagnosticCode: string;
  severity: 'major' | 'minor';
  reviewerCommentary: string;
  /** Batch 669f (cyt-6): true when the reviewer confirmed that the two codes diverge significantly. */
  divergenceConfirmed?: boolean;
}

export const CytologyQcDiscrepancyModal: React.FC<{
  onSubmit: (primary: string, secondary: string, severity: 'major' | 'minor', commentary: string, divergenceConfirmed: boolean) => void;
  onClose: () => void;
}> = ({ onSubmit, onClose }) => {
  const { t } = useTranslation();
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState('');
  const [severity, setSeverity] = useState<'major' | 'minor'>('major');
  const [commentary, setCommentary] = useState('');
  const categories = useCytologyQcCodeCategories();
  // Batch 669f (cyt-6): the decision is the service's; this window shows the confirmation it asks for.
  const [asking, setAsking] = useState(false);
  const edit = (set: (v: string) => void) => (e: { target: { value: string } }) => { set(e.target.value); setAsking(false); };
  const secondaryUnrecognised = isUnrecognisedSecondaryCode(secondary, categories);
  const submit = () => {
    const step = nextDiscrepancySubmitStep({ primary, secondary, confirmed: asking }, categories);
    if (step === 'unrecognised') return;
    if (step === 'confirm') setAsking(true);
    else if (step === 'submit') onSubmit(primary, secondary, severity, commentary, asking);
  };

  return (
    <div data-capture-hide="true" className="ps-conf-backdrop" onClick={onClose}>
      <div className="ps-conf-modal ps-conf-modal--narrow" onClick={e => e.stopPropagation()}>
        <div className="ps-conf-modal-header">{t('cytologyQcQueue.discrepancyModalTitle')}</div>
        <div className="ps-conf-modal-body">
          <label className="ps-label" htmlFor="qc-disc-primary">{t('cytologyQcQueue.primaryCodeLabel')}</label>
          <input id="qc-disc-primary" className="ps-conf-input" value={primary} onChange={edit(setPrimary)} />

          <label className="ps-label" htmlFor="qc-disc-secondary">{t('cytologyQcQueue.secondaryCodeLabel')} <span className="ps-qc-disc-optional">{t('cytologyQcQueue.optionalSuffix')}</span></label>
          <input id="qc-disc-secondary" className="ps-conf-input" value={secondary} onChange={edit(setSecondary)} aria-invalid={secondaryUnrecognised} aria-describedby={secondaryUnrecognised ? 'qc-disc-secondary-msg' : undefined} />
          {secondaryUnrecognised && <div id="qc-disc-secondary-msg" className="ps-qc-disc-field-error" role="alert">{t('cytologyQcQueue.secondaryUnrecognised')}</div>}

          <label className="ps-label" htmlFor="qc-disc-severity">{t('cytologyQcQueue.severityLabel')}</label>
          <select id="qc-disc-severity" className="ps-conf-input" value={severity} onChange={e => setSeverity(e.target.value as 'major' | 'minor')}>
            <option value="major">{t('cytologyQcQueue.severity.major')}</option>
            <option value="minor">{t('cytologyQcQueue.severity.minor')}</option>
          </select>

          <label className="ps-label" htmlFor="qc-disc-commentary">{t('cytologyQcQueue.commentaryLabel')}</label>
          <textarea id="qc-disc-commentary" className="ps-conf-input ps-conf-textarea" value={commentary} onChange={e => setCommentary(e.target.value)} />
          {asking && <div className="ps-qc-disc-confirm" role="alert">{t('cytologyQcQueue.divergenceConfirm')}</div>}
        </div>
        <div className="ps-conf-modal-footer">
          <button className="ps-conf-btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button className="ps-conf-btn-primary" disabled={!primary.trim() || secondaryUnrecognised} onClick={submit}>
            {asking ? t('cytologyQcQueue.confirmDivergenceBtn') : t('cytologyQcQueue.submitDiscrepancyBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CytologyQcDiscrepancyModal;
