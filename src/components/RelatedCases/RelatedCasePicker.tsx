// src/components/RelatedCases/RelatedCasePicker.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 613: the one case-picker for a patient's other released cases, used by the sign-out view
// (attach to this report) and by the Patient summary print. Nothing is ticked at the start.
// Each row shows who ordered the case and who gets a copy, so the pathologist can decide whether
// it belongs in this report. Shown inline: no window to dismiss.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '@/components/Common/LoadingState';
import { useRelatedCaseCandidates } from '@/hooks/useRelatedCaseCandidates';
import { formatDate } from '@/utils/formatDate';
import { toggleRelatedSelection } from '@/services/relatedCases/relatedCaseRules';
import type { RelatedCaseSnapshot } from '@/services/relatedCases/relatedCaseTypes';

interface Props {
  patientId: string | undefined;
  currentCaseId?: string;
  chosen: readonly RelatedCaseSnapshot[];
  onChange: (next: RelatedCaseSnapshot[]) => void;
  disabled?: boolean;
  /** Offer "Select all" (the patient summary does; the sign-out view leaves the choice case by case). */
  allowSelectAll?: boolean;
  /** Text under the heading, for the place it is used. */
  hint: string;
}

export const RelatedCasePicker: React.FC<Props> = ({ patientId, currentCaseId, chosen, onChange, disabled, allowSelectAll, hint }) => {
  const { t, i18n } = useTranslation();
  const { candidates, loading } = useRelatedCaseCandidates(patientId, currentCaseId);
  const isChosen = (id: string) => chosen.some(c => c.sourceCaseId === id);
  const allChosen = candidates.length > 0 && candidates.every(c => isChosen(c.sourceCaseId));

  return (
    <section className="ps-related-picker" aria-label={t('relatedCases.picker.title')}>
      <div className="ps-related-picker__head">
        <strong>{t('relatedCases.picker.title')}</strong>
        {allowSelectAll && candidates.length > 1 && (
          <button
            type="button"
            className="ps-btn-ghost-dark ps-related-picker__all"
            disabled={disabled}
            onClick={() => onChange(allChosen ? [] : [...candidates])}
          >
            {allChosen ? t('relatedCases.picker.clearAll') : t('relatedCases.picker.selectAll')}
          </button>
        )}
      </div>
      <p className="ps-modal-dark-hint">{hint}</p>
      {loading && <LoadingState variant="inline" label={t('relatedCases.picker.loading')} />}
      {!loading && candidates.length === 0 && <p className="ps-modal-dark-hint">{t('relatedCases.picker.none')}</p>}
      <ul className="ps-related-picker__list">
        {candidates.map(c => (
          <li key={c.sourceCaseId} className="ps-related-picker__row">
            <label className="ps-related-picker__label">
              <input
                type="checkbox"
                checked={isChosen(c.sourceCaseId)}
                disabled={disabled}
                onChange={() => onChange(toggleRelatedSelection(chosen, c))}
              />
              <span className="ps-related-picker__main">
                <span className="ps-related-picker__line">
                  <strong data-phi="accession">{c.accession}</strong>
                  <span>{t('relatedCases.layout.released', { date: formatDate(c.releasedAt, i18n.language) })}</span>
                </span>
                <span className="ps-related-picker__dx">{(c.diagnosis || t('relatedCases.layout.noneRecorded')).split('\n')[0]}</span>
                <span className="ps-related-picker__people">
                  {t('relatedCases.picker.people', {
                    ordering: c.orderingPhysician || t('relatedCases.layout.noneRecorded'),
                    copyTo: c.copyToPhysicians.length > 0 ? c.copyToPhysicians.join(', ') : t('relatedCases.layout.noneRecorded'),
                  })}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
};
