// src/components/CytologyQc/AdvisorySeverityBadge.tsx
// Batch 608 (#54): the suggested abnormal severity from a Bethesda review, as
// a badge. Advisory only: it never blocks sign-out.

import { useTranslation } from 'react-i18next';
import type { AbnormalSeverity } from '@/services/abnormalDetection/IAbnormalTriggerRuleService';

export function AdvisorySeverityBadge({ severity }: { severity: AbnormalSeverity }) {
  const { t } = useTranslation();
  return (
    <span className={`ps-qcqueue-sev-pill ps-qcqueue-sev-pill--${severity}`} title={t('cytologyQcQueue.severity.hint')}>
      {t('cytologyQcQueue.severity.badge', { severity: t(`cytologyQcQueue.severity.${severity}`) })}
    </span>
  );
}
