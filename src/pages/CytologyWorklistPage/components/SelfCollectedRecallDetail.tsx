// src/pages/CytologyWorklistPage/components/SelfCollectedRecallDetail.tsx
// Batch 631: under a Recall needed row in Australia and New Zealand: Urgent or Routine, the target window, and the programme's
// recall wording (services/cytology/selfCollectedRecall.ts decides; this only shows it).
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SelfCollectedRecall } from '@/services/cytology/selfCollectedRecall';
import { fillRecallWording, resolveRecallWording, type RecallWordingConfig } from '@/services/cytology/recallWording';
import './SelfCollectedRecallDetail.css';

const K = 'cytologyWorklist.recall';
const HUE: Record<SelfCollectedRecall['priority'], string> = { urgent: '#DC2626', routine: '#EAB308' };
const HUE_VARS = (p: SelfCollectedRecall['priority']) => ({ '--ps-hue': HUE[p] }) as React.CSSProperties;

const SelfCollectedRecallDetail: React.FC<{ recall: SelfCollectedRecall; wording?: RecallWordingConfig }> = ({ recall, wording }) => {
  const { t, i18n } = useTranslation();
  // Batch 640: the lab administrator's wording for this country, kind and language wins over the built-in text.
  const custom = resolveRecallWording(wording, recall.jurisdiction, recall.kind, i18n.language);
  const values = { type: t(`${K}.type.${recall.basis ?? 'genotype_not_reported'}`), next: t(`${K}.next.${recall.colposcopy ? 'colposcopy' : 'management'}`) };
  const text = custom ? fillRecallWording(custom, values) : recall.kind === 'repeat_collection'
    ? t(`${K}.wording.${recall.jurisdiction}.repeat_collection`)
    : t(`${K}.wording.${recall.jurisdiction}.clinician_lbc`, values);
  return (
    <div className="ps-recalldetail" data-recommendation-codes={recall.codes.join(" ")}>
      <div className="ps-recalldetail-head">
        <span className="ps-recalldetail-priority" style={HUE_VARS(recall.priority)}>{t(`${K}.priority.${recall.priority}`)}</span>
        <span>{recall.targetWeeks ? t(`${K}.target`, { min: recall.targetWeeks.min, max: recall.targetWeeks.max }) : t(`${K}.targetAsap`)}</span>
      </div>
      <ul className="ps-recalldetail-codes">
        {recall.codes.map(code => <li key={code}>{t(`${K}.codes.${code}`)}</li>)}
      </ul>
      <p className="ps-recalldetail-text">{text}</p>
    </div>
  );
};

export default SelfCollectedRecallDetail;
