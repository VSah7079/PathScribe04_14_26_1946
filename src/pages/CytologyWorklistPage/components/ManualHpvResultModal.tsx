// src/pages/CytologyWorklistPage/components/ManualHpvResultModal.tsx
// Batch 630: the dialog behind "Record Positive / Negative". It asks for the Result Source (required) and, when the entry
// would replace a result from the interface, says it will wait for a different authorised person's approval.
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HPV_MANUAL_SOURCES } from '@/types/case/HpvManualEntry';
import '@/pathscribe.css';
import './ManualHpvResultModal.css';

const K = 'cytologyWorklist.manualHpv';

interface Props {
  show: boolean;
  result: 'Positive' | 'Negative';
  /** The held interface result this entry would replace (already translated), or null when it replaces nothing. */
  replacing: string | null;
  onConfirm: (source: string) => void;
  onCancel: () => void;
}

const ManualHpvResultModal: React.FC<Props> = ({ show, result, replacing, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const [source, setSource] = useState('');
  useEffect(() => { if (show) setSource(''); }, [show]);
  if (!show) return null;
  const title = t(`${K}.title${result}`);
  return (
    <div className="ps-overlay ps-overlay--confirm">
      <div className="ps-modal-dark ps-modal-sm" role="dialog" aria-label={title}>
        <span className="ps-modal-dark-title ps-modal-dark-title--confirm">{title}</span>
        <p className="ps-modal-dark-body ps-modal-dark-body--confirm">{t(`${K}.body`)}</p>
        <label className="ps-manualhpv-label">
          {t(`${K}.sourceLabel`)}
          <select className="ps-manualhpv-select" value={source} onChange={e => setSource(e.target.value)} autoFocus>
            <option value="">{t(`${K}.sourcePlaceholder`)}</option>
            {HPV_MANUAL_SOURCES.map(s => <option key={s} value={s}>{t(`${K}.sources.${s}`)}</option>)}
          </select>
        </label>
        {replacing && <p className="ps-manualhpv-notice" role="note">{t(`${K}.overwriteNotice`, { previous: replacing })}</p>}
        <div className="ps-modal-dark-footer">
          <button type="button" className="ps-btn-ghost-dark" onClick={onCancel}>{t('common.cancel')}</button>
          <button type="button" className="ps-btn-amber" disabled={!source} onClick={() => onConfirm(source)}>
            {t(replacing ? `${K}.confirmPending` : `${K}.confirmDirect`)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualHpvResultModal;
