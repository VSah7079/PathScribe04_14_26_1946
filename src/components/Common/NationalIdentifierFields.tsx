// src/components/Common/NationalIdentifierFields.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 417 (Registry Engine SRS v2.1, FR-004.3). One input per national
// identifier the lab's jurisdiction uses (NHS number, BSN, IHI…), separate from
// the MRN, with the check-digit result shown as the person types. Presentation
// only: the rule is services/patientIdentifiers/checkDigits.ts, and saving is
// recordNationalPatientIdentifier (the capability check lives there).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Jurisdiction } from '@/types/systemConfig';
import { NATIONAL_IDENTIFIER_SYSTEMS_BY_JURISDICTION, verifyNationalIdentifier } from '@/services/patientIdentifiers/checkDigits';

interface Props {
  jurisdiction: Jurisdiction | undefined;
  /** system id → the typed value. */
  values: Record<string, string>;
  onChange: (system: string, value: string) => void;
  disabled?: boolean;
}

export const NationalIdentifierFields: React.FC<Props> = ({ jurisdiction, values, onChange, disabled }) => {
  const { t } = useTranslation();
  const systems = jurisdiction ? NATIONAL_IDENTIFIER_SYSTEMS_BY_JURISDICTION[jurisdiction] : [];
  if (!systems.length) return null;
  return (
    <>
      {systems.map(system => {
        const value = values[system] ?? '';
        const check = value.trim() ? verifyNationalIdentifier(system, value) : null;
        return (
          <div key={system} className="ps-national-id">
            <label className="ps-label ps-label--with-badge" htmlFor={`national-id-${system}`}>
              {t(`nationalIdentifiers.systems.${system}`)}
              {check && (
                <span className={`ps-badge ps-national-id__status ps-national-id__status--${check.status}`} title={check.reasonKey ? t(check.reasonKey) : undefined}>
                  {t(`nationalIdentifiers.status.${check.status}`)}
                </span>
              )}
            </label>
            <input id={`national-id-${system}`} data-phi="nhs" className="ps-input-dark" value={value} disabled={disabled}
              onChange={e => onChange(system, e.target.value)} title={t('nationalIdentifiers.help')} />
          </div>
        );
      })}
    </>
  );
};

export default NationalIdentifierFields;
