// src/components/Common/RegistryOptOutBadge.tsx
// Batch 425 (Pete and his developer: "workspace patient card consent badge"). Says on the case's
// patient card that the patient has opted out of screening and/or cancer registry reporting
// (Batch 418, patient-level). Nothing when they haven't. What the opt-out does per registry is
// decided at send time (services/registryConsent/evaluateRegistryConsent.ts), not here.
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PatientRegistryConsent } from '@/types/patient/PatientRegistryConsent';
import { registryOptOutBadge } from '@/services/patients/patientRegistryDetails';

export const RegistryOptOutBadge: React.FC<{ consent: PatientRegistryConsent | undefined }> = ({ consent }) => {
  const { t } = useTranslation();
  const kind = registryOptOutBadge(consent);
  if (kind === 'none') return null;
  return (
    <span className={`ps-badge ps-registry-optout-badge ps-registry-optout-badge--${kind}`} title={t('registryConsent.badge.title')}>
      {t(`registryConsent.badge.${kind}`)}
    </span>
  );
};

export default RegistryOptOutBadge;
