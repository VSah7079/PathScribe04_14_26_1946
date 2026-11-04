// src/components/QualityAssurance/QaReviewMessage.tsx
// Batch 396: why a peer-review action didn't go through (no permission, or it
// couldn't be saved), for the QA review bars on case screens.
import { useTranslation } from 'react-i18next';

export function QaReviewMessage({ messageKey }: { messageKey: string | null }) {
  const { t } = useTranslation();
  if (!messageKey) return null;
  return <div className="ps-qcqueue-error" role="alert">{t(messageKey)}</div>;
}

export default QaReviewMessage;
