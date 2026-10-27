// src/components/ClinicalMismatch/ClinicalMismatchDecisionForm.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 530 (PS-554): recording a decision on a mismatch suggestion, in one
// click (rule 8): pick a quick reason if it helps, add a note if you like
// (both optional), then press the decision. Used by the inline alert on the
// report (Gate A), the sign-out window for a high-risk mismatch (Gate B) and
// the secondary review queue. Which decisions are offered comes from the
// caller: low risk RESOLVED / DEFERRED, high risk RESOLVED / UNRESOLVED, a
// secondary review RESOLVED / UNRESOLVED. The rules, and the capability
// (case:clinical-mismatch:record), are checked by clinicalMismatchService.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  clinicalMismatchService, CLINICAL_MISMATCH_QUICK_REASONS,
  type ClinicalMismatchResolution, type ClinicalMismatchQuickReason, type ClinicalMismatchRiskLevel,
} from '@/services';
import type { ClinicalMismatchDiscipline, ClinicalMismatchEvidence, ClinicalMismatchKind } from '@/services/clinical/detectClinicalPathologicMismatch';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import '@/pathscribe.css';

const K = 'clinicalMismatch';

export interface ClinicalMismatchDecisionFormProps {
  caseId: string;
  caseType: string;
  subspecialtyId?: string;
  clinicalIndication?: string;
  kind: ClinicalMismatchKind;
  source: 'ai' | 'rule' | 'pathologist';
  confidence?: number;
  risk?: ClinicalMismatchRiskLevel;
  ruleId?: string;
  /** Batch 651: the AI instructions version the suggestion used. */
  instructionVersion?: number;
  discipline?: ClinicalMismatchDiscipline;
  specimenId?: string;
  reviewOf?: string;
  /** Batch 531: the text the decision is made on (a later change is checked again). */
  inputFingerprint?: string;
  /** Batch 685: the quotes the flag showed, kept with the QA record. */
  evidence?: ClinicalMismatchEvidence;
  choices: readonly Exclude<ClinicalMismatchResolution, 'LOGGED'>[];
  onRecorded: (resolution: ClinicalMismatchResolution) => void;
  /** An id prefix, so two forms on one page don't share field ids. */
  idPrefix: string;
}

export const ClinicalMismatchDecisionForm: React.FC<ClinicalMismatchDecisionFormProps> = props => {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ClinicalMismatchQuickReason | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const decide = async (resolution: Exclude<ClinicalMismatchResolution, 'LOGGED'>) => {
    setBusy(true); setError(null);
    const res = await clinicalMismatchService.record({
      caseId: props.caseId, caseType: props.caseType, subspecialtyId: props.subspecialtyId, clinicalIndication: props.clinicalIndication,
      kind: props.kind, source: props.source, confidence: props.confidence, risk: props.risk, ruleId: props.ruleId,
      ...(props.instructionVersion !== undefined ? { instructionVersion: props.instructionVersion } : {}),
      resolution, ...(reason ? { quickReason: reason } : {}), note,
      ...(props.discipline ? { discipline: props.discipline } : {}), ...(props.specimenId ? { specimenId: props.specimenId } : {}),
      ...(props.reviewOf ? { reviewOf: props.reviewOf } : {}),
      ...(props.inputFingerprint ? { inputFingerprint: props.inputFingerprint } : {}),
      ...(props.evidence ? { evidence: props.evidence } : {}),
    }).catch(() => ({ ok: false as const, error: 'failed' }));
    setBusy(false);
    if (res.ok === false) { setError(t(`${K}.errors.${res.error}`, { defaultValue: t(`${K}.errors.failed`) })); return; }
    props.onRecorded(resolution);
  };

  return (
    <div className="ps-clin-mismatch__form">
      <div className="ps-clin-mismatch__reasons" role="radiogroup" aria-label={t(`${K}.reasonLabel`)}>
        <span className="ps-conf-label">{t(`${K}.reasonLabel`)}</span>
        {CLINICAL_MISMATCH_QUICK_REASONS.map(r => (
          <button key={r} type="button" role="radio" aria-checked={reason === r}
            className={`ps-clin-mismatch__reason${reason === r ? ' ps-clin-mismatch__reason--active' : ''}`}
            onClick={() => setReason(prev => (prev === r ? '' : r))}>
            {t(`${K}.reasons.${r}`)}
          </button>
        ))}
      </div>
      <label className="ps-conf-label" htmlFor={`${props.idPrefix}-note`}>{t(`${K}.noteLabel`)}</label>
      <textarea id={`${props.idPrefix}-note`} className="ps-conf-input ps-peer-review__textarea" value={note}
        onChange={e => setNote(e.target.value)} placeholder={t(`${K}.notePlaceholder`)} />
      {error && <div className="ps-conf-error-text" role="alert">{error}</div>}
      <div className="ps-clin-mismatch__choices">
        {props.choices.map(c => (
          <CapabilityButton key={c} capability="case:clinical-mismatch:record" context={{ caseId: props.caseId }}
            className={c === 'UNRESOLVED' ? 'ps-ms-btn-cancel' : 'ps-ms-btn-apply'} disabled={busy}
            onClick={() => { void decide(c); }}>
            {t(`${K}.resolutions.${c}`)}
          </CapabilityButton>
        ))}
      </div>
      <p className="ps-conf-field-hint">{props.choices.map(c => t(`${K}.resolutionHints.${c}`)).join(' ')}</p>
    </div>
  );
};
