// src/pages/AccessionPage/ClinicalIndicationField.tsx
// Batch 714: the Clinical Indication box with a small, non-blocking note under it saying
// where the text came from (the order field) and, once edited, that it was edited from the order.
// The decision (order / edited / entered) is in services/orderIntake/clinicalIndicationProvenance.ts.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { RequiredMark } from './RequiredMark';
import { clinicalIndicationOrigin, type ImportedClinicalIndication } from '@/services/orderIntake/clinicalIndicationProvenance';

interface Props {
  value: string;
  onChange: (text: string) => void;
  imported: ImportedClinicalIndication | null;
  required?: boolean;
}

const ClinicalIndicationField: React.FC<Props> = ({ value, onChange, imported, required = false }) => {
  const { t } = useTranslation();
  const origin = clinicalIndicationOrigin(value, imported);
  return (
    <div className="ps-accession-field--full">
      <label className="ps-label" htmlFor="accession-clinical-indication">{t('accessionPage.clinicalIndication.label')}<RequiredMark on={required} /></label>
      <textarea id="accession-clinical-indication" className="ps-input-dark ps-accession-textarea"
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={t('accessionPage.clinicalIndication.placeholder')} />
      {imported && origin === 'order' && (
        <span className="ps-helper-text" data-testid="clinical-indication-note" role="status">
          {imported.field
            ? t('accessionPage.clinicalIndication.note.fromOrder', { field: t(`accessionPage.clinicalIndication.sources.${imported.field}`) })
            : t('accessionPage.clinicalIndication.note.fromOrderUnspecified')}
        </span>
      )}
      {imported && origin === 'editedFromOrder' && (
        <span className="ps-helper-text" data-testid="clinical-indication-note" role="status">
          {t('accessionPage.clinicalIndication.note.edited')} {t('accessionPage.clinicalIndication.note.orderText', { text: imported.text })}
        </span>
      )}
    </div>
  );
};

export default ClinicalIndicationField;
