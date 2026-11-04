// src/pages/CytologyWorklistPage/components/CytologySpecimenTabs.tsx
// Batch 411 (PS-359; Pete: multi-site FNAs and concurrent Non-GYN and FNA
// specimens under one accession). The case's cytology specimens as tabs, each
// with its own status, and the case's progress towards Final. Finalizing the
// case before every specimen is signed out needs cytology:case:finalize and a
// reason (services/cytology/cytologyCaseFinalization.ts); this only renders.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import type { CytologySpecimenTab } from '@/services/cytology/loadCytologyWorkspace';
import type { CytologyCaseProgress } from '@/services/cytology/cytologyWorkspaceView';
import { formatDateTime } from '@/utils/formatDate';

interface Props {
  caseId: string;
  tabs: CytologySpecimenTab[];
  selectedId: string | null;
  onSelect: (specimenId: string) => void;
  progress: CytologyCaseProgress;
  finalizing: boolean;
  onFinalizeEarly: (reason: string) => Promise<boolean>;
}

export function CytologySpecimenTabs({ caseId, tabs, selectedId, onSelect, progress, finalizing, onFinalizeEarly }: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  if (!progress.multiSpecimen && !progress.earlyFinalization) return null;
  return (
    <section className="ps-cyto-specimens" aria-label={t('cytologyScreening.specimens.tabsLabel')}>
      {progress.multiSpecimen && (
        <div className="ps-cyto-specimens-tabs" role="tablist">
          {tabs.map(tab => (
            <button key={tab.id} role="tab" aria-selected={tab.id === selectedId}
              className={`ps-cyto-specimen-tab ${tab.id === selectedId ? 'ps-cyto-specimen-tab--active' : ''}`}
              onClick={() => onSelect(tab.id)}>
              <span className="ps-cyto-specimen-tab-label">{t('cytologyScreening.specimens.tabLabel', { label: tab.label })}</span>
              {tab.description && <span className="ps-cyto-specimen-tab-desc">{tab.description}</span>}
              <span className={`ps-cyto-specimen-status ps-cyto-specimen-status--${tab.status}`}>{t(`cytologyScreening.specimens.status.${tab.status}`)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="ps-cyto-specimens-progress">
        {progress.multiSpecimen && <span>{t('cytologyScreening.specimens.progress', { signed: progress.signedOut, total: progress.total })}</span>}
        {progress.canFinalizeEarly && !open && (
          <CapabilityButton capability="cytology:case:finalize" context={{ caseId }} onClick={() => setOpen(true)}
            className="ps-cyto-specimens-finalize-btn">
            {t('cytologyScreening.specimens.finalizeEarly.button')}
          </CapabilityButton>
        )}
      </div>
      {open && (
        <div className="ps-cyto-specimens-finalize">
          <label className="ps-cyto-specimens-finalize-label" htmlFor="cyto-finalize-reason">
            {t('cytologyScreening.specimens.finalizeEarly.reasonLabel', { count: progress.total - progress.signedOut })}
          </label>
          <textarea id="cyto-finalize-reason" className="ps-cyto-specimens-finalize-reason" value={reason} onChange={e => setReason(e.target.value)} rows={2} />
          <div className="ps-cyto-specimens-finalize-actions">
            <button className="ps-cyto-specimens-finalize-cancel" onClick={() => { setOpen(false); setReason(''); }}>{t('common.cancel')}</button>
            <button className="ps-cyto-specimens-finalize-confirm" disabled={finalizing || !reason.trim()}
              onClick={async () => { if (await onFinalizeEarly(reason)) { setOpen(false); setReason(''); } }}>
              {t('cytologyScreening.specimens.finalizeEarly.confirm')}
            </button>
          </div>
        </div>
      )}
      {progress.earlyFinalization && (
        <div className="ps-cyto-specimens-early-notice">
          {t('cytologyScreening.specimens.finalizeEarly.notice', {
            name: progress.earlyFinalization.finalizedByName,
            date: formatDateTime(progress.earlyFinalization.finalizedAt, i18n.language),
            reason: progress.earlyFinalization.reason,
          })}
        </div>
      )}
    </section>
  );
}
