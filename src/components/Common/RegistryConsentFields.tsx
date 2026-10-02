// src/components/Common/RegistryConsentFields.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 418 (Registry Engine SRS v2.1, FR-008.1). The patient's registry
// opt-outs, as two checkboxes. Presentation only: the rule that decides what
// an opt-out means per registry is services/registryConsent/
// evaluateRegistryConsent.ts, and saving is recordPatientRegistryConsent.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  screeningOptOut: boolean;
  cancerRegistryOptOut: boolean;
  onChange: (next: { screeningOptOut: boolean; cancerRegistryOptOut: boolean }) => void;
  disabled?: boolean;
}

export const RegistryConsentFields: React.FC<Props> = ({ screeningOptOut, cancerRegistryOptOut, onChange, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="ps-registry-consent">
      <div className="ps-label">{t('registryConsent.title')}</div>
      <label className="ps-registry-check">
        <input type="checkbox" checked={screeningOptOut} disabled={disabled}
          onChange={e => onChange({ screeningOptOut: e.target.checked, cancerRegistryOptOut })} />
        {t('registryConsent.screeningOptOut')}
      </label>
      <label className="ps-registry-check" title={t('registryConsent.cancerOptOutNote')}>
        <input type="checkbox" checked={cancerRegistryOptOut} disabled={disabled}
          onChange={e => onChange({ screeningOptOut, cancerRegistryOptOut: e.target.checked })} />
        {t('registryConsent.cancerOptOut')}
      </label>
    </div>
  );
};

export default RegistryConsentFields;
