// src/components/ClinicalMismatch/ClinicalMismatchSummary.tsx
// Batch 530 (PS-554): what the check suggested, how sure it is, where it came
// from, and which rule decided what happens (so the pathologist can see why a
// case is held). Display only.
// Batch 531: when the text changed after an earlier decision, it says what was decided then.
// Batch 536 (PS-558): a rule-based suggestion says when the AI wasn't asked because the
// jurisdiction's AI vendor policy doesn't allow the service (inline, no window).
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ClinicalMismatchAssessment } from '@/services';
import { regulatoryCapabilities } from '@/services/regulatoryProfile/regulatoryProfile';
import '@/pathscribe.css';

const K = 'clinicalMismatch';

export const ClinicalMismatchSummary: React.FC<{ assessment: ClinicalMismatchAssessment; clinicalIndication?: string }> = ({ assessment, clinicalIndication }) => {
  const { t } = useTranslation();
  const { suggestion, outcome } = assessment;
  const rule = outcome.rule;
  const showConfidence = regulatoryCapabilities().showConfidenceScores;
  return (
    <div className="ps-clin-mismatch__suggestion">
      <div className="ps-clin-mismatch__kind">{t(`${K}.kinds.${suggestion.kind}`)}</div>
      <div className="ps-specreq-meta">{t(`${K}.source.${(suggestion.aiNotAvailable === 'jurisdiction' ? 'ruleJurisdiction' : suggestion.source)}${showConfidence ? '' : 'Plain'}`, { confidence: suggestion.confidence })}</div>
      {suggestion.explanation && <p className="ps-clin-mismatch__explanation">{suggestion.explanation}</p>}
      {(['clinical', 'pathology'] as const).map(side => suggestion.evidence?.[side] && (
        <p key={side} className="ps-specreq-meta ps-clin-mismatch__evidence" data-testid={`mismatch-evidence-${side}`}>
          {t(`${K}.evidence.${side}`, { quote: suggestion.evidence[side]!.text })}
          {!suggestion.evidence[side]!.found && <> <span className="ps-syn-source-notfound">{t(`${K}.evidence.notFound`)}</span></>}
        </p>
      ))}
      {clinicalIndication && <p className="ps-specreq-meta">{t(`${K}.indication`, { indication: clinicalIndication })}</p>}
      {assessment.previous && (
        <p className="ps-specreq-meta" role="note">
          {t(`${K}.previousDecision`, { resolution: t(`${K}.resolutionNames.${assessment.previous.resolution || 'LOGGED'}`) })}
        </p>
      )}
      <p className="ps-specreq-meta">
        {outcome.holdsSignOut
          ? t(`${K}.why.holds`, { threshold: rule.actionThreshold ?? rule.minimumDisplayThreshold })
          : t(`${K}.why.lowRisk`)}
      </p>
    </div>
  );
};
