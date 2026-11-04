// src/components/Intraop/LateFrozenDiagnosisForm.tsx
// Batch 659 (finding 7): the frozen diagnosis can be added later, from the log. The entry form says so, but a saved
// specimen's card had no box for it. This is that box. It shows and dispatches; the rules (a diagnosis is needed,
// the clock stops, a merged case receives it) are in services/intraop.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './lateFrozenDiagnosis.css';
import { intraoperativeService } from '@/services';
import { SpellCheckedTextarea } from '@/components/SpellCheck/SpellCheckedTextarea';
import type { FrozenCategory } from '@/types/intraop/IntraoperativeEntry';

const CATEGORIES: ReadonlyArray<[FrozenCategory, string]> = [
  ['benign', 'categoryBenign'], ['malignant', 'categoryMalignant'], ['atypical_suspicious', 'categoryAtypical'], ['deferred', 'categoryDeferred'],
];

export const LateFrozenDiagnosisForm: React.FC<{ sessionId: string; specimenId: string; onSaved: () => void }> = ({ sessionId, specimenId, onSaved }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [category, setCategory] = useState<FrozenCategory | ''>('');
  const [failed, setFailed] = useState(false);
  const save = async () => {
    const res = await intraoperativeService.setFrozenSectionDiagnosis(sessionId, specimenId, text, category || undefined);
    setFailed(!res.ok);
    if (res.ok) onSaved();
  };
  return (
    <div className="ps-intraop-late-dx">
      <label className="ps-conf-label" htmlFor={`late-dx-${specimenId}`}>{t('intraopQueue.specimenCard.addFrozenLabel')}</label>
      <SpellCheckedTextarea id={`late-dx-${specimenId}`} className="ps-conf-input ps-conf-textarea" value={text} onChange={e => setText(e.target.value)} placeholder={t('intraopQueue.specimenStep.frozenDxPlaceholder')} />
      <select aria-label={t('intraopQueue.specimenStep.categoryLabel')} className="ps-conf-select" value={category} onChange={e => setCategory(e.target.value as FrozenCategory | '')}>
        <option value="">{t('intraopQueue.specimenStep.categorySelect')}</option>
        {CATEGORIES.map(([value, key]) => <option key={value} value={value}>{t(`intraopQueue.specimenStep.${key}`)}</option>)}
      </select>
      <button type="button" className="ps-conf-btn-row" disabled={!text.trim()} onClick={save}>{t('intraopQueue.specimenCard.addFrozenSave')}</button>
      {failed && <p className="ps-field-still-required" role="alert">{t('intraopQueue.specimenCard.addFrozenFailed')}</p>}
    </div>
  );
};
