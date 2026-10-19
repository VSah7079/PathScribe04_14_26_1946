// Batch 607 (#139, #183): the OPCS-4 tab. OPCS-4 is licensed by NHS Digital (TRUD), so nothing is searched or applied until the licence and server feed exist.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { OPCS4_SAMPLE } from '@/services/coding/opcs4Sample';

export const Opcs4Notice: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="acd-opcs4-notice" data-testid="opcs4-notice" role="note">
      <strong>{t('opcs4Notice.title')}</strong>
      <p>{t('opcs4Notice.body')}</p>
      <div className="fm-eyebrow">{t('opcs4Notice.sampleHeading')} <span className="ps-simulated-badge">{t('opcs4Notice.simulated')}</span></div>
      <ul className="acd-opcs4-sample" data-testid="opcs4-sample">
        {OPCS4_SAMPLE.map(r => <li key={r.code}><span className="fm-code-chip">{r.code}</span> {r.display}</li>)}
      </ul>
      <div className="fm-empty-hint">{t('opcs4Notice.cannotApply')}</div>
    </div>
  );
};
