// src/pages/SynopticReportPage/components/AiReportToolButtons.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 451 (PS-274, PS-275): the report page's two AI report tools, moved out
// of SynopticReportPage.tsx's right-panel tool row unchanged so their wiring
// can be tested. Which are offered is decided in
// services/aiIntegration/aiReportTools.ts; whether each is enabled is
// resolveBuildReportAvailability (hooks/resolveBuildReportDirection.ts).
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { aiReportToolsVisibility } from '@/services/aiIntegration/aiReportTools';
import type { BuildReportAvailability } from '../hooks/resolveBuildReportDirection';

interface Props {
  reportingMode: string | undefined;
  availability: BuildReportAvailability;
  isSuggestingSynoptic: boolean;
  isGeneratingNarrative: boolean;
  onSuggestSynopticFromNarrative: () => void;
  onGenerateNarrativeFromSynoptic: () => void;
}

export const AiReportToolButtons: React.FC<Props> = ({
  reportingMode, availability, isSuggestingSynoptic, isGeneratingNarrative, onSuggestSynopticFromNarrative, onGenerateNarrativeFromSynoptic,
}) => {
  const { t } = useTranslation();
  const show = aiReportToolsVisibility(reportingMode);
  return (
    <>
      {show.suggestSynoptic && (
        <button
          className="ps-btn-ghost-dark ps-syn-toolbtn-sm"
          disabled={!availability.canSuggestSynopticFromNarrative || isSuggestingSynoptic}
          title={availability.canSuggestSynopticFromNarrative ? t('synopticReportPage.aiTools.suggestTitle') : t('synopticReportPage.aiTools.suggestNeedsNarrative')}
          onClick={onSuggestSynopticFromNarrative}
        >
          {isSuggestingSynoptic ? t('synopticReportPage.aiTools.suggesting') : `✨ ${t('synopticReportPage.aiTools.suggest')}`}
        </button>
      )}
      {show.generateNarrative && (
        <button
          className="ps-btn-ghost-dark ps-syn-toolbtn-sm"
          disabled={!availability.canGenerateNarrativeFromSynoptic || isGeneratingNarrative}
          title={availability.canGenerateNarrativeFromSynoptic ? t('synopticReportPage.aiTools.generateTitle') : t('synopticReportPage.aiTools.generateNeedsAnswers')}
          onClick={onGenerateNarrativeFromSynoptic}
        >
          {isGeneratingNarrative ? t('synopticReportPage.aiTools.generating') : `✨ ${t('synopticReportPage.aiTools.generate')}`}
        </button>
      )}
    </>
  );
};
