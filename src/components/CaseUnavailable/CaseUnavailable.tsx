// src/components/CaseUnavailable/CaseUnavailable.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 396 (Pete's privacy model, rules 2 to 4): what a reader sees when a
// case can't be opened for them, whatever the reason: it doesn't exist, it
// belongs to another organisation, or it is restricted. One message for all
// of them, so the screen never confirms that a case exists. The reason is
// logged for support by services/cases/openCaseForView.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { Trans, useTranslation } from 'react-i18next';

interface CaseUnavailableProps {
  caseId: string;
  onBack: () => void;
}

export function CaseUnavailable({ caseId, onBack }: CaseUnavailableProps) {
  const { t } = useTranslation();
  return (
    <div className="ps-case-unavailable" role="alert">
      <div className="ps-case-unavailable__icon" aria-hidden="true">🔒</div>
      <h1 className="ps-case-unavailable__title">{t('caseUnavailable.title')}</h1>
      <p className="ps-case-unavailable__body">
        <Trans
          i18nKey="caseUnavailable.body"
          values={{ id: caseId || '—' }}
          components={{ id: <code className="ps-case-unavailable__id" data-phi="accession" /> }}
        />
      </p>
      <button type="button" onClick={onBack} className="ps-btn-primary ps-case-unavailable__back">
        {t('caseUnavailable.back')}
      </button>
    </div>
  );
}

export default CaseUnavailable;
