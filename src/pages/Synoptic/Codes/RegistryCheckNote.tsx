// Batch 605 (#58): what the cancer registry check says about an ICD-O-3 morphology code, shown beside the code
// in the Add Code window. Uses the same reportability rules as sign-out (a named subset of NAACCR, not all of it).
import React from 'react';
import { useTranslation } from 'react-i18next';
import { resolveCancerRegistryReportability } from '@/services/cancerRegistry/resolveCancerRegistryReportability';

export const RegistryCheckNote: React.FC<{ code: string }> = ({ code }) => {
  const { t } = useTranslation();
  if (!/^\d{4}\/\d$/.test(code)) return null;
  const r = resolveCancerRegistryReportability(code, undefined, '');
  return (
    <span className={`ps-registry-check ps-registry-check--${r.outcome}`} data-testid="registry-check" title={r.reason}>
      {t(`registryCheckNote.${r.outcome}`)}
    </span>
  );
};
