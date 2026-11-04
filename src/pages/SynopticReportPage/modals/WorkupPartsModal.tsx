// src/pages/SynopticReportPage/modals/WorkupPartsModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 427 (Pete: "Multi-Part Single Workup"). Which parts one synoptic
// workup covers: Independent (its own part) or Combined (its own part plus
// the parts ticked, one protocol over Part A and Part B). Only a draft
// workup. Presentation only: the rules are services/reports/workupParts.ts;
// the page applies the result (unsaved until Save, like any synoptic edit).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/pathscribe.css';
import type { SynopticReportInstance } from '@/types/case/Case';
import { setWorkupParts, type WorkupPartsMode } from '@/services/reports/workupParts';

interface Props {
  instance: SynopticReportInstance | null;
  reports: SynopticReportInstance[];
  specimens: { id: string; label: string; description?: string }[];
  onApply: (choice: { mode: WorkupPartsMode; additionalSpecimenIds: string[] }) => void;
  onClose: () => void;
}

export const WorkupPartsModal: React.FC<Props> = ({ instance, reports, specimens, onApply, onClose }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<WorkupPartsMode>('independent');
  const [chosen, setChosen] = useState<string[]>([]);
  useEffect(() => {
    const extra = instance?.additionalSpecimenIds ?? [];
    setMode(extra.length ? 'combined' : 'independent');
    setChosen(extra);
  }, [instance]);
  if (!instance) return null;

  const own = specimens.find(s => s.id === instance.specimenId);
  const others = specimens.filter(s => s.id !== instance.specimenId);
  const check = setWorkupParts(reports, specimens.map(s => s.id), instance.instanceId, { mode, additionalSpecimenIds: chosen }, '');
  const problem = check.ok === false
    ? t(`workupParts.problems.${check.reason}`, { part: specimens.find(s => s.id === check.specimenId)?.label ?? check.specimenId ?? '' })
    : null;

  return (
    <div className="ps-overlay ps-overlay--confirm" role="dialog" aria-modal="true" aria-label={t('workupParts.title')}>
      <div className="ps-modal-dark ps-modal-sm ps-workup-parts-modal">
        <span className="ps-modal-dark-title">{t('workupParts.title')}</span>
        <p className="ps-modal-dark-body">{t('workupParts.subtitle', { protocol: instance.templateName })}</p>
        <div className="ps-workup-parts-modes" role="radiogroup">
          {(['independent', 'combined'] as const).map(m => (
            <label key={m} className="ps-workup-parts-mode">
              <input type="radio" name="workup-parts-mode" checked={mode === m} onChange={() => setMode(m)} />
              <span><strong>{t(`workupParts.modes.${m}.label`)}</strong> — {t(`workupParts.modes.${m}.hint`)}</span>
            </label>
          ))}
        </div>
        <div className="ps-workup-parts-list">
          <label className="ps-workup-parts-part ps-workup-parts-part--own">
            <input type="checkbox" checked disabled />
            {t('workupParts.partLabel', { part: own?.label ?? instance.specimenId, description: own?.description ?? '' })}
          </label>
          {mode === 'combined' && others.map(s => (
            <label key={s.id} className="ps-workup-parts-part">
              <input type="checkbox" checked={chosen.includes(s.id)}
                onChange={e => setChosen(e.target.checked ? [...chosen, s.id] : chosen.filter(id => id !== s.id))} />
              {t('workupParts.partLabel', { part: s.label, description: s.description ?? '' })}
            </label>
          ))}
          {mode === 'combined' && others.length === 0 && <div className="ps-regx-muted">{t('workupParts.noOtherParts')}</div>}
        </div>
        <p className="ps-regx-muted">{t('workupParts.aiNote')}</p>
        {problem && <p className="ps-fieldreq-note">{problem}</p>}
        <div className="ps-modal-dark-footer">
          <button type="button" className="ps-btn-ghost-dark" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="ps-btn-amber" disabled={!!problem} onClick={() => onApply({ mode, additionalSpecimenIds: chosen })}>{t('workupParts.apply')}</button>
        </div>
      </div>
    </div>
  );
};

export default WorkupPartsModal;
