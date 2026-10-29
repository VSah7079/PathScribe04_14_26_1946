// src/pages/SynopticReportPage/components/NarrativeProvenanceNote.tsx
// Batch 651: the AI's confidence and source quote under an AI-written narrative section, in the same inline style the synoptic
// suggestions use (ps-syn-ai-source, ps-syn-source-notfound). A quote that could not be found in the report's source text, or
// no answer at all, shows as unverified. Display only; the checks are in orchestrator/narrativeProvenance.ts.
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { NarrativeProvenance } from '@/orchestrator/narrativeProvenance';

export const NarrativeProvenanceNote: React.FC<{ provenance: NarrativeProvenance }> = ({ provenance }) => {
  const { t } = useTranslation();
  const K = 'orchestratorSectionEditor.provenance';
  return (
    <div data-testid="narrative-provenance">
      {provenance.status === 'verified' && (
        <div className="ps-syn-ai-source">
          {t('rightSynopticPanel.fieldRow.aiSourceLabel', { source: provenance.quote })}
        </div>
      )}
      {provenance.status === 'unverified' && (
        <>
          <div className="ps-syn-ai-source ps-syn-ai-source--warn">
            {t('rightSynopticPanel.fieldRow.aiSourceLabel', { source: provenance.quote })}
          </div>
          <div className="ps-syn-source-notfound"><span aria-hidden="true">◐</span> {t(`${K}.unverified`)}</div>
        </>
      )}
      {provenance.status === 'unavailable' && (
        <div className="ps-syn-source-notfound"><span aria-hidden="true">◐</span> {t(`${K}.unavailable`)}</div>
      )}
    </div>
  );
};
