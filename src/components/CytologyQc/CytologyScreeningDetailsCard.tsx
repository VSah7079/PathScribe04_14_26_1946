// src/components/CytologyQc/CytologyScreeningDetailsCard.tsx
// Batch 608 (#51, #52, #76): the specimen details the QA reports read, recorded
// on the screening page: the HPV assay, the liquid-based platform (ThinPrep or
// SurePath), and what was done about a positive HPV result (colposcopy referral
// and response), which UK-QA-01 counts.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CytologyScreeningRecord } from '@/types/case/Specimen';

type Platform = NonNullable<CytologyScreeningRecord['liquidBasedPlatform']>;
type FollowUp = NonNullable<CytologyScreeningRecord['hpvFollowUp']>;

const PLATFORMS: Platform[] = ['ThinPrep', 'SurePath', 'other'];
const ACTIONS: FollowUp['action'][] = ['colposcopy_referral', 'repeat_hpv', 'no_action'];

interface Props {
  screening: Pick<CytologyScreeningRecord, 'hpvResult' | 'hpvAssayName' | 'liquidBasedPlatform' | 'hpvFollowUp'> | undefined;
  onSave: (patch: Partial<Pick<CytologyScreeningRecord, 'hpvAssayName' | 'liquidBasedPlatform' | 'hpvFollowUp'>>) => void | Promise<void>;
}

export function CytologyScreeningDetailsCard({ screening, onSave }: Props) {
  const { t } = useTranslation();
  const [assay, setAssay] = useState(screening?.hpvAssayName ?? '');
  const [action, setAction] = useState<FollowUp['action'] | ''>(screening?.hpvFollowUp?.action ?? '');
  const [referredAt, setReferredAt] = useState(screening?.hpvFollowUp?.referredAt ?? '');
  const [responseAt, setResponseAt] = useState(screening?.hpvFollowUp?.responseAt ?? '');
  useEffect(() => {
    setAssay(screening?.hpvAssayName ?? '');
    setAction(screening?.hpvFollowUp?.action ?? '');
    setReferredAt(screening?.hpvFollowUp?.referredAt ?? '');
    setResponseAt(screening?.hpvFollowUp?.responseAt ?? '');
  }, [screening?.hpvAssayName, screening?.hpvFollowUp?.action, screening?.hpvFollowUp?.referredAt, screening?.hpvFollowUp?.responseAt]);

  const saveFollowUp = (next: { action: FollowUp['action'] | ''; referredAt: string; responseAt: string }) => {
    if (!next.action) { void onSave({ hpvFollowUp: undefined }); return; }
    const referral = next.action === 'colposcopy_referral';
    void onSave({ hpvFollowUp: { action: next.action, ...(referral && next.referredAt ? { referredAt: next.referredAt } : {}), ...(referral && next.responseAt ? { responseAt: next.responseAt } : {}) } });
  };
  const positive = screening?.hpvResult === 'Positive';

  return (
    <div className="ps-cytoscreen-card ps-cyto-details-card">
      <label className="ps-conf-label" htmlFor="cyto-platform">{t('cytologyDetails.platformLabel')}</label>
      <select id="cyto-platform" className="ps-conf-select" value={screening?.liquidBasedPlatform ?? ''}
        onChange={e => void onSave({ liquidBasedPlatform: (e.target.value || undefined) as Platform | undefined })}>
        <option value="">{t('cytologyDetails.notRecorded')}</option>
        {PLATFORMS.map(p => <option key={p} value={p}>{t(`cytologyDetails.platform.${p}`)}</option>)}
      </select>

      <label className="ps-conf-label" htmlFor="cyto-assay">{t('cytologyDetails.assayLabel')}</label>
      <input id="cyto-assay" className="ps-conf-input" value={assay} onChange={e => setAssay(e.target.value)}
        onBlur={() => { if (assay.trim() !== (screening?.hpvAssayName ?? '')) void onSave({ hpvAssayName: assay.trim() || undefined }); }} />

      {positive && (
        <>
          <label className="ps-conf-label" htmlFor="cyto-followup">{t('cytologyDetails.followUpLabel')}</label>
          <select id="cyto-followup" className="ps-conf-select" value={action}
            onChange={e => { const a = e.target.value as FollowUp['action'] | ''; setAction(a); saveFollowUp({ action: a, referredAt, responseAt }); }}>
            <option value="">{t('cytologyDetails.notRecorded')}</option>
            {ACTIONS.map(a => <option key={a} value={a}>{t(`cytologyDetails.action.${a}`)}</option>)}
          </select>
          {action === 'colposcopy_referral' && (
            <>
              <label className="ps-conf-label" htmlFor="cyto-referred">{t('cytologyDetails.referredAtLabel')}</label>
              <input id="cyto-referred" type="date" className="ps-conf-input" value={referredAt}
                onChange={e => setReferredAt(e.target.value)} onBlur={() => saveFollowUp({ action, referredAt, responseAt })} />
              <label className="ps-conf-label" htmlFor="cyto-responded">{t('cytologyDetails.respondedAtLabel')}</label>
              <input id="cyto-responded" type="date" className="ps-conf-input" value={responseAt}
                onChange={e => setResponseAt(e.target.value)} onBlur={() => saveFollowUp({ action, referredAt, responseAt })} />
              <span className="ps-conf-hint">{t('cytologyDetails.failsafeHint')}</span>
            </>
          )}
        </>
      )}
    </div>
  );
}
