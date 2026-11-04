// src/components/ExternalConsult/ConsultLifetimeLine.tsx
// Batch 669 (access-11): after a signed opinion, the issuer-side lists (the External Consult window and
// Audit Log -> Consult links) say how many views / hours the link has left, or why it closed.
// The numbers come from services/consultAccess/consultLinkLifetime.ts; nothing is decided here.
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ConsultToken } from '@/services/consultAccess/IConsultTokenService';
import { consultLifetimeLine } from '@/services/consultAccess/consultLinkLifetime';
import './consultLifetimeLine.css';

export const ConsultLifetimeLine: React.FC<{ link: ConsultToken }> = ({ link }) => {
  const { t } = useTranslation();
  const line = consultLifetimeLine(link);
  if (!line) return null;
  return (
    <div className="ps-consult-lifetime-line">
      {line.key === 'open'
        ? t('consultLifetime.line.open', { views: t('consultLifetime.views', { count: line.remainingViews }), hours: t('consultLifetime.hours', { count: line.hoursRemaining }) })
        : t(`consultLifetime.line.${line.key}`)}
    </div>
  );
};
