// src/components/Intraop/IntraopFieldBits.tsx
// Batch 397/399 (PS-359): "Still required: …" and the required "*" for the
// Intraop page's forms (moved here from IntraopQueuePage.tsx in Batch 399 so
// the verbal report form shares them).
import React from 'react';
import { useTranslation } from 'react-i18next';
import { isFieldRequired, type ResolvedFieldRequirement } from '@/services';
import { formatList } from '@/utils/formatList';

export const StillRequired: React.FC<{ missing: string[] }> = ({ missing }) => {
  const { t, i18n } = useTranslation();
  if (missing.length === 0) return null;
  return (
    <p className="ps-field-still-required" role="status">
      {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.intraop.${id}`)), i18n.language) })}
    </p>
  );
};

/** The "*" beside the label of a field the organisation requires. */
export const Req: React.FC<{ requirements: readonly ResolvedFieldRequirement[]; id: string }> = ({ requirements, id }) =>
  isFieldRequired(requirements, id) ? <span className="ps-conf-required" aria-hidden="true"> *</span> : null;
