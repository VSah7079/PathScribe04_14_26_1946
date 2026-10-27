// src/pages/Synoptic/Codes/AiSuggestionMeta.tsx
// Batch 696 (Intended Use Statement, AI Output Governance): what an AI-suggested code row says about the suggestion.
// Moved out of AddCodeModal.tsx (CLAUDE.md rule 10). It shows the match label or percentage (by regulatory profile, as before),
// where in the case the code was taken from (checked in services/coding/suggestionOrigin.ts), and which check confirmed the code.
// All the deciding is in services; this only renders.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { matchStrength } from '@/services/aiGovernance/matchStrength';
import './AiSuggestionMeta.css';
import { showsConfidence } from '@/services/regulatoryProfile/regulatoryProfile';
import type { AiCodeSuggestion } from '@/services/coding/aiCodeSuggestions';

export const AiSuggestionMeta: React.FC<{ sug: AiCodeSuggestion }> = ({ sug }) => {
  const { t } = useTranslation();
  // A code derived from a template option (no model suggested it) comes from the synoptic answers.
  const section = sug.sourceSection ?? (sug.model ? undefined : 'synoptic');
  const sectionName = section ? t(`addCodeModal.origin.section.${section}`) : '';
  const origin = !section ? t('addCodeModal.origin.notStated')
    : sug.specimenLabel ? t('addCodeModal.origin.fromSpecimen', { section: sectionName, label: sug.specimenLabel })
    : t('addCodeModal.origin.from', { section: sectionName });
  return (
    <>
      {showsConfidence()
        ? <span className={sug.confidence >= 85 ? 'acd-confidence-hi' : 'acd-confidence-lo'}>{sug.confidence}%</span>
        : <span className="acd-confidence-lo" data-testid="code-match-strength">{t(`addCodeModal.match.${matchStrength(sug.confidence)}`)}</span>}
      <span className="acd-sug-origin" data-testid="code-suggestion-origin">{origin}</span>
      {sug.verifiedBy && <span className="acd-sug-verified" data-testid="code-suggestion-verified" title={t(`addCodeModal.verified.${sug.verifiedBy}`)}>✓</span>}
    </>
  );
};
