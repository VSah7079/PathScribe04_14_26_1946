// src/components/RelatedCases/RelatedCasesAmendedNotice.tsx
// Batch 613: a flag on a signed report when a related case sent with it was amended later.
// It informs; the section attached to the signed report does not change.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAmendedRelatedCases } from '@/hooks/useAmendedRelatedCases';

export const RelatedCasesAmendedNotice: React.FC<{ caseId: string | undefined; status: string | undefined }> = ({ caseId, status }) => {
  const { t } = useTranslation();
  const amended = useAmendedRelatedCases(caseId, status);
  if (amended.length === 0) return null;
  return (
    <div className="ps-related-amended-banner" role="note" data-phi="accession">
      {t('relatedCases.amended.banner', { count: amended.length, list: amended.map(a => a.accession).join(', ') })}
    </div>
  );
};
