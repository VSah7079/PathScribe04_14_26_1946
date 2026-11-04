// src/components/Grossing/GrossingFieldNote.tsx
// Batch 397 (PS-359): under a block's piece count or piece description in the
// block editors, says the organisation needs it before grossing can be
// completed. The editors save as you type; Complete grossing is what checks
// (services/grossing/grossingCompletion.ts, blockGrossingFieldsMissing).
import { useTranslation } from 'react-i18next';

export function GrossingFieldNote({ missing }: { missing: boolean }) {
  const { t } = useTranslation();
  if (!missing) return null;
  return <p className="ps-field-still-required" role="status">{t('fieldRequirements.neededToCompleteGrossing')}</p>;
}

/** The "*" beside a label for a field the organisation requires. */
export function RequiredMark({ required }: { required: boolean }) {
  if (!required) return null;
  return <span className="ps-conf-required" aria-hidden="true"> *</span>;
}

export default GrossingFieldNote;
