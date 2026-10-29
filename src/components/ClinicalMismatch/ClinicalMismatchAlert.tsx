// src/components/ClinicalMismatch/ClinicalMismatchAlert.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 530 (PS-554, Gate A): "AI suggests possible mismatch", inline on the
// report page while the pathologist reviews it (rule 8: a banner, not a
// window). Collapsed to one line with a badge; "Review" opens the details and
// the decision in place.
//   • Low risk: Resolved, or Defer to secondary review. Sign-out is never held;
//     left undecided, it is logged to the QA dashboard at sign-out.
//   • High risk (a Block rule): Resolved or Unresolved. Deciding here means
//     sign-out won't stop to ask; left undecided, sign-out asks.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ClinicalMismatchAssessment } from '@/services';
import type { ClinicalMismatchDiscipline } from '@/services/clinical/detectClinicalPathologicMismatch';
import { ClinicalMismatchDecisionForm } from './ClinicalMismatchDecisionForm';
import { ClinicalMismatchSummary } from './ClinicalMismatchSummary';
import '@/pathscribe.css';

const K = 'clinicalMismatch.alert';

interface Props {
  assessment: ClinicalMismatchAssessment;
  caseId: string;
  caseType: string;
  subspecialtyId?: string;
  clinicalIndication?: string;
  discipline?: ClinicalMismatchDiscipline;
  /** Batch 531: the cytology specimen (the Cytology Workspace checks specimen by specimen). */
  specimenId?: string;
  onRecorded: () => void;
}

export const ClinicalMismatchAlert: React.FC<Props> = ({ assessment, caseId, caseType, subspecialtyId, clinicalIndication, discipline, specimenId, onRecorded }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const high = assessment.outcome.holdsSignOut;
  return (
    <div className={`ps-clin-mismatch-alert${high ? ' ps-clin-mismatch-alert--high' : ''}`} role="status">
      <div className="ps-clin-mismatch-alert__row">
        <span className="ps-clin-mismatch-alert__badge">{t(`${K}.badge`)}</span>
        <span className="ps-clin-mismatch-alert__text">
          {t(`${K}.title`, { kind: t(`clinicalMismatch.kinds.${assessment.suggestion.kind}`) })}
          {' '}{assessment.releaseNotHeld ? t(`${K}.releaseNotHeld`) : high ? t(`${K}.holdsSignOut`) : t(`${K}.lowRisk`)}
        </span>
        <button type="button" className="ps-conf-btn-secondary" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          {open ? t(`${K}.hide`) : t(`${K}.review`)}
        </button>
      </div>
      {open && (
        <div className="ps-clin-mismatch-alert__body">
          <ClinicalMismatchSummary assessment={assessment} clinicalIndication={clinicalIndication} />
          <ClinicalMismatchDecisionForm
            idPrefix="clin-mismatch-alert"
            caseId={caseId} caseType={caseType} subspecialtyId={subspecialtyId} clinicalIndication={clinicalIndication}
            kind={assessment.suggestion.kind} source={assessment.suggestion.source} confidence={assessment.suggestion.confidence} instructionVersion={assessment.suggestion.instructionVersion}
            risk={high ? 'high' : 'low'} ruleId={assessment.outcome.rule.id} discipline={discipline} specimenId={specimenId}
            inputFingerprint={assessment.fingerprint} evidence={assessment.suggestion.evidence}
            choices={high ? ['RESOLVED', 'UNRESOLVED'] : ['RESOLVED', 'DEFERRED']}
            onRecorded={onRecorded}
          />
        </div>
      )}
    </div>
  );
};
