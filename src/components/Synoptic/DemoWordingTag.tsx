// src/components/Synoptic/DemoWordingTag.tsx
// Batch 755a (Pete, Oct 31, 2026): the "Demo wording" tag shown beside a demonstration checklist's name, until a
// pathologist has reviewed its wording (services/templates/demoChecklists.ts decides which checklists carry it).
import React from 'react';
import { useTranslation } from 'react-i18next';
import { showsDemoWordingTag } from '@/services/templates/demoChecklists';

export const DemoWordingTag: React.FC<{ templateId?: string | null }> = ({ templateId }) => {
  const { t } = useTranslation();
  if (!showsDemoWordingTag(templateId)) return null;
  return <span className="ps-demo-data-badge" title={t('demoChecklists.wordingTagHint')}>{t('demoChecklists.wordingTag')}</span>;
};
