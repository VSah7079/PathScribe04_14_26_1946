// src/pages/AccessionPage/RequiredMark.tsx
// Batch 720 (Pete, Episode 3 review): a required field shows a red asterisk beside its label. Which fields are
// required comes from the organisation's Field Requirements (the locked ones always), so the mark follows the
// settings. The asterisk is drawn by CSS (.ps-required::after), so the label's own text is unchanged.
import React from 'react';
import { useTranslation } from 'react-i18next';

export const RequiredMark: React.FC<{ on: boolean }> = ({ on }) => {
  const { t } = useTranslation();
  if (!on) return null;
  return <span className="ps-required" title={t('accessionPage.requiredMark.title')} />;
};
