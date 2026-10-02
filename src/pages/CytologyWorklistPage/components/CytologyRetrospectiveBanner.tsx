// src/pages/CytologyWorklistPage/components/CytologyRetrospectiveBanner.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The 5-year retrospective review banner on the Cytology screening page
// (moved out of CytologyScreeningPage.tsx in Batch 386, PS-359, closing
// PS-213's UI gap). Shown while the flag is real and unresolved. The outcome
// is locked as required; a corrective action is a switch, and asked for only
// when the outcome isn't Confirmed Negative. "complete retrospective review"
// (CYTOLOGY_COMPLETE_RETROSPECTIVE) acts exactly as the button.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { actionRegistryService, cytologyFieldRequired, retrospectiveMissing } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import { formatList } from '@/utils/formatList';

export type RetrospectiveOutcome = 'confirmed_negative' | 'screening_error' | 'interpretation_error' | 'sampling_error';
const OUTCOMES: RetrospectiveOutcome[] = ['confirmed_negative', 'screening_error', 'interpretation_error', 'sampling_error'];

interface Props {
  /** The case whose new HSIL+/AIS/malignant diagnosis triggered the lookback. */
  triggeredByCaseId: string;
  outcome: RetrospectiveOutcome | '';
  correctiveAction: string;
  onOutcomeChange: (outcome: RetrospectiveOutcome | '') => void;
  onCorrectiveActionChange: (text: string) => void;
  saving: boolean;
  requirements: readonly ResolvedFieldRequirement[];
  onComplete: () => void;
}

export const CytologyRetrospectiveBanner: React.FC<Props> = ({
  triggeredByCaseId, outcome, correctiveAction, onOutcomeChange, onCorrectiveActionChange, saving, requirements, onComplete,
}) => {
  const { t, i18n } = useTranslation();
  const missing = retrospectiveMissing(outcome, correctiveAction, requirements);
  const canComplete = missing.length === 0 && !saving;
  const star = (id: string) => cytologyFieldRequired(requirements, id) && <span className="ps-conf-required"> *</span>;

  // Voice/keyboard "complete retrospective review": the same button, with the same check.
  const completeRef = useRef(() => { if (canComplete) onComplete(); });
  completeRef.current = () => { if (canComplete) onComplete(); };
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'CYTOLOGY_COMPLETE_RETROSPECTIVE') completeRef.current();
  }), []);

  return (
    <div className="ps-cytoscreen-banner--retro">
      <div className="ps-cytoscreen-banner-title--retro">{t('cytologyScreening.retrospective.title')}</div>
      <div className="ps-cytoscreen-banner-body--retro">
        <Trans i18nKey="cytologyScreening.retrospective.body" values={{ caseId: triggeredByCaseId }} components={{ accession: <span data-phi="accession" /> }} />
      </div>
      <div className="ps-cytoscreen-banner-form-row">
        <div>
          <label className="ps-label" htmlFor="retro-outcome">{t('cytologyScreening.retrospective.outcome')}{star('retroOutcome')}</label>
          <select id="retro-outcome" className="ps-input-dark" value={outcome} onChange={e => onOutcomeChange(e.target.value as RetrospectiveOutcome | '')}>
            <option value="">{t('cytologyScreening.retrospective.selectOption')}</option>
            {OUTCOMES.map(o => <option key={o} value={o}>{t(`cytologyScreening.retrospective.outcomes.${o}`)}</option>)}
          </select>
        </div>
        <div className="ps-cytoscreen-banner-field--grow">
          <label className="ps-label" htmlFor="retro-corrective">{t('cytologyScreening.retrospective.correctiveAction')}{star('retroCorrectiveAction')}</label>
          <input id="retro-corrective" className="ps-input-dark ps-w-full" value={correctiveAction} onChange={e => onCorrectiveActionChange(e.target.value)}
            placeholder={t('cytologyScreening.retrospective.correctiveActionPlaceholder')} />
        </div>
        <button onClick={onComplete} disabled={!canComplete}
          className={`ps-cytoscreen-banner-btn ${canComplete ? 'ps-cytoscreen-banner-btn--active' : 'ps-cytoscreen-banner-btn--inactive'}`}>
          {saving ? t('common.saving') : t('cytologyScreening.retrospective.completeBtn')}
        </button>
      </div>
      {missing.length > 0 && (
        <p className="ps-field-still-required" role="status">
          {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.cytology.${id}`)), i18n.language) })}
        </p>
      )}
    </div>
  );
};
