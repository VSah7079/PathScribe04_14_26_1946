// src/pages/AccessionPage/AccessionTechnicalFacilityField.tsx
// Batch 618 (PS-336): optional "technical component performed by" lab on the accession form.
// Shown only when the intake is outside material or a consultation (see
// resolveTechnicalFacilityOffer). Saved on the order when the case is accessioned.

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Facility } from '@/services/facilities/IFacilityService';
import { technicalFacilityChoices, shouldOfferTechnicalFacility, type AccessionIntakeType } from '@/services/accessioning/resolveTechnicalFacilityOffer';

interface Props {
  facilities: Facility[];
  value: string;
  onChange: (facilityId: string) => void;
  intakeType: AccessionIntakeType;
  departmentName?: string;
}

const AccessionTechnicalFacilityField: React.FC<Props> = ({ facilities, value, onChange, intakeType, departmentName }) => {
  const { t } = useTranslation();
  if (!shouldOfferTechnicalFacility({ intakeType, departmentName })) return null;
  return (
    <div>
      <label className="ps-label" htmlFor="accession-technical-facility">{t('accessionPage.technicalFacility.label')}</label>
      <select id="accession-technical-facility" className="ps-input-dark" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{t('accessionPage.technicalFacility.none')}</option>
        {technicalFacilityChoices(facilities).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <span className="ps-helper-text">{t('accessionPage.technicalFacility.help')}</span>
    </div>
  );
};

export default AccessionTechnicalFacilityField;
