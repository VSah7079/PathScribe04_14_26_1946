// src/pages/SynopticReportPage/modals/ClinicalMismatchModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-145 (Batch 439): before sign-out, a suggested clinical-pathologic
// mismatch (services/clinical/detectClinicalPathologicMismatch.ts). The
// pathologist decides: not a mismatch, a mismatch resolved (with how), or a
// mismatch left unresolved (with what was found) — only the last recommends
// a CAPA to the QA lead. A suggestion, never a determination: shown with its
// confidence and where it came from. Recorded via clinicalMismatchService
// (case:clinical-mismatch:record).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  clinicalMismatchService, clinicalMismatchProblem, CLINICAL_MISMATCH_DECISIONS,
  type ClinicalMismatchDecision, type ClinicalMismatchSuggestion,
} from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import '@/pathscribe.css';

const K = 'clinicalMismatch';

interface Props {
  caseId: string;
  accession?: string;
  caseType: string;
  subspecialtyId?: string;
  clinicalIndication?: string;
  suggestion: ClinicalMismatchSuggestion;
  onContinue: () => void;
  onCancel: () => void;
}

export const ClinicalMismatchModal: React.FC<Props> = ({ caseId, accession, caseType, subspecialtyId, clinicalIndication, suggestion, onContinue, onCancel }) => {
  const { t } = useTranslation();
  const [decision, setDecision] = useState<ClinicalMismatchDecision | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const problem = clinicalMismatchProblem(decision || undefined, note);
    if (problem) { setError(t(`${K}.errors.${problem}`)); return; }
    const res = await clinicalMismatchService.record({
      caseId, caseType, subspecialtyId, clinicalIndication,
      kind: suggestion.kind, source: suggestion.source, confidence: suggestion.confidence,
      decision: decision as ClinicalMismatchDecision, note,
    });
    if (res.ok === false) { setError(t(`${K}.errors.${res.error}`, { defaultValue: t(`${K}.errors.failed`) })); return; }
    onContinue();
  };

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal ps-ms-modal--wide" role="dialog" aria-modal="true">
        <div className="ps-ms-header">{t(`${K}.title`)}</div>
        <p className="ps-specreq-meta"><span data-phi="accession">{accession ?? caseId}</span></p>
        <div className="ps-clin-mismatch__suggestion">
          <div className="ps-clin-mismatch__kind">{t(`${K}.kinds.${suggestion.kind}`)}</div>
          <div className="ps-specreq-meta">{t(`${K}.source.${suggestion.source}`, { confidence: suggestion.confidence })}</div>
          {suggestion.explanation && <p className="ps-clin-mismatch__explanation">{suggestion.explanation}</p>}
          {clinicalIndication && <p className="ps-specreq-meta">{t(`${K}.indication`, { indication: clinicalIndication })}</p>}
        </div>
        <p className="ps-conf-field-hint">{t(`${K}.intro`)}</p>
        <div className="ps-peer-review__choices" role="radiogroup" aria-label={t(`${K}.question`)}>
          <span className="ps-conf-label">{t(`${K}.question`)}</span>
          {CLINICAL_MISMATCH_DECISIONS.map(d => (
            <label key={d} className="ps-conf-toggle-label-row">
              <input type="radio" name="clin-mismatch" className="ps-conf-radio-input" checked={decision === d} onChange={() => setDecision(d)} />
              <span className="ps-conf-option-text">{t(`${K}.decisions.${d}`)}</span>
            </label>
          ))}
        </div>
        <div className="ps-conf-form-field">
          <label className="ps-conf-label" htmlFor="clin-mismatch-note">
            {t(`${K}.noteLabel`)}{decision && decision !== 'not-a-mismatch' && <> <span className="ps-conf-required">*</span></>}
          </label>
          <textarea id="clin-mismatch-note" className="ps-conf-input ps-peer-review__textarea" value={note} onChange={e => setNote(e.target.value)} placeholder={t(`${K}.notePlaceholder`)} />
        </div>
        {error && <div className="ps-conf-error-text">{error}</div>}
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onCancel}>{t('common.cancel')}</button>
          <CapabilityButton capability="case:clinical-mismatch:record" context={{ caseId }} className="ps-ms-btn-apply" onClick={() => { void submit(); }}>
            {t(`${K}.recordButton`)}
          </CapabilityButton>
        </div>
      </div>
    </div>
  );
};
