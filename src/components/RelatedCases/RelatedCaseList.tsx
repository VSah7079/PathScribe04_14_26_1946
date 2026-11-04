// src/components/RelatedCases/RelatedCaseList.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 613: the one layout for a patient's related released cases. The sign-out view shows the
// cases the signer attached with it, and the Patient summary print uses it for the whole sheet,
// so the two always read alike. The report renderer (functions/main.py) draws the same fields
// in the same order. Content is the other case's recorded text, shown as recorded (not translated).
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/formatDate';
import type { RelatedCaseSnapshot } from '@/services/relatedCases/relatedCaseTypes';

export const RelatedCaseList: React.FC<{ cases: readonly RelatedCaseSnapshot[]; className?: string }> = ({ cases, className }) => {
  const { t, i18n } = useTranslation();
  return (
    <div className={`ps-related-list ${className ?? ''}`.trim()}>
      {cases.map(s => (
        <article key={s.sourceCaseId} className="ps-related-card">
          <header className="ps-related-card__head">
            <strong data-phi="accession">{s.accession}</strong>
            <span className="ps-related-card__date">{t('relatedCases.layout.released', { date: formatDate(s.releasedAt, i18n.language) })}</span>
          </header>
          {s.specimens.length > 0 && (
            <div className="ps-related-card__row">
              <span className="ps-related-card__label">{t('relatedCases.layout.specimens')}</span>
              <span>{s.specimens.join('; ')}</span>
            </div>
          )}
          {s.intraoperativeDiagnosis && (
            <div className="ps-related-card__row">
              <span className="ps-related-card__label">{t('relatedCases.layout.intraoperative')}</span>
              <span className="ps-related-card__multiline">{s.intraoperativeDiagnosis}</span>
            </div>
          )}
          <div className="ps-related-card__row">
            <span className="ps-related-card__label">{t('relatedCases.layout.diagnosis')}</span>
            <span className="ps-related-card__multiline">{s.diagnosis || t('relatedCases.layout.noneRecorded')}</span>
          </div>
          {s.signedBy && (
            <div className="ps-related-card__row">
              <span className="ps-related-card__label">{t('relatedCases.layout.signedBy')}</span>
              <span>{s.signedBy}</span>
            </div>
          )}
          <RelatedCasePeople snapshot={s} />
        </article>
      ))}
    </div>
  );
};

/** The physicians and client tied to a related case. */
export const RelatedCasePeople: React.FC<{ snapshot: RelatedCaseSnapshot }> = ({ snapshot: s }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="ps-related-card__row">
        <span className="ps-related-card__label">{t('relatedCases.layout.orderingPhysician')}</span>
        <span>{s.orderingPhysician || t('relatedCases.layout.noneRecorded')}</span>
      </div>
      <div className="ps-related-card__row">
        <span className="ps-related-card__label">{t('relatedCases.layout.copyTo')}</span>
        <span>{s.copyToPhysicians.length > 0 ? s.copyToPhysicians.join(', ') : t('relatedCases.layout.noneRecorded')}</span>
      </div>
      {s.client && (
        <div className="ps-related-card__row">
          <span className="ps-related-card__label">{t('relatedCases.layout.client')}</span>
          <span>{s.client}</span>
        </div>
      )}
    </>
  );
};
