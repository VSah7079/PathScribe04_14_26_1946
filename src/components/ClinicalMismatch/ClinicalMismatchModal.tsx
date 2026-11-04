// src/components/ClinicalMismatch/ClinicalMismatchModal.tsx
// (Batch 523: moved from pages/SynopticReportPage/modals/, now that the
// Cytology Workspace and autopsy FAD sign-out use it too.)
// ─────────────────────────────────────────────────────────────────────────────
// PS-145 (Batch 439): before sign-out, a suggested clinical-pathologic
// mismatch. A suggestion, never a determination: shown with its confidence
// and where it came from.
//
// Batch 530 (PS-554, Gate B): this window now opens only for a high-risk
// mismatch (a Block rule reached; clinicalMismatchService.atSignOut). It says
// which rule held sign-out, and the pathologist records RESOLVED or
// UNRESOLVED (both let sign-out go on; UNRESOLVED recommends a corrective
// action to QA) through ClinicalMismatchDecisionForm. A low-risk mismatch
// never opens it: it is shown inline on the report and logged.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ClinicalMismatchAssessment } from '@/services';
import type { ClinicalMismatchDiscipline } from '@/services/clinical/detectClinicalPathologicMismatch';
import { ClinicalMismatchDecisionForm } from './ClinicalMismatchDecisionForm';
import { ClinicalMismatchSummary } from './ClinicalMismatchSummary';
import '@/pathscribe.css';

const K = 'clinicalMismatch';

interface Props {
  caseId: string;
  accession?: string;
  caseType: string;
  subspecialtyId?: string;
  clinicalIndication?: string;
  assessment: ClinicalMismatchAssessment;
  discipline?: ClinicalMismatchDiscipline;
  specimenId?: string;
  onContinue: () => void;
  onCancel: () => void;
}

export const ClinicalMismatchModal: React.FC<Props> = ({ caseId, accession, caseType, subspecialtyId, clinicalIndication, assessment, discipline, specimenId, onContinue, onCancel }) => {
  const { t } = useTranslation();
  const { suggestion, outcome } = assessment;
  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal ps-ms-modal--wide" role="dialog" aria-modal="true" aria-label={t(`${K}.title`)}>
        <div className="ps-ms-header">{t(`${K}.title`)}</div>
        <p className="ps-specreq-meta"><span data-phi="accession">{accession ?? caseId}</span></p>
        <ClinicalMismatchSummary assessment={assessment} clinicalIndication={clinicalIndication} />
        <p className="ps-conf-field-hint">{t(`${K}.highRiskIntro`)}</p>
        <ClinicalMismatchDecisionForm
          idPrefix="clin-mismatch-modal"
          caseId={caseId} caseType={caseType} subspecialtyId={subspecialtyId} clinicalIndication={clinicalIndication}
          kind={suggestion.kind} source={suggestion.source} confidence={suggestion.confidence} instructionVersion={suggestion.instructionVersion}
          risk="high" ruleId={outcome.rule.id} discipline={discipline} specimenId={specimenId} inputFingerprint={assessment.fingerprint} evidence={suggestion.evidence}
          choices={['RESOLVED', 'UNRESOLVED']}
          onRecorded={onContinue}
        />
        <div className="ps-ms-footer">
          <button type="button" className="ps-ms-btn-cancel" onClick={onCancel}>{t(`${K}.backToReport`)}</button>
        </div>
      </div>
    </div>
  );
};
