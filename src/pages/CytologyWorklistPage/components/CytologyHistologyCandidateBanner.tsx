// src/pages/CytologyWorklistPage/components/CytologyHistologyCandidateBanner.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One cyto-histologic correlation candidate banner on the Cytology screening
// page (moved out of CytologyScreeningPage.tsx in Batch 386, PS-359). When
// the histology diagnosis can be resolved from SNOMED coding the reviewer
// confirms it; otherwise they enter the diagnosis and outcome by hand, and
// both are locked as required. "record correlation"
// (CYTOLOGY_RECORD_CORRELATION) acts exactly as the button, for the first
// candidate on screen only (`listenForVoice`), so several banners don't all
// answer one command.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { actionRegistryService, cytologyFieldRequired, histologyCorrelationMissing } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import { formatList } from '@/utils/formatList';
import type { CytologyHistologyCorrelationOutcome } from '@/services/cytology/resolveCytologyHistologyCorrelationOutcome';

export interface HistologyCorrelationResolution {
  cytologyDxLabel: string;
  histologyDxDescription?: string;
  outcome: CytologyHistologyCorrelationOutcome;
  cytologyRank?: number;
  histologyRank?: number;
}

export type ManualCorrelationOutcome = 'concordant' | 'discordant';

interface Props {
  candidateCaseId: string;
  /** undefined until the async resolution completes. */
  resolution: HistologyCorrelationResolution | undefined;
  isRecording: boolean;
  manualDiagnosis: string;
  manualOutcome: ManualCorrelationOutcome | '';
  onManualDiagnosisChange: (text: string) => void;
  onManualOutcomeChange: (outcome: ManualCorrelationOutcome | '') => void;
  requirements: readonly ResolvedFieldRequirement[];
  listenForVoice: boolean;
  /** Confirm the resolved histology diagnosis and outcome. */
  onConfirmResolved: () => void;
  /** Record the diagnosis and outcome entered by hand. */
  onRecordManual: (diagnosis: string, outcome: ManualCorrelationOutcome) => void;
  onDismiss: () => void;
}

export const CytologyHistologyCandidateBanner: React.FC<Props> = ({
  candidateCaseId, resolution, isRecording, manualDiagnosis, manualOutcome, onManualDiagnosisChange, onManualOutcomeChange,
  requirements, listenForVoice, onConfirmResolved, onRecordManual, onDismiss,
}) => {
  const { t, i18n } = useTranslation();
  const autoResolvable = !!resolution && resolution.outcome !== 'unresolvable';
  const missing = histologyCorrelationMissing(manualDiagnosis, manualOutcome, requirements);
  const star = (id: string) => cytologyFieldRequired(requirements, id) && <span className="ps-conf-required"> *</span>;

  const recordManual = () => { if (missing.length === 0 && manualOutcome) onRecordManual(manualDiagnosis.trim(), manualOutcome); };

  // Voice/keyboard "record correlation": the same button, with the same check.
  const act = () => {
    if (!resolution || isRecording) return;
    if (autoResolvable) onConfirmResolved(); else recordManual();
  };
  const actRef = useRef(act);
  actRef.current = act;
  useEffect(() => {
    if (!listenForVoice) return;
    return actionRegistryService.onAction((actionId: string) => {
      if (actionId === 'CYTOLOGY_RECORD_CORRELATION') actRef.current();
    });
  }, [listenForVoice]);

  return (
    <div className="ps-cytoscreen-banner--histo">
      <div className="ps-cytoscreen-banner-title--histo">{t('cytologyScreening.histologyCorrelation.title')}</div>
      <div className="ps-cytoscreen-banner-body--histo">
        <Trans i18nKey="cytologyScreening.histologyCorrelation.body" values={{ caseId: candidateCaseId }} components={{ accession: <span data-phi="accession" /> }} />
      </div>

      {!resolution && <div className="ps-cytoscreen-banner-resolving--histo">{t('cytologyScreening.histologyCorrelation.resolving')}</div>}

      {resolution && autoResolvable && (
        <div>
          <div className="ps-cytoscreen-banner-result--histo">
            <Trans i18nKey="cytologyScreening.histologyCorrelation.resolvedLine"
              values={{ cytology: resolution.cytologyDxLabel, histology: resolution.histologyDxDescription ?? t('cytologyScreening.histologyCorrelation.unknownDx'), outcome: t(`cytologyScreening.histologyCorrelation.outcomes.${resolution.outcome}`) }}
              components={{ b: <b /> }} />
          </div>
          <div className="ps-cytoscreen-banner-actions">
            <button onClick={onConfirmResolved} disabled={isRecording} className="ps-cytoscreen-banner-btn ps-cytoscreen-banner-btn--solid">
              {isRecording ? t('common.saving') : t('cytologyScreening.histologyCorrelation.confirmBtn')}
            </button>
            <button onClick={onDismiss} className="ps-cytoscreen-banner-btn--outline">{t('cytologyScreening.histologyCorrelation.notRelevantBtn')}</button>
          </div>
        </div>
      )}

      {resolution && !autoResolvable && (
        <div>
          <div className="ps-cytoscreen-banner-result--histo">{t('cytologyScreening.histologyCorrelation.manualNote')}</div>
          <div className="ps-cytoscreen-banner-form-row">
            <div className="ps-cytoscreen-banner-field--grow">
              <label className="ps-label" htmlFor={`histo-dx-${candidateCaseId}`}>{t('cytologyScreening.histologyCorrelation.diagnosis')}{star('histologyDiagnosis')}</label>
              <input id={`histo-dx-${candidateCaseId}`} className="ps-input-dark ps-w-full" value={manualDiagnosis}
                onChange={e => onManualDiagnosisChange(e.target.value)} placeholder={t('cytologyScreening.histologyCorrelation.diagnosisPlaceholder')} />
            </div>
            <div>
              <label className="ps-label" htmlFor={`histo-outcome-${candidateCaseId}`}>{t('cytologyScreening.histologyCorrelation.outcome')}{star('histologyOutcome')}</label>
              <select id={`histo-outcome-${candidateCaseId}`} className="ps-input-dark" value={manualOutcome}
                onChange={e => onManualOutcomeChange(e.target.value as ManualCorrelationOutcome | '')}>
                <option value="">{t('cytologyScreening.histologyCorrelation.selectOption')}</option>
                <option value="concordant">{t('cytologyScreening.histologyCorrelation.outcomes.concordant')}</option>
                <option value="discordant">{t('cytologyScreening.histologyCorrelation.outcomes.discordant')}</option>
              </select>
            </div>
            <button onClick={recordManual} disabled={isRecording || missing.length > 0} className="ps-cytoscreen-banner-btn ps-cytoscreen-banner-btn--solid">
              {isRecording ? t('common.saving') : t('cytologyScreening.histologyCorrelation.recordBtn')}
            </button>
            <button onClick={onDismiss} className="ps-cytoscreen-banner-btn--outline">{t('cytologyScreening.histologyCorrelation.notRelevantBtn')}</button>
          </div>
          {missing.length > 0 && (
            <p className="ps-field-still-required" role="status">
              {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.cytology.${id}`)), i18n.language) })}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
